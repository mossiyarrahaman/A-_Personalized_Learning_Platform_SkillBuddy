const StudentProfile = require('../models/StudentProfile');

exports.getLeaderboard = async (req, res) => {
    try {
        // Fetch enough profiles to find the current user even if outside top 10
        const allProfiles = await StudentProfile.find()
            .sort({ points: -1 })
            .limit(100)
            .populate('userId', 'name email');

        const ranked = allProfiles
            .filter(s => s.userId)
            .map((s, index) => ({
                rank: index + 1,
                name: s.userId.name,
                points: s.points || 0,
                badges: s.badges ? s.badges.length : 0,
                streak: s.streak || 0,
                level: s.level || 1,
                isCurrentUser: req.user ? s.userId._id.toString() === req.user.id : false,
            }));

        const top10 = ranked.slice(0, 10);

        // Append current user if they're outside top 10
        const currentInTop10 = top10.some(u => u.isCurrentUser);
        if (!currentInTop10) {
            const currentUser = ranked.find(u => u.isCurrentUser);
            if (currentUser) top10.push(currentUser);
        }

        res.json({ leaderboard: top10 });
    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ userId: req.user.id });
        if (!profile) {
            // Return zeroed stats instead of 404 so the UI renders cleanly
            return res.json({ points: 0, badges: [], streak: 0, level: 1, hoursStudied: 0 });
        }

        // Ensure level is in sync with points (self-heal for old profiles)
        const correctLevel = Math.floor((profile.points || 0) / 500) + 1;
        if (correctLevel !== (profile.level || 1)) {
            await StudentProfile.updateOne({ userId: req.user.id }, { $set: { level: correctLevel } });
        }

        res.json({
            points: profile.points || 0,
            badges: profile.badges || [],
            streak: profile.streak || 0,
            level: correctLevel,
            hoursStudied: profile.stats?.hoursStudied || 0,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
