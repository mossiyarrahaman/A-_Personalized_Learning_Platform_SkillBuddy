import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Plus, Send, User, Bot } from 'lucide-react';
import api from '../api/axios';

const Doubts = () => {
    const navigate = useNavigate();
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDoubt, setNewDoubt] = useState({ title: '', description: '', tags: '' });
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchDoubts();
    }, []);

    const fetchDoubts = async () => {
        try {
            const res = await api.get('/doubts/my');
            setDoubts(res.data.doubts);
        } catch (error) {
            console.error("Failed to fetch doubts");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/doubts', {
                ...newDoubt,
                tags: newDoubt.tags.split(',').map(t => t.trim())
            });
            setNewDoubt({ title: '', description: '', tags: '' });
            setShowForm(false);
            fetchDoubts(); // Refresh
        } catch (error) {
            alert('Failed to post doubt');
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-900 text-gray-100 font-sans">
            <div className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-6 flex items-center justify-between z-50 shrink-0">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-800 rounded-lg transition">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Doubt Resolution</h1>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-lg shadow-purple-900/20">
                    {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> <span>Ask Question</span></>}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 w-full mb-8">
                <div className="max-w-4xl mx-auto">
                    {showForm && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 animate-fade-in">
                            <h2 className="text-lg font-bold mb-4">Ask a Question</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <input type="text" value={newDoubt.title} onChange={e => setNewDoubt({ ...newDoubt, title: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" required placeholder="e.g. How does useEffect work?" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                    <textarea value={newDoubt.description} onChange={e => setNewDoubt({ ...newDoubt, description: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-32" required placeholder="Describe your doubt in detail..." />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Tags (comma separated)</label>
                                    <input type="text" value={newDoubt.tags} onChange={e => setNewDoubt({ ...newDoubt, tags: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="react, hooks, javascript" />
                                </div>
                                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition flex items-center">
                                    <Send className="w-4 h-4 mr-2" /> Post Doubt
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-6">
                        {doubts.map(doubt => (
                            <div key={doubt._id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">{doubt.title}</h3>
                                            <div className="flex space-x-2 mb-4">
                                                {doubt.tags.map((tag, i) => (
                                                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md">#{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${doubt.status === 'answered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {doubt.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mb-6">{doubt.description}</p>

                                    {doubt.answers?.length > 0 && (
                                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center space-x-2 mb-2 text-purple-400">
                                                <Bot className="w-4 h-4" />
                                                <span className="font-bold text-sm">AI Assistant</span>
                                            </div>
                                            <p className="text-gray-300 text-sm">{doubt.answers[0].content}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {doubts.length === 0 && !loading && (
                            <div className="text-center py-10 text-gray-500">
                                No doubts asked yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Doubts;
