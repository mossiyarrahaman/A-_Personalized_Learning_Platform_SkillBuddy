import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Users, BookOpen, BarChart, LogOut, Home, Plus, MessageCircle, X, Edit, ListChecks } from 'lucide-react';
import api from '../api/axios';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import CurriculumBuilder from '../components/CurriculumBuilder';
import DoubtReplyModal from '../components/DoubtReplyModal';
import ManageStudentsModal from '../components/ManageStudentsModal';

const TeacherDashboard = ({ user, onLogout }) => {
    const [activeSection, setActiveSection] = useState('overview');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [stats, setStats] = useState({ students: 0, courses: 0, doubts: 0 });
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New State for Curriculum Builder
    const [editingCourse, setEditingCourse] = useState(null);

    // New State for Doubt Reply Modal
    const [replyingDoubt, setReplyingDoubt] = useState(null);
    const [managingStudentsCourse, setManagingStudentsCourse] = useState(null);

    // Initial Data Load
    useEffect(() => {
        fetchOverviewData();
    }, []);

    // Section Data Load
    useEffect(() => {
        if (activeSection === 'students') fetchStudents();
        if (activeSection === 'courses') fetchCourses();
        if (activeSection === 'doubts') fetchDoubts();
        // Analytics fetches its own data based on selection
    }, [activeSection]);

    const fetchOverviewData = async () => {
        try {
            const [studentsRes, coursesRes, doubtsRes] = await Promise.all([
                api.get('/auth/students'),
                api.get('/courses/teacher-courses'),
                api.get('/doubts/all')
            ]);
            setStats({
                students: studentsRes.data.students.length,
                courses: coursesRes.data.courses.length,
                doubts: doubtsRes.data.doubts.filter(d => d.status !== 'answered').length
            });
            // Update courses list for dropdowns if needed
            setCourses(coursesRes.data.courses);
        } catch (error) {
            console.error("Error fetching overview data:", error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/students');
            setStudents(res.data.students);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/courses/teacher-courses');
            setCourses(res.data.courses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDoubts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/doubts/all');
            setDoubts(res.data.doubts);
        } catch (error) {
            console.error("Error fetching doubts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            field: formData.get('field'),
            level: formData.get('level')
        };

        try {
            await api.post('/courses/create', data);
            setShowCreateModal(false);
            fetchCourses(); // Refresh courses
            fetchOverviewData(); // Refresh stats
            alert("Class created successfully!");
        } catch (error) {
            console.error("Error creating course:", error);
            const errorMsg = error.response?.data?.error || "Failed to create course. Please try again.";
            alert(errorMsg);
        }
    };

    const renderContent = () => {
        if (loading && activeSection !== 'analytics') return <div className="p-8 text-white">Loading...</div>;

        switch (activeSection) {
            case 'overview':
                return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard icon={Users} label="Total Students" value={stats.students} color="bg-blue-600" />
                            <StatCard icon={BookOpen} label="Active Courses" value={stats.courses} color="bg-purple-600" />
                            <StatCard icon={MessageCircle} label="Pending Doubts" value={stats.doubts} color="bg-pink-600" />
                        </div>

                        {/* Quick Analytics Preview */}
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">Class Performance Snapshot</h3>
                            <p className="text-gray-400 mb-4">Overview of one of your active courses.</p>
                            {/* Re-use Analytics component but simplified or just show full for now */}
                            {courses.length > 0 ? <AnalyticsDashboard courses={[courses[0]]} /> : <p className="text-gray-500">No courses to display analytics for.</p>}
                        </div>
                    </div>
                );
            case 'students':
                return (
                    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                        <table className="w-full text-left text-gray-300">
                            <thead className="bg-gray-700/50 uppercase text-xs font-semibold text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {students.map(student => (
                                    <tr key={student._id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                                        <td className="px-6 py-4">{student.email}</td>
                                        <td className="px-6 py-4 capitalize">{student.role}</td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'courses':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <div key={course._id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500/50 transition-colors group flex flex-col h-full">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-4">
                                        <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">{course.level}</span>
                                        <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-700 pt-4 mt-auto">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingCourse(course)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                                        >
                                            <ListChecks className="w-4 h-4" /> Curriculum
                                        </button>
                                        <button
                                            onClick={() => setManagingStudentsCourse(course)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                                        >
                                            <Users className="w-4 h-4" /> Students
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-purple-500 hover:bg-white/5 transition-all group min-h-[200px]"
                        >
                            <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Create New Course</span>
                        </button>
                    </div>
                );
            case 'doubts':
                return (
                    <div className="space-y-4">
                        {doubts.map(doubt => (
                            <div key={doubt._id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-white">{doubt.title}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${doubt.status === 'answered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {doubt.status}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">{doubt.description}</p>
                                <div className="text-xs text-gray-500">
                                    Current Answers: {doubt.answers.length}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                                    <button
                                        onClick={() => setReplyingDoubt(doubt)}
                                        className="text-sm text-purple-400 hover:text-purple-300 font-medium bg-purple-500/10 px-4 py-2 rounded-lg"
                                    >
                                        Reply to Doubt
                                    </button>
                                </div>
                            </div>
                        ))}
                        {doubts.length === 0 && (
                            <div className="text-center text-gray-500 mt-10">No doubts raised yet.</div>
                        )}
                    </div>
                );
            case 'analytics':
                return (
                    // Now using the Real Component
                    <div className="bg-gray-900 rounded-xl">
                        <AnalyticsDashboard courses={courses} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-gray-800 border-r border-gray-700 hidden md:flex flex-col transition-all duration-300`}>
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    {!isSidebarCollapsed && (
                        <div>
                            <Link to="/" className="block group">
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 group-hover:opacity-80 transition-opacity">
                                    SkillBuddy
                                </h1>
                            </Link>
                            <span className="text-xs text-purple-400 uppercase tracking-wider font-bold mt-1 block">Instructor</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors ml-auto"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem
                        icon={Home}
                        label="Overview"
                        active={activeSection === 'overview'}
                        onClick={() => setActiveSection('overview')}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={Users}
                        label="Students"
                        active={activeSection === 'students'}
                        onClick={() => setActiveSection('students')}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={BookOpen}
                        label="Courses"
                        active={activeSection === 'courses'}
                        onClick={() => setActiveSection('courses')}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={MessageCircle}
                        label="Doubts"
                        active={activeSection === 'doubts'}
                        onClick={() => setActiveSection('doubts')}
                        isCollapsed={isSidebarCollapsed}
                    />
                    <NavItem
                        icon={BarChart}
                        label="Analytics"
                        active={activeSection === 'analytics'}
                        onClick={() => setActiveSection('analytics')}
                        isCollapsed={isSidebarCollapsed}
                    />
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <button onClick={onLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} text-gray-400 hover:text-white w-full px-4 py-3 rounded-lg hover:bg-white/5 transition`}>
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-8 z-50 sticky top-0">
                    <div className="text-xl font-medium">Hello, {user.name}</div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Plus className="w-4 h-4" /> Create Class
                    </button>
                </header>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-white mb-6 capitalize">{activeSection}</h2>
                    {renderContent()}
                </div>

                {/* Create Class Modal */}
                {showCreateModal && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Create New Class</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Class Title</label>
                                    <input required name="title" type="text" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" placeholder="e.g. Advanced React Patterns" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Field</label>
                                    <select name="field" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="Frontend">Frontend Development</option>
                                        <option value="Backend">Backend Development</option>
                                        <option value="Fullstack">Fullstack Development</option>
                                        <option value="DevOps">DevOps</option>
                                        <option value="Data Science">Data Science</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Level</label>
                                    <select name="level" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                    <textarea required name="description" rows="3" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="What will students learn?"></textarea>
                                </div>
                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-purple-900/20">
                                    Create Class
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Curriculum Builder Overlay */}
                {editingCourse && (
                    <CurriculumBuilder
                        courseId={editingCourse._id}
                        initialModules={editingCourse.modules}
                        initialSyllabus={editingCourse.syllabus}
                        initialTitle={editingCourse.title}
                        initialDescription={editingCourse.description}
                        onClose={() => setEditingCourse(null)}
                        onSave={() => {
                            setEditingCourse(null);
                            fetchCourses();
                        }}
                    />
                )}
                {/* Doubt Reply Modal - NEW */}
                {replyingDoubt && (
                    <DoubtReplyModal
                        doubt={replyingDoubt}
                        onClose={() => setReplyingDoubt(null)}
                        onReplySuccess={() => {
                            fetchDoubts(); // Refresh doubts list
                            fetchOverviewData(); // Refresh stats
                        }}
                    />
                )}

                {/* Manage Students Modal */}
                {managingStudentsCourse && (
                    <ManageStudentsModal
                        course={managingStudentsCourse}
                        onClose={() => setManagingStudentsCourse(null)}
                        onUpdate={() => {
                            fetchCourses();
                            // Optional: Close modal or keep open. If keep open, we need to update managingStudentsCourse 
                            // to reflect new student list. For now, let's close it to ensure state sync.
                            setManagingStudentsCourse(null);
                        }}
                    />
                )}
            </main>
        </div>
    );
};

const NavItem = ({ icon: Icon, label, active, onClick, isCollapsed }) => (
    <button
        onClick={onClick}
        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} w-full py-3 rounded-lg transition-all duration-200 ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        title={isCollapsed ? label : ''}
    >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
    </button>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-20 text-white`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{label}</p>
            <h4 className="text-2xl font-bold text-white">{value}</h4>
        </div>
    </div>
);

export default TeacherDashboard;

