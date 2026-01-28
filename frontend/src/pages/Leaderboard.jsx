import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Medal, Star, Flame, Shield } from 'lucide-react';
import api from '../api/axios';

const Leaderboard = () => {
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [lbRes, mpRes] = await Promise.all([
                api.get('/gamification/leaderboard'),
                api.get('/gamification/my-stats')
            ]);
            setLeaderboard(lbRes.data.leaderboard);
            setStats(mpRes.data);
        } catch (error) {
            console.error("Failed to load leaderboard");
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 2: return <Medal className="w-6 h-6 text-gray-400" />;
            case 3: return <Medal className="w-6 h-6 text-orange-600" />;
            default: return <span className="text-gray-400 font-bold w-6 text-center">{rank}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <div className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-6 flex items-center sticky top-0 z-50">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-800 rounded-lg transition mr-4">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold flex items-center">
                    <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
                    Leaderboard
                </h1>
            </div>

            <div className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8">

                {/* Main Leaderboard */}
                <div className="flex-1">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm">
                            <h2 className="text-lg font-bold">Top Learners</h2>
                            <p className="text-sm text-gray-400">Competing for glory this week</p>
                        </div>
                        <div className="divide-y divide-gray-700">
                            {leaderboard.map((user) => (
                                <div key={user.rank} className={`flex items-center p-4 hover:bg-gray-700/50 transition ${user.isCurrentUser ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''}`}>
                                    <div className="w-12 flex justify-center flex-shrink-0">
                                        {getRankIcon(user.rank)}
                                    </div>
                                    <div className="flex-1 ml-4">
                                        <h3 className={`font-bold ${user.isCurrentUser ? 'text-purple-400' : 'text-gray-200'}`}>
                                            {user.name} {user.isCurrentUser && '(You)'}
                                        </h3>
                                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                                            <span className="flex items-center"><Flame className="w-3 h-3 mr-1 text-orange-500" /> {user.streak} day streak</span>
                                            <span>•</span>
                                            <span className="flex items-center"><Shield className="w-3 h-3 mr-1 text-blue-500" /> {user.badges} badges</span>
                                        </div>
                                    </div>
                                    <div className="text-right px-4">
                                        <div className="text-yellow-500 font-bold text-lg">{user.points}</div>
                                        <div className="text-xs text-gray-500">pts</div>
                                    </div>
                                </div>
                            ))}

                            {leaderboard.length === 0 && !loading && (
                                <div className="p-8 text-center text-gray-500">
                                    No active learners yet. Be the first!
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="w-full md:w-80 space-y-6">
                    {stats && (
                        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 rounded-2xl p-6 border border-purple-500/30">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg">Your Stats</h3>
                                <Star className="w-5 h-5 text-yellow-400" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-white mb-1">{stats.points}</div>
                                    <div className="text-xs text-purple-300 uppercase tracking-widest">Points</div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-white mb-1">{stats.level}</div>
                                    <div className="text-xs text-purple-300 uppercase tracking-widest">Level</div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-white mb-1">{stats.streak}</div>
                                    <div className="text-xs text-purple-300 uppercase tracking-widest">Streak</div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-white mb-1">{stats.badges.length}</div>
                                    <div className="text-xs text-purple-300 uppercase tracking-widest">Badges</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                        <h3 className="font-bold text-white mb-4">How to earn points?</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-center"><CheckPoint text="Complete a module" pts="100" /></li>
                            <li className="flex items-center"><CheckPoint text="Finish a quiz" pts="50" /></li>
                            <li className="flex items-center"><CheckPoint text="Daily login streak" pts="10" /></li>
                            <li className="flex items-center"><CheckPoint text="Help others (Answer doubts)" pts="20" /></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckPoint = ({ text, pts }) => (
    <div className="flex justify-between w-full">
        <span>{text}</span>
        <span className="text-yellow-500 font-bold">+{pts}</span>
    </div>
);

export default Leaderboard;
