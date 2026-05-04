const Course = require('../models/Course');
const StudentProfile = require('../models/StudentProfile');
const Progress = require('../models/Progress');
const User = require('../models/User'); // Added User model
const aiService = require('../services/ai-service');
const { retrieveRelevantChunks } = require('../services/retrievalService');

// Increment streak if a new calendar day has started since last activity
async function refreshStreak(userId) {
    const prof = await StudentProfile.findOne({ userId }, 'streak lastActiveDate');
    if (!prof) return;
    const now = new Date();
    const last = prof.lastActiveDate ? new Date(prof.lastActiveDate) : null;
    if (last && last.toDateString() === now.toDateString()) return; // already counted today
    const diffDays = last ? Math.round((now - last) / 86400000) : 99;
    const newStreak = diffDays === 1 ? (prof.streak || 0) + 1 : 1;
    await StudentProfile.updateOne({ userId }, { $set: { streak: newStreak, lastActiveDate: now } });
}

function resolvePathContainer(profile, pathId) {
    if (pathId) {
        const pathDoc = profile.paths.id(pathId);
        return pathDoc || null;
    }
    return profile.currentPath;
}

// ============================================================================
// REPLACE ONLY the generatePath function in courseController.js
// Find the existing exports.generatePath and replace it with this:
// ============================================================================

exports.generatePath = async (req, res) => {
    try {
        const { field, level, goals, quizResults } = req.body;
        const userId = req.user.id;

        console.log(`Generating path for user ${userId} in ${field} (${level})`);

        let pathData;
        try {
            pathData = await aiService.generateLearningPath(field, level, goals, quizResults);
        } catch (e) {
            console.error("AI Generation failed", e);
            return res.status(500).json({ error: "Failed to generate learning path via AI" });
        }

        const profile = await StudentProfile.findOne({ userId });
        if (profile) {
            profile.onboarding = { field, level, goals, completed: true };

            profile.currentPath = {
                generatedAt: new Date(),
                modules: pathData.modules.map((m, mIdx) => ({
                    id: `module_${Date.now()}_${mIdx}`,
                    title: m.title,
                    description: m.description,
                    duration: m.duration,
                    difficultyLevel: m.difficultyLevel || 'beginner',
                    goalStatement: m.goalStatement || '',
                    practiceProjects: Array.isArray(m.practiceProjects) ? m.practiceProjects : [],
                    status: 'locked',
                    topics: (m.topics || []).map((t, tIdx) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        title: t.title,
                        description: t.description,
                        status: 'pending',
                        // ── Map subtopics from AI response ──
                        subtopics: (t.subtopics || []).map((s, sIdx) => ({
                            id: Math.random().toString(36).substr(2, 9),
                            title: s.title,
                            description: s.description,
                            status: 'pending'
                        })),
                        resources: []
                    }))
                }))
            };

            // Unlock first module
            if (profile.currentPath.modules.length > 0) {
                profile.currentPath.modules[0].status = 'unlocked';
                // Also set first topic to unlocked so student knows where to start

            }

            await profile.save();
        }

        res.json({ message: 'Learning path generated', path: profile.currentPath });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error generating path' });
    }
};

