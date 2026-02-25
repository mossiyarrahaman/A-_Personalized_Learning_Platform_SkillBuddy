import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, BarChart, BookOpen, Trophy, LogOut, Home, MessageSquare } from 'lucide-react';

const Sidebar = ({ onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-800 border-r border-gray-700 hidden md:flex flex-col transition-all duration-300 h-screen sticky top-0`}>
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                {!isCollapsed && (
                    <Link to="/">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 cursor-pointer hover:opacity-80 transition-opacity">
                            SkillBuddy
                        </h1>
                    </Link>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors ml-auto"
                >
                    <Menu size={20} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <NavItem icon={Home} label="Dashboard" to="/dashboard" isActive={location.pathname === '/dashboard'} isCollapsed={isCollapsed} />
                <NavItem icon={BookOpen} label="My Courses" to="/my-courses" isActive={location.pathname.startsWith('/my-courses') || location.pathname.startsWith('/class/')} isCollapsed={isCollapsed} />
                <NavItem icon={MessageSquare} label="Doubt Resolution" to="/doubts" isActive={location.pathname === '/doubts'} isCollapsed={isCollapsed} />
                <NavItem icon={BarChart} label="Analytics" to="/analytics" isActive={location.pathname === '/analytics'} isCollapsed={isCollapsed} />
                <NavItem icon={Trophy} label="Leaderboard" to="/leaderboard" isActive={location.pathname === '/leaderboard'} isCollapsed={isCollapsed} />
            </nav>

            <div className="p-4 border-t border-gray-700">
                <button onClick={onLogout} className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} text-gray-400 hover:text-white w-full px-4 py-3 rounded-lg hover:bg-white/5 transition`}>
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
};

const NavItem = ({ icon: Icon, label, to, isCollapsed, isActive }) => {
    const content = (
        <>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
        </>
    );

    const baseClass = `flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} w-full py-3 rounded-lg transition ${isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

    if (to) {
        return <Link to={to} className={baseClass} title={isCollapsed ? label : ''}>{content}</Link>;
    }

    return <button className={baseClass} title={isCollapsed ? label : ''}>{content}</button>;
};

export default Sidebar;
