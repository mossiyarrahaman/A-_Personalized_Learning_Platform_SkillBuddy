const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const auth = require('../middleware/auth');

router.post('/', auth, doubtController.createDoubt);
router.get('/my', auth, doubtController.getDoubts);
router.get('/all', auth, doubtController.getAllDoubts);
router.post('/:doubtId/reply', auth, doubtController.replyToDoubt);
router.patch('/:doubtId/status', auth, doubtController.updateDoubtStatus);

module.exports = router;