// Manually toggle topic completion for AI Path
exports.toggleTopicComplete = async (req, res) => {
    try {
        const { moduleId, topicId, status } = req.body; // status: 'completed' or 'pending'
        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const moduleDoc = profile.currentPath.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // Update status
        topicDoc.status = status;

        // Check module completion and unlock next module
        if (moduleDoc.topics.every(t => t.status === 'completed')) {
            moduleDoc.status = 'completed';
            const mIdx = profile.currentPath.modules.findIndex(m => m.id === moduleId || m._id.toString() === moduleId);
            if (mIdx >= 0 && mIdx < profile.currentPath.modules.length - 1) {
                profile.currentPath.modules[mIdx + 1].status = 'unlocked';
            }
        }

        // Stats: 30 min credit per topic completed; detect full-path completion
        if (status === 'completed') {
            if (!profile.stats) profile.stats = {};
            profile.stats.hoursStudied = Math.round(((profile.stats.hoursStudied || 0) + 0.5) * 10) / 10;
            const allDone = profile.currentPath.modules.every(m => m.status === 'completed');
            if (allDone && !profile.currentPath.completedAt) {
                profile.currentPath.completedAt = new Date();
                profile.stats.coursesCompleted = (profile.stats.coursesCompleted || 0) + 1;
            }
            profile.markModified('stats');
        }

        profile.markModified('currentPath');
        await profile.save();
        await refreshStreak(userId);
        res.json({ success: true, topic: topicDoc });

    } catch (error) {
        console.error("Error toggling topic:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.toggleStepComplete = async (req, res) => {
    try {
        const { moduleId, topicId, stepNumber, completed, pathId } = req.body;
        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const container = resolvePathContainer(profile, pathId);
        if (!container) return res.status(404).json({ error: 'Path not found' });

        const moduleDoc = container.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        if (!topicDoc || !topicDoc.plan) return res.status(404).json({ error: 'Topic or plan not found' });

        const step = topicDoc.plan.steps.find(s => s.stepNumber === stepNumber);
        if (!step) return res.status(404).json({ error: 'Step not found' });

        step.completed = completed;
        profile.markModified(pathId ? 'paths' : 'currentPath');
        await profile.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error toggling step:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOnboardingAssessment = async (req, res) => {
    try {
        const { field, level } = req.body;
        console.log(`Generating diagnostic quiz for ${field} (${level})`);

        let questions = [];
        try {
            questions = await aiService.generateAssessmentQuestions(field || 'General', level || 'Beginner', 5);
        } catch (aiError) {
            console.error("AI Service Error in Controller:", aiError);
            // Fallback if AI service throws uncaught error
        }

        // Double check we have questions, if not, use hardcoded fallback
        if (!questions || questions.length === 0) {
            console.log("Using hardcoded fallback questions");
            questions = Array.from({ length: 5 }, (_, i) => ({
                question: `Diagnostic Question ${i + 1} about ${field || 'General Knowledge'}`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                explanation: 'This is a fallback question because AI generation failed.',
                hint: 'Choose the first option.',
                bloomLevel: 'remember',
                topic: field || 'Basics'
            }));
        }

        res.json({ questions });
    } catch (error) {
        console.error("Critical Error in getOnboardingAssessment:", error);
        res.status(500).json({ error: 'Failed to generate assessment' });
    }
};

exports.getStudentDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const mods = profile.currentPath?.modules;
        if (mods?.length > 0) {
            let changed = false;

            // Heal 1: unlock modules whose predecessor is completed but still locked
            for (let i = 0; i < mods.length - 1; i++) {
                if (mods[i].status === 'completed' && mods[i + 1].status === 'locked') {
                    mods[i + 1].status = 'unlocked';
                    changed = true;
                }
            }

            // Heal 2: mark modules as completed when all their topics are done
            for (const mod of mods) {
                if (mod.status !== 'completed' && mod.topics?.length > 0 &&
                    mod.topics.every(t => t.status === 'completed')) {
                    mod.status = 'completed';
                    changed = true;
                }
            }

            // Heal 3: detect full path completion and update counter (idempotent via completedAt guard)
            if (!profile.currentPath.completedAt && mods.every(m => m.status === 'completed')) {
                profile.currentPath.completedAt = new Date();
                if (!profile.stats) profile.stats = {};
                profile.stats.coursesCompleted = (profile.stats.coursesCompleted || 0) + 1;
                profile.markModified('stats');
                changed = true;
            }

            if (changed) {
                profile.markModified('currentPath');
                await profile.save();
            }
        }

        // Also count completed teacher courses from Progress records
        const teacherCoursesCompleted = await Progress.countDocuments({ student: userId, status: 'completed' });
        const aiPathsCompleted = profile.currentPath?.completedAt ? 1 : 0;
        const extraPathsCompleted = Array.isArray(profile.paths)
            ? profile.paths.filter(p => p.completedAt).length : 0;
        const trueTotal = aiPathsCompleted + extraPathsCompleted + teacherCoursesCompleted;

        // Sync stored counter if it drifted
        if (profile.stats.coursesCompleted !== trueTotal) {
            profile.stats.coursesCompleted = trueTotal;
            profile.markModified('stats');
            await profile.save();
        }

        res.json({ profile });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get details for a specific module/topic, generating resources if needed
exports.getTopicDetails = async (req, res) => {
    try {
        const { moduleId, topicId } = req.params;
        const { courseId } = req.query; // Check for courseId in query
        const userId = req.user.id;

        let topicDoc = null;
        let contextType = 'ai_path'; // or 'teacher_course'

        if (courseId) {
            // Case 1: Fetching from a Teacher Course
            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ error: 'Course not found' });

            // Verify enrollment (optional but recommended)
            // if (!course.enrolledStudents.includes(userId) && course.author.toString() !== userId) {
            //     return res.status(403).json({ error: 'Not authorized' });
            // }

            const moduleDoc = course.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (!moduleDoc) return res.status(404).json({ error: 'Module not found in course' });

            topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
            contextType = 'teacher_course';

        } else {
            // Case 2: Fetching from AI Learning Path (StudentProfile)
            const profile = await StudentProfile.findOne({ userId });
            if (!profile) return res.status(404).json({ error: 'Profile not found' });

            const pathId = req.query.pathId;
            const container = resolvePathContainer(profile, pathId);
            if (!container) return res.status(404).json({ error: 'Path not found' });

            const moduleDoc = container.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

            topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        }

        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // If AI Path and plan not yet generated, build the step-by-step plan now
        if (contextType === 'ai_path' && (!topicDoc.plan || !topicDoc.plan.steps || topicDoc.plan.steps.length === 0)) {
            const profile = await StudentProfile.findOne({ userId });
            const pathId2 = req.query.pathId;
            const container2 = resolvePathContainer(profile, pathId2);
            if (container2) {
                const moduleDoc2 = container2.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
                const topicToUpdate = moduleDoc2?.topics.find(t => t.id === topicId || t._id.toString() === topicId);

                if (topicToUpdate) {
                    const field = container2.onboarding?.field || profile.onboarding.field;
                    const level = container2.onboarding?.level || profile.onboarding.level;
                    console.log(`Generating step plan for topic: ${topicToUpdate.title}`);
                    const planData = await aiService.generateTopicStepPlan(
                        field,
                        level,
                        topicToUpdate.title,
                        moduleDoc2.title,
                        topicToUpdate.subtopics || []
                    );

                    topicToUpdate.plan = {
                        objectives: planData.objectives,
                        estimatedTime: planData.estimatedTime,
                        generatedAt: new Date(),
                        steps: planData.steps
                    };

                    profile.markModified(pathId2 ? 'paths' : 'currentPath');
                    await profile.save();
                    topicDoc = topicToUpdate;
                }
            }
        }

        res.json({ topic: topicDoc });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching topic details' });
    }
};

exports.updateResourceProgress = async (req, res) => {
    try {
        const { moduleId, topicId, resourceId, progress, timeSpent, lastPosition, pathId } = req.body;
        const userId = req.user.id;
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            return res.status(400).json({ error: 'progress must be a number between 0 and 100' });
        }

        // 1. Update StudentProfile (Legacy/Fallback for path generation)
        let profile = await StudentProfile.findOne({ userId });
        if (!profile) {
            console.log("Profile not found, creating new one for user:", userId);
            profile = new StudentProfile({ userId, points: 0, stats: { hoursStudied: 0, coursesCompleted: 0, quizzesTaken: 0, avgScore: 0 } });
            await profile.save();
        }

        if (profile) {
            const container = resolvePathContainer(profile, pathId);
            const moduleDoc = container?.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (moduleDoc) {
                const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
                if (topicDoc) {
                    const resource = topicDoc.resources.find(r => r._id.toString() === resourceId || r.id === resourceId);
                    const wasCompleted = resource.completed;
                    if (progress === 100) {
                        resource.completed = true;
                    }

                    // --- GAMIFICATION & STATS ---
                    // 1. Update Study Time (hours)
                    if (timeSpent && timeSpent > 0) {
                        if (!profile.stats.hoursStudied) profile.stats.hoursStudied = 0;
                        profile.stats.hoursStudied += (timeSpent / 3600);
                    }

                    // 2. Award Points for Resource Completion (if new completion)
                    if (!wasCompleted && resource.completed) {
                        if (!profile.points) profile.points = 0;
                        profile.points += 10; // 10 XP per resource
                        profile.lastActiveDate = Date.now();
                    }

                    // Check topic completion
                    if (topicDoc.resources.every(r => r.completed)) {
                        topicDoc.status = 'completed';
                        // Optional: Bonus for topic completion?
                    }
                }
            }
            profile.markModified(pathId ? 'paths' : 'currentPath');
            await profile.save();
        }

        // 2. Update Progress Record (For Teacher Analytics & Detailed Tracking)
        // Find existing progress or create/find based on context. 
        // Note: Ideally we pass courseId. If not, we might need to infer it or just update if it exists.
        // For Custom Courses (Teacher Created), we definitely need Progress record.
        // For AI Paths, we currently store in StudentProfile but should sync to Progress too if we want analytics.

        // Assuming this is called for both. If we have courseId in body, use it.
        const { courseId } = req.body;
        if (courseId) {
            let progressRecord = await Progress.findOne({ student: userId, course: courseId });
            if (progressRecord) {
                const resIndex = progressRecord.resourceProgress.findIndex(rp => rp.resourceId === resourceId);
                if (resIndex > -1) {
                    progressRecord.resourceProgress[resIndex].timeSpent += (timeSpent || 0); // Accumulate time
                    progressRecord.resourceProgress[resIndex].lastPosition = lastPosition || 0;
                    if (progress === 100) progressRecord.resourceProgress[resIndex].completed = true;
                } else {
                    progressRecord.resourceProgress.push({
                        resourceId,
                        type: 'unknown', // Ideally pass type from frontend
                        timeSpent: timeSpent || 0,
                        completed: progress === 100,
                        lastPosition: lastPosition || 0
                    });
                }
                const prevTotal = progressRecord.totalTimeSpent || 0;
                progressRecord.recordActivity({
                    timeSpent: timeSpent || 0,
                    resourceCompleted: progress === 100,
                });
                // +1 pt per complete 5-minute (300s) block newly crossed
                const studyPts = Math.floor((progressRecord.totalTimeSpent || 0) / 300) - Math.floor(prevTotal / 300);
                await progressRecord.save();
                if (studyPts > 0) {
                    await StudentProfile.findOneAndUpdate(
                        { userId },
                        { $inc: { points: studyPts } },
                        { upsert: false }
                    );
                }
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error updating resource progress:", error);
        res.status(500).json({ error: 'Error updating progress' });
    }
};

exports.createCourse = async (req, res) => {
    console.log("createCourse hit!");
    console.log("Body:", req.body);
    console.log("User:", req.user);
    try {
        const { title, description, level, field } = req.body;

        if (!req.user || !req.user.id) {
            console.log("No user ID found in request");
            return res.status(401).json({ error: "User not authenticated properly" });
        }

        const teacherId = req.user.id;

        // Basic validation
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const newCourse = new Course({
            title,
            description,
            level,
            field,
            author: teacherId,
            isPublished: true,
            modules: []
        });

        const savedCourse = await newCourse.save();
        console.log("Course saved:", savedCourse._id);
        res.status(201).json({ message: 'Course created successfully', course: savedCourse });
    } catch (error) {
        console.error("Error creating course FULL ERROR:", error);
        res.status(500).json({ error: 'Server error creating course: ' + error.message });
    }
};

exports.getTeacherCourses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const courses = await Course.find({ author: teacherId }).sort({ createdAt: -1 }).populate('enrolledStudents', 'name email');
        res.json({ courses });
    } catch (error) {
        console.error("Error fetching teacher courses:", error);
        res.status(500).json({ error: 'Server error fetching courses' });
    }
};


exports.updateCourseModules = async (req, res) => {
    try {
        const { courseId } = req.params;
        console.log("updateCourseModules body:", req.body);
        const { modules, syllabus, title, description } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this course' });
        }

        course.modules = modules;
        if (syllabus) course.syllabus = syllabus;
        if (title) course.title = title;
        if (description) course.description = description;

        await course.save();

        res.json({ message: 'Curriculum updated successfully', modules: course.modules });
    } catch (error) {
        console.error("Error updating curriculum:", error);
        res.status(500).json({ error: 'Server error: ' + error.message, details: error.errors });
    }
};

