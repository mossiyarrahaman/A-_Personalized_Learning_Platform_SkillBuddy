const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/classTestController');

// ─── Shared ───────────────────────────────────────────────────────────────────
router.get('/topic/:courseId/:topicId',   auth, ctrl.getTopicTests);
router.get('/module/:courseId/:moduleId', auth, ctrl.getModuleTests);

// ─── Teacher ──────────────────────────────────────────────────────────────────
router.post('/',        auth, ctrl.createTest);
router.put('/:id',      auth, ctrl.updateTest);
router.delete('/:id',   auth, ctrl.deleteTest);
router.patch('/:id/publish',   auth, ctrl.togglePublish);
router.post('/:id/generate',   auth, ctrl.generateQuestions);
router.get('/:id/results',     auth, ctrl.getTestResults);

// ─── Student ──────────────────────────────────────────────────────────────────
router.post('/:id/start',       auth, ctrl.startAttempt);
router.post('/:id/submit',      auth, ctrl.submitAttempt);
router.get('/:id/my-attempts',  auth, ctrl.getMyAttempts);

module.exports = router;
