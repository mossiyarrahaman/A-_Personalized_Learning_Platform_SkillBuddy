import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import CourseView from './pages/CourseView';
import Doubts from './pages/Doubts';
import Leaderboard from './pages/Leaderboard';
import MyCourses from './pages/MyCourses';
import ClassView from './pages/ClassView';
import AIPathCurriculum from './pages/AIPathCurriculum';
import DashboardLayout from './layouts/DashboardLayout';
import StudentAnalytics from './pages/StudentAnalytics';
import ProfileSettings from './pages/ProfileSettings'; // ← ADD THIS

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* Main App with Sidebar Layout */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/course/:moduleId/topic/:topicId" element={<CourseView />} />
            <Route path="/doubts" element={<Doubts />} />
            <Route path="/analytics" element={<StudentAnalytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/class/:courseId" element={<ClassView />} />
            <Route path="/ai-path" element={<AIPathCurriculum />} />
            <Route path="/ai-course/module/:moduleId/topic/:topicId" element={<CourseView />} />
            <Route path="/profile" element={<ProfileSettings />} /> {/* ← ADD THIS */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;