exports.updateTopicStatus = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const { isChecked, teacherStatus } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const module = course.modules.id(moduleId);
        if (!module) return res.status(404).json({ error: 'Module not found' });

        const topic = module.topics.id(topicId);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        if (isChecked !== undefined) topic.isChecked = isChecked;
        if (teacherStatus) topic.teacherStatus = teacherStatus;

        await course.save();
        res.json({ message: 'Topic status updated', topic });

    } catch (error) {
        console.error("Error updating topic status:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCourseAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).populate('enrolledStudents', 'name email');

        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Fetch all progress records for this course
        const progressRecords = await Progress.find({ course: courseId }).populate('student', 'name email');

        // Calculate Stats
        const totalStudents = course.enrolledStudents.length;

        // Count active students (accessed in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudents = progressRecords.filter(p => p.lastAccessed > sevenDaysAgo).length;

        // Calculate Average Progress & Time Spent
        // Total topics in course
        let totalTopics = 0;
        course.modules.forEach(m => totalTopics += m.topics.length);

        let totalCompletionPercentage = 0;
        let totalTimeSpentInSeconds = 0;

        // Time Distribution Buckets
        const timeDistribution = {
            "0-1h": 0,
            "1-5h": 0,
            "5-10h": 0,
            "10h+": 0
        };

        const studentsProgressData = progressRecords.map(p => {
            const completedCount = p.completedTopics.length;
            const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
            totalCompletionPercentage += percentage;

            // Calculate total time spent for this student
            const studentTimeCheck = p.resourceProgress?.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) || 0;
            totalTimeSpentInSeconds += studentTimeCheck;

            // Add to Distribution
            if (studentTimeCheck < 3600) timeDistribution["0-1h"]++;
            else if (studentTimeCheck < 18000) timeDistribution["1-5h"]++;
            else if (studentTimeCheck < 36000) timeDistribution["5-10h"]++;
            else timeDistribution["10h+"]++;

            return {
                studentId: p.student._id,
                name: p.student.name,
                email: p.student.email,
                completedTopics: completedCount,
                totalTopics,
                percentage,
                totalTimeSpent: studentTimeCheck, // in seconds
                lastAccessed: p.lastAccessed
            };
        });

        const avgProgress = totalStudents > 0 ? Math.round(totalCompletionPercentage / totalStudents) : 0;

        // Calculate Average Time
        const avgSeconds = totalStudents > 0 ? Math.round(totalTimeSpentInSeconds / totalStudents) : 0;
        const avgHours = Math.floor(avgSeconds / 3600);
        const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
        const avgTimeSpent = `${avgHours}h ${avgMinutes}m`;

        // Topic Quiz Analytics Logic
        const topicStats = {}; // { topicId: { title, totalScore, attempts, fails } }

        progressRecords.forEach(p => {
            if (p.topicQuizScores && p.topicQuizScores.length > 0) {
                p.topicQuizScores.forEach(quiz => {
                    if (!topicStats[quiz.topicId]) {
                        topicStats[quiz.topicId] = {
                            title: quiz.topicTitle || "Unknown Topic",
                            totalScore: 0,
                            attempts: 0,
                            fails: 0
                        };
                    }
                    // Consider only the higest score or average? Let's take the latest stored.
                    // Actually p.topicQuizScores stores history. 
                    // Let's use the average of all attempts or best? 
                    // Usually analytics wants "how are students performing". 
                    // Let's use the score of this record entry.
                    topicStats[quiz.topicId].totalScore += quiz.score;
                    topicStats[quiz.topicId].attempts += 1;
                    if (!quiz.passed) topicStats[quiz.topicId].fails += 1;
                    if (quiz.topicTitle && topicStats[quiz.topicId].title === "Unknown Topic") {
                        topicStats[quiz.topicId].title = quiz.topicTitle;
                    }
                });
            }
        });

        const topicPerformance = Object.values(topicStats).map(t => ({
            topic: t.title,
            avgScore: Math.round(t.totalScore / t.attempts),
            failRate: Math.round((t.fails / t.attempts) * 100),
            attempts: t.attempts
        })).sort((a, b) => a.avgScore - b.avgScore); // Ascending score (hardest first)

        const hardestTopics = topicPerformance.slice(0, 5);

        res.json({
            stats: {
                totalStudents,
                activeStudents,
                avgProgress,
                avgTimeSpent
            },
            engagement: {
                dates: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                active: [activeStudents, activeStudents, activeStudents, activeStudents, activeStudents, activeStudents, activeStudents] // Mock for now
                // Real implementation requires history logs which we don't have yet
            },
            timeDistribution,
            topicPerformance,
            hardestTopics,
            students: studentsProgressData
        });
    } catch (error) {
        console.error("Error fetching course analytics:", error);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};


