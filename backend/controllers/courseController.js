const Course = require('../models/Course');
const StudentProfile = require('../models/StudentProfile');
const Progress = require('../models/Progress');
const User = require('../models/User'); // Added User model
const aiService = require('../services/ai-service');

// Generate a personalized learning path
exports.generatePath = async (req, res) => {
    try {
        const { field, level, goals, quizResults } = req.body;
        const userId = req.user.id;

        console.log(`Generating path for user ${userId} in ${field} (${level}) with quiz score: ${quizResults?.score}`);

        let pathData;
        try {
            pathData = await aiService.generateLearningPath(field, level, goals, quizResults);
        } catch (e) {
            console.error("AI Generation failed, using fallback", e);
            return res.status(500).json({ error: "Failed to generate learning path via AI" });
        }

        const profile = await StudentProfile.findOne({ userId });
        if (profile) {
            profile.onboarding = { field, level, goals, completed: true };

            // Map AI modules to Schema
            profile.currentPath = {
                generatedAt: new Date(),
                modules: pathData.modules.map(m => ({
                    id: new Date().getTime().toString() + Math.random(), // Simple ID gen
                    title: m.title,
                    description: m.description,
                    duration: m.duration,
                    status: 'locked',
                    topics: m.topics ? m.topics.map(t => ({
                        id: Math.random().toString(36).substr(2, 9),
                        title: t.title,
                        description: t.description,
                        status: 'pending',
                        resources: [] // To be populated later
                    })) : []
                }))
            };

            // Unlock first module
            if (profile.currentPath.modules.length > 0) {
                profile.currentPath.modules[0].status = 'unlocked';
            }

            await profile.save();
        }

        res.json({ message: 'Learning path generated', path: profile.currentPath });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error generating path' });
    }
};

// Manually toggle topic completion for AI Path
exports.toggleTopicComplete = async (req, res) => {
    try {
        const { moduleId, topicId, status } = req.body; // status: 'completed' or 'pending'
        const userId = req.user.id;

        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const moduleDoc = profile.currentPath.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
        if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

        const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // Update status
        topicDoc.status = status;

        // Check module completion (optional, but good for UI)
        if (moduleDoc.topics.every(t => t.status === 'completed')) {
            moduleDoc.status = 'completed';
        }

        await profile.save();
        res.json({ success: true, topic: topicDoc });

    } catch (error) {
        console.error("Error toggling topic:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOnboardingAssessment = async (req, res) => {
    try {
        const { field, level } = req.body;
        console.log(`Generating diagnostic quiz for ${field} (${level})`);

        let questions = [];
        try {
            questions = await aiService.generateAssessmentQuestions(field || 'General', level || 'Beginner', 5);
        } catch (aiError) {
            console.error("AI Service Error in Controller:", aiError);
            // Fallback if AI service throws uncaught error
        }

        // Double check we have questions, if not, use hardcoded fallback
        if (!questions || questions.length === 0) {
            console.log("Using hardcoded fallback questions");
            questions = Array.from({ length: 5 }, (_, i) => ({
                question: `Diagnostic Question ${i + 1} about ${field || 'General Knowledge'}`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                explanation: 'This is a fallback question because AI generation failed.',
                hint: 'Choose the first option.',
                bloomLevel: 'remember',
                topic: field || 'Basics'
            }));
        }

        res.json({ questions });
    } catch (error) {
        console.error("Critical Error in getOnboardingAssessment:", error);
        res.status(500).json({ error: 'Failed to generate assessment' });
    }
};

exports.getStudentDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await StudentProfile.findOne({ userId });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({ profile });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get details for a specific module/topic, generating resources if needed
exports.getTopicDetails = async (req, res) => {
    try {
        const { moduleId, topicId } = req.params;
        const { courseId } = req.query; // Check for courseId in query
        const userId = req.user.id;

        let topicDoc = null;
        let contextType = 'ai_path'; // or 'teacher_course'

        if (courseId) {
            // Case 1: Fetching from a Teacher Course
            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ error: 'Course not found' });

            // Verify enrollment (optional but recommended)
            // if (!course.enrolledStudents.includes(userId) && course.author.toString() !== userId) {
            //     return res.status(403).json({ error: 'Not authorized' });
            // }

            const moduleDoc = course.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (!moduleDoc) return res.status(404).json({ error: 'Module not found in course' });

            topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
            contextType = 'teacher_course';

        } else {
            // Case 2: Fetching from AI Learning Path (StudentProfile)
            const profile = await StudentProfile.findOne({ userId });
            if (!profile) return res.status(404).json({ error: 'Profile not found' });

            const moduleDoc = profile.currentPath.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

            topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
        }

        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        // If context is AI Path and resources are empty, generate them!
        if (contextType === 'ai_path' && (!topicDoc.resources || topicDoc.resources.length === 0)) {
            const profile = await StudentProfile.findOne({ userId }); // Re-fetch to be safe/clean
            console.log(`Generating resources for topic: ${topicDoc.title}`);
            const resourcesData = await aiService.generateResourceRecommendations(
                profile.onboarding.field,
                profile.onboarding.level,
                [topicDoc.title]
            );

            topicDoc.resources = resourcesData.recommendations.map(r => ({
                type: r.type.toLowerCase(),
                title: r.title,
                url: r.url,
                duration: '10 min',
                completed: false
            }));

            // Save the detailed content/notes
            topicDoc.content = resourcesData.content;

            await profile.save();
        }

        res.json({ topic: topicDoc });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching topic details' });
    }
};

