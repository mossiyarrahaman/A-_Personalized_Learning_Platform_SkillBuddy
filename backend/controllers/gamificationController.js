const StudentProfile = require('../models/StudentProfile');

exports.getLeaderboard = async (req, res) => {
    try {
        const topStudents = await StudentProfile.find()
            .sort({ points: -1 })
            .limit(10)
            .populate('userId', 'name email'); // Assuming User model has name

        const leaderboard = topStudents.map((s, index) => ({
            rank: index + 1,
            name: s.userId ? s.userId.name : 'Unknown',
            points: s.points,
            badges: s.badges.length,
            streak: s.streak,
            isCurrentUser: s.userId && s.userId._id.toString() === req.user.id
        }));

        res.json({ leaderboard });
    } catch (error) {
        console.error("Leaderboard Error:", error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({
            points: profile.points,
            badges: profile.badges,
            streak: profile.streak,
            level: profile.level
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