// --- NEW: Enrollment & Progress Logic for Teacher Classes ---

// Enroll a student or multiple students in a class
exports.enrollStudent = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { identifier, identifiers } = req.body; // Support both single and bulk
        const teacherId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized to add students to this course' });
        }

        // Normalize input to array
        const targets = identifiers || [identifier];
        const results = { added: [], failed: [], alreadyEnrolled: [] };

        for (const target of targets) {
            if (!target) continue;

            // Find student
            let student = await User.findOne({ email: target });
            if (!student) {
                student = await User.findOne({ name: target, role: 'student' });
            }

            if (!student) {
                results.failed.push(target);
                continue;
            }

            const studentIdStr = student._id.toString();
            const enrolledStrs = course.enrolledStudents.map(id => id.toString());

            if (enrolledStrs.includes(studentIdStr)) {
                results.alreadyEnrolled.push(student.name);
                continue;
            }

            // Add to Course
            course.enrolledStudents.push(student._id);

            // Create Progress Record
            const progress = new Progress({
                student: student._id,
                course: course._id,
                completedTopics: [],
                completedResources: []
            });
            await progress.save();

            results.added.push(student.name);
        }

        if (results.added.length > 0) {
            await course.save();
        }

        res.json({
            message: `Processed ${targets.length} requests. Added: ${results.added.length}.`,
            results
        });

    } catch (error) {
        console.error("Enrollment error:", error);
        res.status(500).json({ error: 'Server error enrolling student' });
    }
};