exports.updateResourceProgress = async (req, res) => {
    try {
        const { moduleId, topicId, resourceId, progress, timeSpent, lastPosition } = req.body;
        const userId = req.user.id;

        // 1. Update StudentProfile (Legacy/Fallback for path generation)
        const profile = await StudentProfile.findOne({ userId });
        if (profile) {
            const moduleDoc = profile.currentPath?.modules.find(m => m.id === moduleId || m._id.toString() === moduleId);
            if (moduleDoc) {
                const topicDoc = moduleDoc.topics.find(t => t.id === topicId || t._id.toString() === topicId);
                if (topicDoc) {
                    const resource = topicDoc.resources.find(r => r._id.toString() === resourceId || r.id === resourceId);
                    if (resource) {
                        resource.completed = progress === 100;
                    }
                    // Check topic completion
                    if (topicDoc.resources.every(r => r.completed)) {
                        topicDoc.status = 'completed';
                    }
                }
            }
            await profile.save();
        }

        // 2. Update Progress Record (For Teacher Analytics & Detailed Tracking)
        // Find existing progress or create/find based on context. 
        // Note: Ideally we pass courseId. If not, we might need to infer it or just update if it exists.
        // For Custom Courses (Teacher Created), we definitely need Progress record.
        // For AI Paths, we currently store in StudentProfile but should sync to Progress too if we want analytics.

        // Assuming this is called for both. If we have courseId in body, use it.
        const { courseId } = req.body;
        if (courseId) {
            let progressRecord = await Progress.findOne({ student: userId, course: courseId });
            if (progressRecord) {
                const resIndex = progressRecord.resourceProgress.findIndex(rp => rp.resourceId === resourceId);
                if (resIndex > -1) {
                    progressRecord.resourceProgress[resIndex].timeSpent += (timeSpent || 0); // Accumulate time
                    progressRecord.resourceProgress[resIndex].lastPosition = lastPosition || 0;
                    if (progress === 100) progressRecord.resourceProgress[resIndex].completed = true;
                } else {
                    progressRecord.resourceProgress.push({
                        resourceId,
                        type: 'unknown', // Ideally pass type from frontend
                        timeSpent: timeSpent || 0,
                        completed: progress === 100,
                        lastPosition: lastPosition || 0
                    });
                }
                await progressRecord.save();
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Error updating resource progress:", error);
        res.status(500).json({ error: 'Error updating progress' });
    }
};

exports.createCourse = async (req, res) => {
    console.log("createCourse hit!");
    console.log("Body:", req.body);
    console.log("User:", req.user);
    try {
        const { title, description, level, field } = req.body;

        if (!req.user || !req.user.id) {
            console.log("No user ID found in request");
            return res.status(401).json({ error: "User not authenticated properly" });
        }

        const teacherId = req.user.id;

        // Basic validation
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const newCourse = new Course({
            title,
            description,
            level,
            field,
            author: teacherId,
            isPublished: true,
            modules: []
        });

        const savedCourse = await newCourse.save();
        console.log("Course saved:", savedCourse._id);
        res.status(201).json({ message: 'Course created successfully', course: savedCourse });
    } catch (error) {
        console.error("Error creating course FULL ERROR:", error);
        res.status(500).json({ error: 'Server error creating course: ' + error.message });
    }
};

exports.getTeacherCourses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const courses = await Course.find({ author: teacherId }).sort({ createdAt: -1 }).populate('enrolledStudents', 'name email');
        res.json({ courses });
    } catch (error) {
        console.error("Error fetching teacher courses:", error);
        res.status(500).json({ error: 'Server error fetching courses' });
    }
};


