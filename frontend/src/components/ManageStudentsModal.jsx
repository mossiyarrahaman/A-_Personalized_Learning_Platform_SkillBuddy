
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Mail } from 'lucide-react';
import api from '../api/axios';

const ManageStudentsModal = ({ course, onClose, onUpdate }) => {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentsData, setStudentsData] = useState([]);

    // Fetch detailed student progress when modal opens
    useEffect(() => {
        const fetchStudentProgress = async () => {
            try {
                const response = await api.get(`/courses/${course._id}/analytics`);
                if (response.data.students) {
                    setStudentsData(response.data.students);
                }
            } catch (error) {
                console.error("Failed to fetch student progress", error);
            }
        };
        fetchStudentProgress();
    }, [course._id]); // Re-fetch if course changes


    const handleAddStudent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/courses/${course._id}/enroll`, { identifier });
            alert('Student added successfully');
            setIdentifier('');
            onUpdate(); // Trigger refresh of course data

            // Refresh local list
            const response = await api.get(`/courses/${course._id}/analytics`);
            if (response.data.students) {
                setStudentsData(response.data.students);
            }

        } catch (error) {
            alert(error.response?.data?.error || 'Failed to add student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 rounded-2xl w-full max-w-xl border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h3 className="text-xl font-bold text-white">Manage Students</h3>
                        <p className="text-sm text-gray-400">{course.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleAddStudent} className="mb-8">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Student Email or Username</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="student@example.com or username"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-50"
                            >
                                <UserPlus size={20} /> {loading ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </form>

                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                            Enrolled Students ({studentsData.length})
                        </h4>

                        <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {studentsData.length > 0 ? (
                                studentsData.map((student) => (
                                    <div key={student.studentId || student._id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-700 hover:border-gray-600 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs border border-purple-500/30">
                                                {student.name ? student.name[0] : 'S'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{student.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-400">{student.email}</div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="flex items-center gap-3 w-1/3">
                                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${student.percentage || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium w-8 text-right">{student.percentage || 0}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                                    No students enrolled yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageStudentsModal;