// Unenroll a student from a course (teacher only)
exports.unenrollStudent = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const teacherId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const before = course.enrolledStudents.length;
        course.enrolledStudents = course.enrolledStudents.filter(id => id.toString() !== studentId);

        if (course.enrolledStudents.length === before) {
            return res.status(404).json({ error: 'Student not enrolled in this course' });
        }

        await course.save();
        await Progress.deleteOne({ student: studentId, course: courseId });

        res.json({ success: true, message: 'Student removed from course' });
    } catch (error) {
        console.error('Unenroll error:', error);
        res.status(500).json({ error: 'Server error removing student' });
    }
};

// Get Enrolled Classes for Student
exports.getEnrolledClasses = async (req, res) => {
    try {
        const userId = req.user.id;
        // Find all progress records for this student
        // Populate course details
        const progressRecords = await Progress.find({ student: userId }).populate('course');

        // Filter out any where course might be null (deleted courses)
        const validRecords = progressRecords.filter(p => p.course !== null);

        const classes = validRecords.map(p => ({
            ...p.course.toObject(),
            studentProgress: {
                completedTopics: p.completedTopics,
                completedResources: p.completedResources,
                lastAccessed: p.lastAccessed
            }
        }));

        res.json({ classes });
    } catch (error) {
        console.error("Get classes error:", error);
        res.status(500).json({ error: 'Server error fetching classes' });
    }
};

