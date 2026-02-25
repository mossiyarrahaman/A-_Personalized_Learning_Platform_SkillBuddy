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
router.get('/:courseId/module/:moduleId/topic/:topicId/analytics', auth, courseController.getTopicAnalytics);
// Topic Quiz Routes
router.get('/:courseId/module/:moduleId/topic/:topicId/quiz', auth, courseController.adminTopicQuiz);
router.post('/:courseId/module/:moduleId/topic/:topicId/quiz/submit', auth, courseController.submitTopicQuiz);

// Student Class Routes
router.post('/:courseId/enroll', auth, courseController.enrollStudent); // Teacher enrolls student
router.get('/student/enrolled-classes', auth, courseController.getEnrolledClasses); // Student gets their classes
router.post('/class-progress', auth, courseController.updateClassProgress); // Update tracking for class
router.post('/path/toggle-topic', auth, courseController.toggleTopicComplete);
router.post('/generate-resource-quiz', auth, courseController.generateResourceQuiz); // Generate quiz from resource

module.exports = router;