exports.updateCourseModules = async (req, res) => {
    try {
        const { courseId } = req.params;
        console.log("updateCourseModules body:", req.body);
        const { modules, syllabus, title, description } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this course' });
        }

        course.modules = modules;
        if (syllabus) course.syllabus = syllabus;
        if (title) course.title = title;
        if (description) course.description = description;

        await course.save();

        res.json({ message: 'Curriculum updated successfully', modules: course.modules });
    } catch (error) {
        console.error("Error updating curriculum:", error);
        res.status(500).json({ error: 'Server error updating curriculum' });
    }
};

exports.updateTopicStatus = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const { isChecked, teacherStatus } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        if (course.author.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const module = course.modules.id(moduleId);
        if (!module) return res.status(404).json({ error: 'Module not found' });

        const topic = module.topics.id(topicId);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        if (isChecked !== undefined) topic.isChecked = isChecked;
        if (teacherStatus) topic.teacherStatus = teacherStatus;

        await course.save();
        res.json({ message: 'Topic status updated', topic });

    } catch (error) {
        console.error("Error updating topic status:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCourseAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).populate('enrolledStudents', 'name email');

        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Fetch all progress records for this course
        const progressRecords = await Progress.find({ course: courseId }).populate('student', 'name email');

        // Calculate Stats
        const totalStudents = course.enrolledStudents.length;

        // Count active students (accessed in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudents = progressRecords.filter(p => p.lastAccessed > sevenDaysAgo).length;

        // Calculate Average Progress & Time Spent
        // Total topics in course
        let totalTopics = 0;
        course.modules.forEach(m => totalTopics += m.topics.length);

        let totalCompletionPercentage = 0;
        let totalTimeSpentInSeconds = 0;

        // Time Distribution Buckets
        const timeDistribution = {
            "0-1h": 0,
            "1-5h": 0,
            "5-10h": 0,
            "10h+": 0
        };

        const studentsProgressData = progressRecords.map(p => {
            const completedCount = p.completedTopics.length;
            const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
            totalCompletionPercentage += percentage;

            // Calculate total time spent for this student
            const studentTimeCheck = p.resourceProgress?.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) || 0;
            totalTimeSpentInSeconds += studentTimeCheck;

            // Add to Distribution
            if (studentTimeCheck < 3600) timeDistribution["0-1h"]++;
            else if (studentTimeCheck < 18000) timeDistribution["1-5h"]++;
            else if (studentTimeCheck < 36000) timeDistribution["5-10h"]++;
            else timeDistribution["10h+"]++;

            return {
                studentId: p.student._id,
                name: p.student.name,
                email: p.student.email,
                completedTopics: completedCount,
                totalTopics,
                percentage,
                totalTimeSpent: studentTimeCheck, // in seconds
                lastAccessed: p.lastAccessed
            };
        });

        const avgProgress = totalStudents > 0 ? Math.round(totalCompletionPercentage / totalStudents) : 0;

        // Calculate Average Time
        const avgSeconds = totalStudents > 0 ? Math.round(totalTimeSpentInSeconds / totalStudents) : 0;
        const avgHours = Math.floor(avgSeconds / 3600);
        const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
        const avgTimeSpent = `${avgHours}h ${avgMinutes}m`;

        // Engagement Data (Last 7 days activity)
        // Simple mock for graph visual
        const engagement = {
            dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            active: [0, 0, 0, 0, 0, 0, activeStudents]
        };

        res.json({
            stats: {
                totalStudents,
                activeStudents,
                avgProgress,
                avgTimeSpent // Replaces avgScore
            },
            students: studentsProgressData, // Sending list of students with progress
            timeDistribution, // Replaces scoreDistribution
            engagement
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};

// --- NEW: Enrollment & Progress Logic for Teacher Classes ---

// Enroll a student in a class (Teacher adds student)
exports.enrollStudent = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { identifier } = req.body;
        const teacherId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Ensure only the author (teacher) can add students
        if (course.author.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized to add students to this course' });
        }

        // Find student by Email OR Name
        let student = await User.findOne({ email: identifier });
        if (!student) {
            student = await User.findOne({ name: identifier, role: 'student' });
        }

        if (!student) return res.status(404).json({ error: 'Student not found with that Email or Name' });

        // Check if already enrolled
        // Convert to string for comparison to be safe
        const studentIdStr = student._id.toString();
        const enrolledStrs = course.enrolledStudents.map(id => id.toString());

        if (enrolledStrs.includes(studentIdStr)) {
            return res.status(400).json({ error: 'Student already enrolled' });
        }

        // Add to Course
        course.enrolledStudents.push(student._id);
        await course.save();

        // Create Progress Record
        const progress = new Progress({
            student: student._id,
            course: course._id,
            completedTopics: [],
            completedResources: []
        });
        await progress.save();

        res.json({ message: 'Student enrolled successfully', student: { id: student._id, name: student.name, email: student.email } });
    } catch (error) {
        console.error("Enrollment error:", error);
        res.status(500).json({ error: 'Server error enrolling student' });
    }
};