// Browse published courses the student hasn't joined yet
exports.getAvailableCourses = async (req, res) => {
    try {
        const userId = req.user.id;
        const enrolledRecords = await Progress.find({ student: userId }, 'course');
        const enrolledIds = enrolledRecords.map(p => p.course.toString());

        const courses = await Course.find({ isPublished: true })
            .populate('author', 'name')
            .select('title description field level author enrolledStudents modules tags');

        const available = courses
            .filter(c => !enrolledIds.includes(c._id.toString()))
            .map(c => ({
                _id: c._id,
                title: c.title,
                description: c.description,
                field: c.field,
                level: c.level,
                tags: c.tags,
                teacherName: c.author?.name || 'Instructor',
                enrolledCount: c.enrolledStudents?.length || 0,
                topicCount: c.modules.reduce((a, m) => a + (m.topics || []).length, 0),
            }));

        res.json({ courses: available });
    } catch (error) {
        console.error('getAvailableCourses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Student self-enroll in a published course
exports.selfEnrollStudent = async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can enroll' });
        const { courseId } = req.params;
        const userId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course || !course.isPublished) return res.status(404).json({ error: 'Course not found' });

        const already = await Progress.findOne({ student: userId, course: courseId });
        if (already) return res.status(400).json({ error: 'Already enrolled' });

        await Progress.create({ student: userId, course: courseId });

        if (!course.enrolledStudents.includes(userId)) {
            course.enrolledStudents.push(userId);
            await course.save();
        }

        res.json({ message: 'Enrolled successfully' });
    } catch (error) {
        console.error('selfEnrollStudent error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update Class Progress (Topic Completion)
exports.updateClassProgress = async (req, res) => {
    try {
        const { courseId, topicId, completed } = req.body;
        const userId = req.user.id;

        let progress;
        let courseCompleted = false;

        if (topicId && completed) {
            // Atomic $addToSet prevents duplicate entries from race conditions
            progress = await Progress.findOneAndUpdate(
                { student: userId, course: courseId },
                { $addToSet: { completedTopics: topicId }, $set: { lastAccessed: Date.now() } },
                { new: true }
            );
            if (!progress) return res.status(404).json({ error: 'Progress record not found' });

            const courseForCheck = await Course.findById(courseId).lean();
            const totalTopics = courseForCheck?.modules?.reduce((sum, m) => sum + (m.topics || []).length, 0) || 0;
            if (totalTopics > 0 && progress.completedTopics.length >= totalTopics && progress.status !== 'completed') {
                progress.status = 'completed';
                courseCompleted = true;
                await progress.save();
            }
        } else if (topicId && !completed) {
            progress = await Progress.findOneAndUpdate(
                { student: userId, course: courseId },
                { $pull: { completedTopics: topicId }, $set: { lastAccessed: Date.now() } },
                { new: true }
            );
            if (!progress) return res.status(404).json({ error: 'Progress record not found' });
        } else {
            progress = await Progress.findOne({ student: userId, course: courseId });
            if (!progress) return res.status(404).json({ error: 'Progress record not found' });
        }

        progress.recordActivity({ topicCompleted: completed === true });
        await progress.save();

        if (courseCompleted) {
            await StudentProfile.findOneAndUpdate(
                { userId },
                { $inc: { points: 200, 'stats.coursesCompleted': 1 } },
                { upsert: false }
            );
        }

        res.json({ success: true, progress, courseCompleted });
    } catch (error) {
        console.error("Update class progress error:", error);
        res.status(500).json({ error: 'Server error updating progress' });
    }
};


exports.getTopicAnalytics = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const teacherId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course || course.author.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Find module and topic to get resource list
        const moduleDoc = course.modules.id(moduleId);
        const topicDoc = moduleDoc?.topics.id(topicId);

        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        const progressRecords = await Progress.find({ course: courseId }).populate('student', 'name email');

        const analytics = progressRecords.map(p => {
            const topicCompleted = p.completedTopics.includes(topicId);

            // Calculate time spent on this topic's resources
            let timeSpent = 0;
            let resourcesCompleted = 0;

            topicDoc.resources.forEach(r => {
                const rp = p.resourceProgress.find(rp => rp.resourceId === r._id.toString());
                if (rp) {
                    timeSpent += (rp.timeSpent || 0);
                    if (rp.completed) resourcesCompleted++;
                }
            });

            return {
                studentId: p.student._id,
                name: p.student.name,
                email: p.student.email,
                timeSpent, // in seconds
                completed: topicCompleted,
                resourcesCompleted,
                totalResources: topicDoc.resources.length
            };
        });

        res.json({ topicTitle: topicDoc.title, analytics });

    } catch (error) {
        console.error("Error fetching topic analytics:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.refreshTopicPlan = async (req, res) => {
    try {
        const { moduleId, topicId, pathId } = req.body;
        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const container = resolvePathContainer(profile, pathId);
        if (!container) return res.status(404).json({ error: 'Path not found' });

        const moduleDoc = container.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // Clear cached plan so getTopicDetails regenerates it
        topicDoc.plan = { objectives: [], estimatedTime: '', generatedAt: null, steps: [] };
        await profile.save();

        const field = container.onboarding?.field || profile.onboarding.field;
        const level = container.onboarding?.level || profile.onboarding.level;

        // Immediately regenerate the plan
        const planData = await aiService.generateTopicStepPlan(
            field,
            level,
            topicDoc.title,
            moduleDoc.title,
            topicDoc.subtopics || []
        );

        topicDoc.plan = {
            objectives: planData.objectives,
            estimatedTime: planData.estimatedTime,
            generatedAt: new Date(),
            steps: planData.steps
        };

        profile.markModified(pathId ? 'paths' : 'currentPath');
        await profile.save();
        res.json({ success: true, topic: topicDoc });

    } catch (error) {
        console.error('Error refreshing topic plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.submitAiPathQuiz = async (req, res) => {
    try {
        const { moduleId, topicId, topicTitle, score, totalQuestions, correctAnswers } = req.body;
        const userId = req.user.id;
        const passed = score >= 70;

        // Atomic gamification update — avoids null-stats crash on old profiles
        const updatedProfile = await StudentProfile.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    points: passed ? 50 : 10,
                    'stats.quizzesTaken': 1,
                    'stats.hoursStudied': 0.25,
                },
                $set: { lastActiveDate: new Date() },
            },
            { upsert: true, new: true }
        );
        if (!updatedProfile) return res.status(404).json({ error: 'Profile not found' });

        // Level + badge dedup (atomic per-badge to prevent race condition duplicates)
        if (passed) {
            const newLevel = Math.floor((updatedProfile.points || 0) / 500) + 1;
            if (newLevel !== (updatedProfile.level || 1)) {
                await StudentProfile.updateOne({ userId }, { $set: { level: newLevel } });
            }
            if ((updatedProfile.stats?.quizzesTaken || 0) === 1) {
                await StudentProfile.updateOne(
                    { userId, 'badges.id': { $ne: 'first_quiz' } },
                    { $push: { badges: { id: 'first_quiz', name: 'First Quiz Ace', icon: '🎯', awardedAt: new Date() } } }
                );
            }
            if (score === 100) {
                await StudentProfile.updateOne(
                    { userId, 'badges.id': { $ne: 'perfect_score' } },
                    { $push: { badges: { id: 'perfect_score', name: 'Perfectionist', icon: '🌟', awardedAt: new Date() } } }
                );
            }
        }

        // Reload full profile for embedded currentPath mutation
        const pathProfile = await StudentProfile.findOne({ userId });

        // Mark topic completed on AI path
        if (passed && pathProfile) {
            const moduleDoc = pathProfile.currentPath.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (moduleDoc) {
                const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
                if (topicDoc) {
                    topicDoc.status = 'completed';
                    if (moduleDoc.topics.every(t => t.status === 'completed')) {
                        moduleDoc.status = 'completed';
                        const mIdx = pathProfile.currentPath.modules.findIndex(m => m.id === moduleId || m._id.toString() === moduleId);
                        if (mIdx >= 0 && mIdx < pathProfile.currentPath.modules.length - 1) {
                            pathProfile.currentPath.modules[mIdx + 1].status = 'unlocked';
                        }
                    }
                }
            }
            pathProfile.markModified('currentPath');
            await pathProfile.save();

            // Detect full AI-path completion
            const allDone = pathProfile.currentPath.modules.every(m => m.status === 'completed');
            if (allDone && !pathProfile.currentPath.completedAt) {
                await StudentProfile.updateOne(
                    { userId },
                    { $inc: { 'stats.coursesCompleted': 1, points: 200 }, $set: { 'currentPath.completedAt': new Date() } }
                );
            }
        }

        await refreshStreak(userId);
        res.json({ success: true, passed, points: updatedProfile.points, pointsAwarded: passed ? 50 : 10, stats: updatedProfile.stats });

    } catch (error) {
        console.error('Error submitting AI path quiz:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.generateResourceQuiz = async (req, res) => {
    try {
        const { resourceTitle, topicTitle } = req.body;
        console.log(`Generating quiz for resource: ${resourceTitle} (${topicTitle})`);

        const questions = await aiService.generateQuizFromContext(
            topicTitle || "General",
            `Resource Title: ${resourceTitle}`,
            5
        );

        res.json({ questions });
    } catch (error) {
        console.error("Error generating resource quiz:", error);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
};

// --- NEW TOPIC QUIZ LOGIC ---

// 1. Get or Generate Topic Quiz
exports.adminTopicQuiz = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const { bloomLevel } = req.query;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const moduleDoc = course.modules.id(moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.id(topicId);
        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // Check for teacher-generated questions first
        const GeneratedQuestion = require('../models/GeneratedQuestion');
        const teacherQuestions = await GeneratedQuestion.find({
            courseId,
            topicId,
            origin: 'teacher',
            approved: true,
        }).sort({ createdAt: -1 }).limit(10).lean();

        if (teacherQuestions.length > 0) {
            const questions = teacherQuestions.map(q => ({
                question: q.questionText,
                options: q.options.map(o => o.text),
                correctAnswer: q.options.find(o => o.isCorrect)?.text || q.correctAnswer,
                explanation: q.explanation || '',
                bloomLevel: q.bloomLevel,
                difficulty: q.difficulty,
                isTeacherQuestion: true,
            }));
            return res.json({ title: topicDoc.title, questions, isTeacherQuiz: true, bloomLevel: teacherQuestions[0].bloomLevel, difficulty: teacherQuestions[0].difficulty });
        }

        // Fallback: generate on-the-fly via AI
        let ragContext = '';
        try {
            const chunks = await retrieveRelevantChunks({ query: `${topicDoc.title} ${moduleDoc.title}`, courseId, topK: 8 });
            if (chunks.length > 0) ragContext = chunks.map(c => c.text).join('\n\n');
        } catch (_) {}

        const contextText = ragContext || topicDoc.description || '';
        const questions = await aiService.generateTopicQuiz(
            topicDoc.title, moduleDoc.title, course.title,
            course.field || course.title, course.level || 'Intermediate',
            bloomLevel || 'understand', contextText
        );

        res.json({ title: topicDoc.title, questions, isTeacherQuiz: false });

    } catch (error) {
        console.error("Error generating topic quiz:", error);
        res.status(500).json({ error: 'Server error generating quiz' });
    }
};

// 2. Submit Quiz & Update Progress
exports.submitTopicQuiz = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const {
            score,
            totalQuestions,
            correctAnswers,
            bloomLevel = 'understand',
            topicTitle: submittedTopicTitle,
            wrongQuestions = [],
            isTeacherAssessment = false,
        } = req.body;
        const userId = req.user.id;

        const passed = score >= 70;

        // Update Progress
        let progress = await Progress.findOne({ student: userId, course: courseId });
        if (!progress) {
            progress = new Progress({ student: userId, course: courseId });
        }

        // Fetch topic title from course if not provided
        let resolvedTopicTitle = submittedTopicTitle || 'Unknown';
        const course = await Course.findById(courseId).lean();
        if (course) {
            for (const mod of course.modules || []) {
                const t = (mod.topics || []).find(t => (t.id || t._id?.toString()) === topicId);
                if (t) { resolvedTopicTitle = t.title; break; }
            }
        }

        progress.topicQuizScores.push({
            topicId,
            topicTitle: resolvedTopicTitle,
            score,
            totalQuestions,
            correctAnswers,
            passed,
            bloomLevel,
            isTeacherAssessment: isTeacherAssessment || false,
            wrongQuestions: wrongQuestions.map(wq => ({
                questionText: wq.questionText || wq.question || '',
                studentAnswer: wq.studentAnswer || wq.userAnswer || '',
                correctAnswer: wq.correctAnswer || '',
                bloomLevel: wq.bloomLevel || bloomLevel,
                difficulty: wq.difficulty || 'medium',
                topic: resolvedTopicTitle,
            })),
            attempts: 1,
            attemptDate: Date.now(),
        });

        // Update running average
        const allScores = progress.topicQuizScores.map(q => q.score);
        progress.avgQuizScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

        // Check Topic Completion Rule
        // Topic = COMPLETED only if: All mandatory resources completed AND Quiz Score >= 70%
        const courseDoc = await Course.findById(courseId);
        const moduleDoc = courseDoc?.modules?.id(moduleId);
        const topicDoc = moduleDoc?.topics?.id(topicId);

        let courseCompleted = false;

        if (isTeacherAssessment && score >= 80) {
            // Teacher quiz gate: scoring ≥ 80% marks topic complete without resource requirement
            if (!progress.completedTopics.includes(topicId)) {
                progress.completedTopics.push(topicId);
            }
        } else if (!isTeacherAssessment && topicDoc) {
            const resourceIds = topicDoc.resources.map(r => r._id.toString());
            const completedResourcesCount = progress.resourceProgress.filter(rp =>
                resourceIds.includes(rp.resourceId) && rp.completed
            ).length;
            const allResourcesDone = completedResourcesCount >= resourceIds.length;

            if (passed && allResourcesDone) {
                if (!progress.completedTopics.includes(topicId)) {
                    progress.completedTopics.push(topicId);
                }
            }
        }

        // Check course-level completion after either path
        if (progress.completedTopics.includes(topicId)) {
            const totalTopics = courseDoc?.modules?.reduce((sum, m) => sum + (m.topics || []).length, 0) || 0;
            if (totalTopics > 0 && progress.completedTopics.length >= totalTopics && progress.status !== 'completed') {
                progress.status = 'completed';
                courseCompleted = true;
            }
        }

        await progress.save();

        // --- GAMIFICATION UPDATE ---
        let pointsAwarded = 0;
        try {
            // +10 for attempt, +50 for passing
            const quizPts = passed ? 50 : 10;
            const updated = await StudentProfile.findOneAndUpdate(
                { userId },
                {
                    $inc: {
                        points: quizPts,
                        'stats.quizzesTaken': 1,
                        'stats.hoursStudied': 0.25,
                    },
                    $set: { lastActiveDate: new Date() },
                },
                { upsert: true, new: true }
            );
            pointsAwarded = quizPts;

            // Course completion bonus (+200)
            if (courseCompleted) {
                await StudentProfile.updateOne(
                    { userId },
                    { $inc: { points: 200, 'stats.coursesCompleted': 1 } }
                );
                pointsAwarded += 200;
            }

            if (passed) {
                const newLevel = Math.floor(((updated.points || 0) + (courseCompleted ? 200 : 0)) / 500) + 1;
                const badgeUpdates = {};
                if (newLevel !== (updated.level || 1)) badgeUpdates.level = newLevel;

                const existingIds = new Set((updated.badges || []).map(b => b.id));
                const newBadges = [];
                if ((updated.stats?.quizzesTaken || 0) === 1 && !existingIds.has('first_quiz')) {
                    newBadges.push({ id: 'first_quiz', name: 'First Quiz Ace', icon: '🎯', awardedAt: new Date() });
                }
                if (score === 100 && !existingIds.has('perfect_score')) {
                    newBadges.push({ id: 'perfect_score', name: 'Perfectionist', icon: '🌟', awardedAt: new Date() });
                }
                if ((updated.stats?.quizzesTaken || 0) >= 10 && !existingIds.has('quiz_master')) {
                    newBadges.push({ id: 'quiz_master', name: 'Quiz Master', icon: '🏆', awardedAt: new Date() });
                }

                if (Object.keys(badgeUpdates).length > 0 || newBadges.length > 0) {
                    const finalUpdate = { $set: badgeUpdates };
                    if (newBadges.length > 0) finalUpdate.$push = { badges: { $each: newBadges } };
                    await StudentProfile.updateOne({ userId }, finalUpdate);
                }
            }
        } catch (statsError) {
            console.error('Error updating gamification stats:', statsError);
        }

        await refreshStreak(userId);
        res.json({ success: true, passed, topicCompleted: progress.completedTopics.includes(topicId), courseCompleted, pointsAwarded });

    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ error: 'Server error processing quiz result' });
    }
};

