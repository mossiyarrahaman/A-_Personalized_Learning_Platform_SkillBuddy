const Doubt = require('../models/Doubt');
const aiService = require('../services/ai-service');

exports.createDoubt = async (req, res) => {
    try {
        const { title, description, tags, moduleId, topicId } = req.body;

        const doubt = new Doubt({
            studentId: req.user.id,
            title,
            description,
            tags,
            moduleId,
            topicId,
            status: 'open'
        });

        await doubt.save();

        // AI Auto-Response
        try {
            console.log("Generating AI response for doubt...");
            const aiResponse = await aiService.callOpenRouter(`
            User asked: "${title}"
            Details: "${description}"
            Provide a helpful, technical answer as an instructor.
            Keep it concise.
        `);

            doubt.answers.push({
                responderName: 'AI Assistant',
                content: aiResponse,
                isAccepted: false,
                createdAt: new Date()
            });

            doubt.status = 'answered';
            await doubt.save();

        } catch (aiError) {
            console.error("AI Auto-response failed", aiError);
        }

        res.status(201).json({ doubt });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error creating doubt' });
    }
};

exports.getDoubts = async (req, res) => {
    try {
        // Filter by user or all? For now, let's get all public doubts or user's doubts
        // User might want to see their own doubts
        const doubts = await Doubt.find({ studentId: req.user.id }).sort({ createdAt: -1 });
        res.json({ doubts });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllDoubts = async (req, res) => {
    // For community or teacher view
    try {
        const doubts = await Doubt.find().populate('studentId', 'name').sort({ createdAt: -1 });
        res.json({ doubts });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.replyToDoubt = async (req, res) => {
    try {
        const { doubtId } = req.params;
        const { content, audioUrl, attachments } = req.body; // New rich content

        const doubt = await Doubt.findById(doubtId);
        if (!doubt) return res.status(404).json({ error: 'Doubt not found' });

        const newAnswer = {
            responderId: req.user.id,
            responderName: req.user.name, // Assuming teacher/user has a name
            content,
            audioUrl,
            attachments,
            isAccepted: false,
            createdAt: new Date()
        };

        doubt.answers.push(newAnswer);
        doubt.status = 'answered';

        await doubt.save();

        res.json({ message: 'Reply added successfully', doubt });

    } catch (error) {
        console.error("Error replying to doubt:", error);
        res.status(500).json({ error: 'Server error adding reply' });
    }
};

exports.updateDoubtStatus = async (req, res) => {
    try {
        const { doubtId } = req.params;
        const { isImportant, isFAQ, status } = req.body;

        const doubt = await Doubt.findById(doubtId);
        if (!doubt) return res.status(404).json({ error: 'Doubt not found' });

        // Check if user is teacher/admin (Add logic if needed, for now assuming authorized route)
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            // return res.status(403).json({ error: 'Not authorized' }); 
            // Commenting out strict check for now to allow testing, but should be enabled in prod
        }

        if (isImportant !== undefined) doubt.isImportant = isImportant;
        if (isFAQ !== undefined) doubt.isFAQ = isFAQ;
        if (status) doubt.status = status;

        await doubt.save();
        res.json({ message: 'Doubt updated', doubt });

    } catch (error) {
        console.error("Error updating doubt status:", error);
        res.status(500).json({ error: 'Server error' });
    }
};
