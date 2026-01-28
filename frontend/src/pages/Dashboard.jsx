import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

// Sub-dashboards
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const fetchProfile = async () => {
        try {
            if (user?.role === 'student') {
                const res = await api.get('/courses/dashboard');
                setProfile(res.data.profile);
            }
            // Teacher profile fetch logic here if needed
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin" />
        </div>
    );

    // If student has not completed onboarding, redirect
    if (user?.role === 'student' && (!profile?.onboarding?.completed)) {
        return <Navigate to="/onboarding" replace />;
    }

    if (user?.role === 'student') {
        return <StudentDashboard user={user} profile={profile} onLogout={logout} fetchProfile={fetchProfile} />;
    }

    if (user?.role === 'teacher') {
        return <TeacherDashboard user={user} onLogout={logout} />;
    }

    return <div className="text-white">Unknown Role</div>;
};

export default Dashboard;