// ============================================================================
// MULTIPLE AI PATHS — add / get / toggle for extra paths in profile.paths[]
// ============================================================================

exports.addCoursePath = async (req, res) => {
    try {
        const { field, level, goals, quizResults } = req.body;
        const userId = req.user.id;

        let pathData;
        try {
            pathData = await aiService.generateLearningPath(field, level, goals, quizResults);
        } catch (e) {
            console.error('AI Generation failed for extra path', e);
            return res.status(500).json({ error: 'Failed to generate learning path via AI' });
        }

        const exists = await StudentProfile.exists({ userId });
        if (!exists) return res.status(404).json({ error: 'Profile not found' });

        const newPath = {
            onboarding: { field, level, goals },
            generatedAt: new Date(),
            modules: pathData.modules.map((m, mIdx) => ({
                id: `module_${Date.now()}_${mIdx}`,
                title: m.title,
                description: m.description,
                duration: m.duration,
                difficultyLevel: m.difficultyLevel || 'beginner',
                goalStatement: m.goalStatement || '',
                practiceProjects: Array.isArray(m.practiceProjects) ? m.practiceProjects : [],
                status: 'locked',
                topics: (m.topics || []).map((t) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: t.title,
                    description: t.description,
                    status: 'pending',
                    subtopics: (t.subtopics || []).map((s) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        title: s.title,
                        description: s.description,
                        status: 'pending'
                    })),
                    resources: []
                }))
            }))
        };

        if (newPath.modules.length > 0) newPath.modules[0].status = 'unlocked';

        const updated = await StudentProfile.findOneAndUpdate(
            { userId },
            { $push: { paths: newPath } },
            { new: true }
        );

        const savedPath = updated.paths[updated.paths.length - 1];
        res.json({ message: 'Learning path added', path: savedPath });

    } catch (error) {
        console.error('Error adding course path:', error);
        res.status(500).json({ error: 'Server error adding path' });
    }
};

