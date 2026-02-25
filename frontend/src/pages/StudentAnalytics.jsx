import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Clock, BookOpen, Trophy, Brain, Target, Flame } from 'lucide-react';
import api from '../api/axios';

const StudentAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/gamification/my-stats'); // Reuse existing stats endpoint or create new
            // We might need a dedicated analytics endpoint. Let's try to fetch enrollment data too.
            const coursesRes = await api.get('/courses/student/enrolled-classes');

            // derive analytics from courses
            const courses = coursesRes.data.classes;

            // Calculate total time
            const totalHours = courses.reduce((acc, c) => {
                // sum up resource progress time
                // This logic might be complex if not pre-calculated.
                // Let's use the profile stats we updated earlier if available in /my-stats
                return acc;
            }, 0);

            setData({
                stats: res.data, // points, badges, streak, level
                courses: courses
            });
        } catch (error) {
            console.error("Analytics fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Analytics...</div>;

    // Process Data for Charts
    const progressData = data?.courses.map(c => ({
        name: c.title,
        progress: (c.studentProgress.completedTopics.length / (c.modules.reduce((a, m) => a + m.topics.length, 0) || 1)) * 100
    })) || [];

    const quizData = data?.courses.reduce((acc, c) => {
        // We verify if studentProgress has topicQuizScores. 
        // If updateClassProgress stored them in Progress model, they should be here.
        // Wait, getEnrolledClasses returns `completedTopics` but maybe not full `topicQuizScores`.
        // We might need to update `getEnrolledClasses` to return quiz scores too.
        return acc;
    }, []) || [];

    return (
        <div className="flex flex-col h-full w-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-700 bg-gray-900 text-gray-100">
            <h1 className="text-3xl font-bold mb-8 flex items-center">
                <BarChart className="w-8 h-8 mr-3 text-purple-500" />
                My Learning Analytics
            </h1>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total XP" value={data?.stats?.points || 0} icon={Trophy} color="text-yellow-400" />
                <StatCard title="Current Streak" value={`${data?.stats?.streak || 0} Days`} icon={Flame} color="text-orange-500" />
                <StatCard title="Badges Earned" value={data?.stats?.badges?.length || 0} icon={Target} color="text-pink-500" />
                <StatCard title="Level" value={data?.stats?.level || 1} icon={Brain} color="text-blue-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Course Progress Chart */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
                    <h2 className="text-xl font-bold mb-6">Course Progress</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                                <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
                                <YAxis dataKey="name" type="category" width={100} stroke="#9CA3AF" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                                <Bar dataKey="progress" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Time Studied Placeholder (Requires History Data) */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
                    <h2 className="text-xl font-bold mb-6">Study Activity (Hours)</h2>
                    <div className="h-64 w-full flex items-center justify-center text-gray-500">
                        {/* 
                            TODO: Backend needs to store daily activity logs to visualize this graph.
                            For now, showing total hours from profile stats.
                         */}
                        <div className="text-center">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-lg">Total Hours Studied</p>
                            <p className="text-4xl font-bold text-white mt-2">
                                {/* Assuming we updated profile.stats.hoursStudied in courseController */}
                                {(data?.stats?.hoursStudied || 0).toFixed(1)}h
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quiz Analysis Section */}
            <div className="mt-8 bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
                <h2 className="text-xl font-bold mb-6">Quiz Performance</h2>
                {/* 
                    We need to fetch quiz scores to display this. 
                    Currently updating getEnrolledClasses to include quiz scores.
                 */}
                <div className="text-center text-gray-400 py-8">
                    Detailed quiz analysis coming soon.
                </div>
            </div>

        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className={`text-2xl font-bold text-white`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-full bg-gray-700/50 ${color}`}>
            <Icon size={24} />
        </div>
    </div>
);

export default StudentAnalytics;
