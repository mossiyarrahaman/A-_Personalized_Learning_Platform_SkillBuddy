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

          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />
          <Route path="/course/:moduleId/topic/:topicId" element={
            <ProtectedRoute><CourseView /></ProtectedRoute>
          } />
          <Route path="/doubts" element={
            <ProtectedRoute><Doubts /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><Leaderboard /></ProtectedRoute>
          } />

          {/* New Routes for Separated Flow */}
          <Route path="/my-courses" element={
            <ProtectedRoute><MyCourses /></ProtectedRoute>
          } />
          <Route path="/class/:courseId" element={
            <ProtectedRoute><ClassView /></ProtectedRoute>
          } />

          {/* Detailed Curriculum View for AI Path */}
          <Route path="/ai-path" element={
            <ProtectedRoute><AIPathCurriculum /></ProtectedRoute>
          } />

          {/* AI Path Viewer (alias to CourseView) */}
          <Route path="/ai-course/module/:moduleId/topic/:topicId" element={
            <ProtectedRoute><CourseView /></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;