exports.getExtraPath = async (req, res) => {
    try {
        const { pathId } = req.params;
        const profile = await StudentProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        const pathDoc = profile.paths.id(pathId);
        if (!pathDoc) return res.status(404).json({ error: 'Path not found' });
        res.json({ path: pathDoc });
    } catch (error) {
        console.error('Error getting extra path:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.toggleExtraPathTopic = async (req, res) => {
    try {
        const { pathId, moduleId, topicId, status } = req.body;
        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const pathDoc = profile.paths.id(pathId);
        if (!pathDoc) return res.status(404).json({ error: 'Path not found' });

        const moduleDoc = pathDoc.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        topicDoc.status = status;

        if (moduleDoc.topics.every(t => t.status === 'completed')) {
            moduleDoc.status = 'completed';
            const mIdx = pathDoc.modules.findIndex(m => m.id === moduleId || m._id.toString() === moduleId);
            if (mIdx >= 0 && mIdx < pathDoc.modules.length - 1) {
                pathDoc.modules[mIdx + 1].status = 'unlocked';
            }
        }

        if (status === 'completed') {
            if (!profile.stats) profile.stats = {};
            profile.stats.hoursStudied = Math.round(((profile.stats.hoursStudied || 0) + 0.5) * 10) / 10;
            const allDone = pathDoc.modules.every(m => m.status === 'completed');
            if (allDone && !pathDoc.completedAt) {
                pathDoc.completedAt = new Date();
                profile.stats.coursesCompleted = (profile.stats.coursesCompleted || 0) + 1;
            }
            profile.markModified('stats');
        }

        profile.markModified('paths');
        await profile.save();
        await refreshStreak(userId);
        res.json({ success: true, topic: topicDoc });

    } catch (error) {
        console.error('Error toggling extra path topic:', error);
        res.status(500).json({ error: 'Server error' });
    }
};