// Get Enrolled Classes for Student
exports.getEnrolledClasses = async (req, res) => {
    try {
        const userId = req.user.id;
        // Find all progress records for this student
        // Populate course details
        const progressRecords = await Progress.find({ student: userId }).populate('course');

        // Filter out any where course might be null (deleted courses)
        const validRecords = progressRecords.filter(p => p.course !== null);

        const classes = validRecords.map(p => ({
            ...p.course.toObject(),
            studentProgress: {
                completedTopics: p.completedTopics,
                completedResources: p.completedResources,
                lastAccessed: p.lastAccessed
            }
        }));

        res.json({ classes });
    } catch (error) {
        console.error("Get classes error:", error);
        res.status(500).json({ error: 'Server error fetching classes' });
    }
};

// Update Class Progress (Topic Completion)
exports.updateClassProgress = async (req, res) => {
    try {
        const { courseId, topicId, completed } = req.body;
        const userId = req.user.id;

        let progress = await Progress.findOne({ student: userId, course: courseId });
        if (!progress) return res.status(404).json({ error: 'Progress record not found' });

        if (topicId) {
            if (completed) {
                if (!progress.completedTopics.includes(topicId)) {
                    progress.completedTopics.push(topicId);
                }
            } else {
                progress.completedTopics = progress.completedTopics.filter(id => id !== topicId);
            }
        }

        progress.lastAccessed = Date.now();
        await progress.save();

        res.json({ success: true, progress });
    } catch (error) {

        console.error("Update class progress error:", error);
        res.status(500).json({ error: 'Server error updating progress' });
    }
};


exports.getTopicAnalytics = async (req, res) => {
    try {
        const { courseId, moduleId, topicId } = req.params;
        const teacherId = req.user.id;

        const course = await Course.findById(courseId);
        if (!course || course.author.toString() !== teacherId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Find module and topic to get resource list
        const moduleDoc = course.modules.id(moduleId);
        const topicDoc = moduleDoc?.topics.id(topicId);

        if (!topicDoc) return res.status(404).json({ error: 'Topic not found' });

        const progressRecords = await Progress.find({ course: courseId }).populate('student', 'name email');

        const analytics = progressRecords.map(p => {
            const topicCompleted = p.completedTopics.includes(topicId);

            // Calculate time spent on this topic's resources
            let timeSpent = 0;
            let resourcesCompleted = 0;

            topicDoc.resources.forEach(r => {
                const rp = p.resourceProgress.find(rp => rp.resourceId === r._id.toString());
                if (rp) {
                    timeSpent += (rp.timeSpent || 0);
                    if (rp.completed) resourcesCompleted++;
                }
            });

            return {
                studentId: p.student._id,
                name: p.student.name,
                email: p.student.email,
                timeSpent, // in seconds
                completed: topicCompleted,
                resourcesCompleted,
                totalResources: topicDoc.resources.length
            };
        });

        res.json({ topicTitle: topicDoc.title, analytics });

    } catch (error) {
        console.error("Error fetching topic analytics:", error);
        res.status(500).json({ error: 'Server error' });
    }
};