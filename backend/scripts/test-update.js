const mongoose = require('mongoose');
const Course = require('../models/Course');
const dotenv = require('dotenv');

dotenv.config();

const runTest = async () => {
    try {
        console.log("Connecting to DB...");
        // Assuming local mongo or env var
        await mongoose.connect('mongodb://127.0.0.1:27017/skillbuddy', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected.");

        // 1. Create Dummy Course
        const newCourse = new Course({
            title: "Original Title",
            description: "Original Description",
            author: new mongoose.Types.ObjectId(), // Fake ID
            modules: []
        });
        const saved = await newCourse.save();
        console.log("Created Course:", saved._id, saved.title);

        // 2. Simulate Update
        console.log("Updating Course...");
        const updateData = {
            title: "Updated Title",
            description: "Updated Description",
            modules: saved.modules
        };

        // Reuse logic from controller manually
        const course = await Course.findById(saved._id);
        if (updateData.title) course.title = updateData.title;
        if (updateData.description) course.description = updateData.description;
        await course.save();

        // 3. Verify
        const updated = await Course.findById(saved._id);
        console.log("Updated Course Title:", updated.title);
        console.log("Match?", updated.title === "Updated Title");

        // Cleanup
        await Course.findByIdAndDelete(saved._id);
        console.log("Cleanup done.");
        process.exit(0);

    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
};

runTest();
