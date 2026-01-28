const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const auth = require('../middleware/auth');

router.post('/generate', auth, assessmentController.generateAssessment);
router.post('/generate-from-context', auth, assessmentController.generateContextQuiz);
router.post('/submit', auth, assessmentController.submitAssessment);

module.exports = router;
