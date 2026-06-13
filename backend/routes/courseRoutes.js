const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');

router.post('/generate-path', auth, courseController.generatePath);
router.post('/onboarding-assessment', auth, courseController.getOnboardingAssessment);
router.get('/dashboard', auth, courseController.getStudentDashboard);
// New Routes
router.get('/module/:moduleId/topic/:topicId', auth, courseController.getTopicDetails);
router.post('/progress', auth, courseController.updateResourceProgress);
router.post('/create', auth, courseController.createCourse);
router.get('/teacher-courses', auth, courseController.getTeacherCourses);
router.put('/:courseId/modules', auth, courseController.updateCourseModules);
router.patch('/:courseId/modules/:moduleId/topics/:topicId/status', auth, courseController.updateTopicStatus);
router.get('/:courseId/analytics', auth, courseController.getCourseAnalytics);
router.get('/:courseId/students-needing-attention', auth, courseController.getStudentsNeedingAttention);
router.get('/:courseId/module/:moduleId/topic/:topicId/analytics', auth, courseController.getTopicAnalytics);
// Topic Quiz Routes
router.get('/:courseId/module/:moduleId/topic/:topicId/quiz', auth, courseController.adminTopicQuiz);
router.post('/:courseId/module/:moduleId/topic/:topicId/quiz/submit', auth, courseController.submitTopicQuiz);
router.get('/:courseId/my-tier-scores', auth, courseController.getMyTierScores);

// Resume target (Feature A)
router.get('/resume-target', auth, courseController.getResumeTarget);

// Reflection submissions (Feature B)
router.post('/reflections', auth, courseController.saveReflection);

// Student quiz stats (real per-student data from DB)
router.get('/my-quiz-stats',    auth, courseController.getMyQuizStats);
router.post('/save-quiz-result', auth, courseController.saveQuizResultRecord);

// Student Class Routes
router.get('/student/available-courses', auth, courseController.getAvailableCourses); // Browse joinable courses
router.post('/student/self-enroll/:courseId', auth, courseController.selfEnrollStudent); // Student self-enroll
router.post('/:courseId/enroll', auth, courseController.enrollStudent); // Teacher enrolls student
router.delete('/:courseId/enroll/:studentId', auth, courseController.unenrollStudent); // Teacher removes student
router.get('/student/enrolled-classes', auth, courseController.getEnrolledClasses); // Student gets their classes
router.post('/class-progress', auth, courseController.updateClassProgress); // Update tracking for class
router.post('/path/toggle-topic', auth, courseController.toggleTopicComplete);
router.post('/path/toggle-step', auth, courseController.toggleStepComplete);
router.post('/path/submit-ai-quiz', auth, courseController.submitAiPathQuiz);
router.post('/path/refresh-plan', auth, courseController.refreshTopicPlan);
router.post('/generate-resource-quiz', auth, courseController.generateResourceQuiz); // Generate quiz from resource

// Multiple AI Paths
router.post('/paths', auth, courseController.addCoursePath);
router.post('/paths/toggle-topic', auth, courseController.toggleExtraPathTopic);
router.get('/paths/:pathId', auth, courseController.getExtraPath);
router.delete('/paths/:pathId', auth, courseController.deleteAiPath);

module.exports = router;
