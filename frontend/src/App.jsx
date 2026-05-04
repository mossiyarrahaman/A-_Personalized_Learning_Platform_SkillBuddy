import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy-load heavy pages to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const CourseView = lazy(() => import('./pages/CourseView'));
const Doubts = lazy(() => import('./pages/Doubts'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const ClassView = lazy(() => import('./pages/ClassView'));
const AIPathCurriculum = lazy(() => import('./pages/AIPathCurriculum'));
const StudentAnalytics = lazy(() => import('./pages/StudentAnalytics'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>
    Loading...
  </div>
);

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (roleRequired && user.role !== roleRequired) return <Navigate to="/dashboard" replace />;
  return children;
};

const NotFound = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', fontFamily: 'sans-serif' }}>
    <div style={{ fontSize: '64px', fontWeight: 700, color: '#555' }}>404</div>
    <div style={{ fontSize: '18px', color: '#888' }}>Page not found</div>
    <a href="/" style={{ color: '#7c6aff', textDecoration: 'none', fontSize: '14px' }}>Go home</a>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/onboarding" element={
              <ProtectedRoute><Onboarding /></ProtectedRoute>
            } />

            {/* Teacher Dashboard — teacher role required */}
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute roleRequired="teacher"><TeacherDashboard /></ProtectedRoute>
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
              <Route path="/ai-path/:pathId" element={<AIPathCurriculum />} />
              <Route path="/ai-course/module/:moduleId/topic/:topicId" element={<CourseView />} />
              <Route path="/profile" element={<ProfileSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;