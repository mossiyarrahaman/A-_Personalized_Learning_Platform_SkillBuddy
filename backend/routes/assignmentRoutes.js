const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/assignmentController');

// ─── Shared ───────────────────────────────────────────────────────────────────
router.get('/topic/:courseId/:topicId',   auth, ctrl.getTopicAssignments);
router.get('/module/:courseId/:moduleId', auth, ctrl.getModuleAssignments);

// ─── Teacher ──────────────────────────────────────────────────────────────────
router.post('/',       auth, ctrl.createAssignment);
router.put('/:id',     auth, ctrl.updateAssignment);
router.delete('/:id',  auth, ctrl.deleteAssignment);
router.patch('/:id/publish', auth, ctrl.togglePublish);

// Submissions — teacher
router.get('/:id/submissions',               auth, ctrl.getSubmissions);
router.patch('/:id/submissions/:subId/grade', auth, ctrl.gradeSubmission);

// ─── Student ──────────────────────────────────────────────────────────────────
router.post('/:id/submit',       auth, ctrl.submitAssignment);
router.put('/:id/submit',        auth, ctrl.editSubmission);
router.get('/:id/my-submission', auth, ctrl.getMySubmission);

module.exports = router;
