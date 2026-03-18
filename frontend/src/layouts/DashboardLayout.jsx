import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useAuth();

    if (user?.role === 'teacher') {
        return <Outlet />;
    }

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
            <Sidebar onLogout={logout} />
            {/* ✅ FIX: was "h-screen overflow-hidden" — that trapped all page scroll.
                Now the inner div scrolls, and pages inside can grow naturally. */}
            <div className="flex-1 overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default DashboardLayout;
