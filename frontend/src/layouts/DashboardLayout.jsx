import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useAuth();

    // If teacher, bypass this layout because TeacherDashboard has its own internal layout/sidebar
    if (user?.role === 'teacher') {
        return <Outlet />;
    }

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
            <Sidebar onLogout={logout} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Outlet />
            </div>
        </div>
    );
};

export default DashboardLayout;
