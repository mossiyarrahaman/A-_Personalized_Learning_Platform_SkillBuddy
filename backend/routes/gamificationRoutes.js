const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const auth = require('../middleware/auth');

router.get('/leaderboard', auth, gamificationController.getLeaderboard);
router.get('/my-stats', auth, gamificationController.getUserStats);

module.exports = router;
