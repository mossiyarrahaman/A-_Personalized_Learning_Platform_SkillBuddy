/**
 * services/quizRecorderService.js
 *
 * Records quiz results into the Progress model with full detail.
 * Used by courseController.submitTopicQuiz and the RAG practice flow.
 *
 * This is the bridge between "student answered a quiz" and "teacher sees
 * exactly where students are struggling" in analytics.
 *
 * The key insight: we don't just record the score. We record WHICH questions
 * the student got wrong, WHAT they answered, at WHICH Bloom's level, and
 * at WHICH difficulty. This is what makes the analytics actionable.
 */

const Progress = require('../models/Progress');
const StudentProfile = require('../models/StudentProfile');

/**
 * Record a quiz attempt with full answer-level detail.
 *
 * @param {Object} params
 * @param {string} params.studentId      - User ID
 * @param {string} params.courseId        - Course ID
 * @param {string} params.topicId        - Topic ID within the course
 * @param {string} params.topicTitle     - Human-readable topic name
 * @param {string} params.moduleId       - Module ID
 * @param {string} params.moduleTitle    - Module name
 * @param {number} params.score          - Percentage (0-100)
 * @param {number} params.totalQuestions - Total questions in quiz
 * @param {number} params.correctAnswers - Number answered correctly
 * @param {string} params.bloomLevel     - Bloom's taxonomy level
 * @param {Array}  params.questionResults - Per-question detail:
 *   [{ questionText, isCorrect, studentAnswer, correctAnswer, bloomLevel, difficulty, topic }]
 *
 * @returns {{ passed, topicCompleted, pointsAwarded }}
 */
async function recordQuizResult({
    studentId,
    courseId,
    topicId,
    topicTitle = 'Unknown',
    moduleId = '',
    moduleTitle = '',
    score,
    totalQuestions,
    correctAnswers,
    bloomLevel = 'understand',
    questionResults = [],
}) {
    // ── 1. Find or create Progress record ────────────────────────────────────
    let progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
        progress = new Progress({ student: studentId, course: courseId });
    }

    const passed = score >= 70;

    // ── 2. Build wrong questions array ───────────────────────────────────────
    const wrongQuestions = questionResults
        .filter(q => !q.isCorrect)
        .map(q => ({
            questionText: q.questionText || '',
            studentAnswer: q.studentAnswer || '',
            correctAnswer: q.correctAnswer || '',
            bloomLevel: q.bloomLevel || bloomLevel,
            difficulty: q.difficulty || 'medium',
            topic: q.topic || topicTitle,
        }));

    // ── 3. Record quiz score with detail ─────────────────────────────────────
    progress.topicQuizScores.push({
        topicId,
        topicTitle,
        moduleId,
        moduleTitle,
        score,
        totalQuestions,
        correctAnswers,
        passed,
        bloomLevel,
        wrongQuestions,
        attempts: 1,
        attemptDate: new Date(),
    });

    // ── 4. Update running average quiz score ─────────────────────────────────
    const allScores = progress.topicQuizScores.map(q => q.score);
    progress.avgQuizScore = Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length);

    // ── 5. Record daily activity ─────────────────────────────────────────────
    progress.recordActivity({ quizTaken: true });

    // ── 6. Check topic completion ────────────────────────────────────────────
    // Topic = completed if: quiz passed AND all resources completed
    let topicCompleted = false;
    if (passed) {
        const topicResources = progress.resourceProgress.filter(rp => rp.topicId === topicId);
        const allResourcesDone = topicResources.length > 0
            ? topicResources.every(r => r.completed)
            : true; // No resources = auto-complete

        if (allResourcesDone && !progress.completedTopics.includes(topicId)) {
            progress.completedTopics.push(topicId);
            topicCompleted = true;
            progress.recordActivity({ topicCompleted: true });
        }
    }

    // ── 7. Compute risk flag ─────────────────────────────────────────────────
    // We need totalTopics, but we don't have the course loaded here.
    // Set a basic flag; the analytics service will refine it.
    const recentQuizzes = progress.topicQuizScores.slice(-10);
    const recentFailCount = recentQuizzes.filter(q => !q.passed).length;
    if (recentFailCount >= 5 || progress.avgQuizScore < 40) {
        progress.riskFlag = 'critical';
    } else if (recentFailCount >= 3 || progress.avgQuizScore < 55) {
        progress.riskFlag = 'at_risk';
    } else {
        progress.riskFlag = 'on_track';
    }

    await progress.save();

    // ── 8. Update gamification (StudentProfile) ──────────────────────────────
    let pointsAwarded = 0;
    try {
        let profile = await StudentProfile.findOne({ userId: studentId });
        if (!profile) {
            profile = new StudentProfile({
                userId: studentId,
                points: 0,
                stats: { hoursStudied: 0, coursesCompleted: 0, quizzesTaken: 0, avgScore: 0 },
            });
        }

        profile.stats.quizzesTaken = (profile.stats.quizzesTaken || 0) + 1;
        const totalQuizzes = profile.stats.quizzesTaken;
        profile.stats.avgScore = Math.round(
            (((profile.stats.avgScore || 0) * (totalQuizzes - 1)) + score) / totalQuizzes
        );

        if (passed) {
            pointsAwarded = 50;
            profile.points = (profile.points || 0) + pointsAwarded;

            // Badges
            if (totalQuizzes === 1) {
                profile.badges.push({ id: 'first_quiz', name: 'First Quiz Ace', icon: '🎯' });
            }
            if (score === 100) {
                profile.badges.push({ id: `perfect_${Date.now()}`, name: 'Perfectionist', icon: '🌟' });
            }
            if (totalQuizzes >= 10) {
                const has10Badge = profile.badges.some(b => b.id === 'quiz_master');
                if (!has10Badge) {
                    profile.badges.push({ id: 'quiz_master', name: 'Quiz Master', icon: '🏆' });
                }
            }
        }

        profile.lastActiveDate = new Date();
        await profile.save();

    } catch (gamErr) {
        console.error('Gamification update failed (non-critical):', gamErr.message);
    }

    return { passed, topicCompleted, pointsAwarded, avgQuizScore: progress.avgQuizScore };
}

module.exports = { recordQuizResult };