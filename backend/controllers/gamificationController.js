const StudentProfile = require('../models/StudentProfile');

exports.getLeaderboard = async (req, res) => {
    try {
        console.log("Fetching Leaderboard...");
        const topStudents = await StudentProfile.find()
            .sort({ points: -1 })
            .limit(10)
            .populate('userId', 'name email');

        console.log(`Found ${topStudents.length} profiles for leaderboard.`);

        const leaderboard = topStudents.map((s, index) => {
            // Filter out if user is null (deleted user)
            if (!s.userId) return null;
            return {
                rank: index + 1,
                name: s.userId.name,
                points: s.points || 0,
                badges: s.badges ? s.badges.length : 0,
                streak: s.streak || 0,
                isCurrentUser: req.user && s.userId._id.toString() === req.user.id
            };
        }).filter(item => item !== null); // Remove null entries

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
            level: profile.level,
            hoursStudied: profile.stats?.hoursStudied || 0 // Added this line
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
