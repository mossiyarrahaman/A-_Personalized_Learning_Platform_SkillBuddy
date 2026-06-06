const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const auth = require('../middleware/auth');

router.post('/sessions',                   auth, tutorController.createSession);
router.get('/sessions/:id',                auth, tutorController.getSession);
router.post('/sessions/:id/messages',      auth, tutorController.appendMessage);
router.post('/sessions/:id/end',           auth, tutorController.endSession);
router.post('/sessions/:id/wrap-up',       auth, tutorController.wrapUpExercise);

module.exports = router;
