import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, BarChart, BookOpen, Trophy, Clock, LogOut, Home, Search, Bell, ChevronRight, Play, MessageSquare } from 'lucide-react';
import RoadmapTree from '../components/RoadmapTree';
import TopicDetailModal from '../components/TopicDetailModal';

const StudentDashboard = ({ user, profile, onLogout, fetchProfile }) => { // Assuming fetchProfile or similar triggers re-fetch
    const navigate = useNavigate();
    const [selectedTopic, setSelectedTopic] = useState(null); // { moduleId, topicId }
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
            {/* Modal */}
            {selectedTopic && (
                <TopicDetailModal
                    moduleId={selectedTopic.moduleId}
                    topicId={selectedTopic.topicId}
                    onClose={() => setSelectedTopic(null)}
                    onUpdate={() => {
                        fetchProfile(); // Refresh data without full reload
                    }}
                />
            )}

            {/* Sidebar */}
            <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-gray-800 border-r border-gray-700 hidden md:flex flex-col transition-all duration-300`}>
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    {!isSidebarCollapsed && (
                        <Link to="/">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 cursor-pointer hover:opacity-80 transition-opacity">
                                SkillBuddy
                            </h1>
                        </Link>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors ml-auto"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem icon={Home} label="Dashboard" active isCollapsed={isSidebarCollapsed} />
                    <NavItem icon={BookOpen} label="My Courses" to="/my-courses" isCollapsed={isSidebarCollapsed} />
                    <NavItem icon={MessageSquare} label="Doubt Resolution" to="/doubts" isCollapsed={isSidebarCollapsed} />
                    <NavItem icon={BarChart} label="Analytics" isCollapsed={isSidebarCollapsed} />
                    <NavItem icon={Trophy} label="Leaderboard" to="/leaderboard" isCollapsed={isSidebarCollapsed} />
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <button onClick={onLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} text-gray-400 hover:text-white w-full px-4 py-3 rounded-lg hover:bg-white/5 transition`}>
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-8 z-50 sticky top-0">
                    <div className="text-xl font-medium">
                        Welcome back, <span className="text-purple-400 font-bold">{user.name}</span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <button className="text-gray-400 hover:text-white"><Search className="w-5 h-5" /></button>
                        <button className="text-gray-400 hover:text-white"><Bell className="w-5 h-5" /></button>
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">
                            {user.name ? user.name[0] : 'U'}
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <StatCard title="Hours Studied" value={profile?.stats?.hoursStudied || 0} icon={Clock} color="text-blue-400" />
                        <StatCard title="Courses Completed" value={profile?.stats?.coursesCompleted || 0} icon={BookOpen} color="text-green-400" />
                        <StatCard title="Current Streak" value={`${profile?.streak || 0} Days`} icon={Trophy} color="text-yellow-400" />
                    </div>

                    {/* ... (inside StudentDashboard component) */}

                    <div className="bg-gray-800/30 rounded-3xl p-8 border border-gray-800/50 shadow-2xl relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-gray-900/0 to-transparent pointer-events-none"></div>

                        <h2 className="text-3xl font-bold mb-10 flex items-center justify-center relative z-10">
                            <BookOpen className="w-8 h-8 mr-3 text-purple-400" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Your Learning Journey</span>
                        </h2>

                        {profile?.currentPath ? (
                            <RoadmapTree
                                modules={profile.currentPath.modules}
                                onTopicClick={(moduleId, topicId) => setSelectedTopic({ moduleId, topicId })}
                            />
                        ) : (
                            <div className="text-center py-20 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                                <p className="text-gray-400 text-lg">No learning path generated yet.</p>
                                <button onClick={() => navigate('/onboarding')} className="mt-4 text-purple-400 font-bold hover:underline">Go to Onboarding</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon: Icon, label, active, to, isCollapsed }) => {
    const content = (
        <>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
        </>
    );

    const baseClass = `flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} w-full py-3 rounded-lg transition ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

    if (to) {
        return <Link to={to} className={baseClass} title={isCollapsed ? label : ''}>{content}</Link>;
    }

    return <button className={baseClass} title={isCollapsed ? label : ''}>{content}</button>;
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-gray-600 transition shadow-lg relative overflow-hidden group">
        <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full transition group-hover:scale-110`}></div>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-gray-700/50 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
);

export default StudentDashboard;
