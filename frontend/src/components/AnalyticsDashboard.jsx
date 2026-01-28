import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Loader } from 'lucide-react';
import api from '../api/axios';

const AnalyticsDashboard = ({ courses }) => {
    const [selectedCourse, setSelectedCourse] = useState(courses[0]?._id || '');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedCourse) {
            fetchAnalytics(selectedCourse);
        }
    }, [selectedCourse]);

    const fetchAnalytics = async (courseId) => {
        setLoading(true);
        try {
            const res = await api.get(`/courses/${courseId}/analytics`);
            setData(res.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (courses.length === 0) return <div className="text-gray-400">No courses available for analytics. Create a course first.</div>;

    return (
        <div className="space-y-6">
            {/* Context Selector */}
            <div className="flex items-center space-x-4 mb-6">
                <label className="text-gray-400">View Report For:</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                    {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-purple-400 animate-pulse">
                    <Loader className="w-8 h-8 mr-2 animate-spin" /> Loading Insight Data...
                </div>
            ) : data ? (
                <>
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="Enrolled Students" value={data.stats?.totalStudents || 0} />
                        <StatBox label="Active Learners" value={data.stats?.activeStudents || 0} color="text-green-400" />
                        <StatBox label="Avg. Class Progress" value={`${data.stats?.avgProgress || 0}%`} />
                        <StatBox label="Avg. Study Time" value={data.stats?.avgTimeSpent || '0h 0m'} color="text-blue-400" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Engagement Chart */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Weekly Engagement</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    {data.engagement && data.engagement.dates ? (
                                        <LineChart data={data.engagement.dates.map((date, i) => ({ date, active: data.engagement.active[i] }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="date" stroke="#9CA3AF" />
                                            <YAxis stroke="#9CA3AF" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                                            <Line type="monotone" dataKey="active" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6' }} />
                                        </LineChart>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">No engagement data</div>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Time Distribution Chart */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Study Time Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    {data.timeDistribution ? (
                                        <BarChart data={Object.entries(data.timeDistribution).map(([range, count]) => ({ range, count }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                                            <XAxis dataKey="range" stroke="#9CA3AF" />
                                            <YAxis stroke="#9CA3AF" />
                                            <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                                            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">No distribution data</div>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* AI Insight Card */}
                    <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6">
                        <h4 className="flex items-center text-purple-300 font-bold mb-2">
                            ✨ AI Insight
                        </h4>
                        <p className="text-gray-300">
                            Engagement has dropped by 15% this week compared to last week. Consider scheduling a live Q&A session or posting a new announcement to re-engage students.
                        </p>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-500 mt-10">Select a course to view analytics.</div>
            )}
        </div>
    );
};

const StatBox = ({ label, value, color = "text-white" }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);

export default AnalyticsDashboard;
