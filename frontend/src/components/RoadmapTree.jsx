import React, { useEffect, useState } from 'react';
import { Check, Lock, Play, BookOpen, Map, ArrowDown } from 'lucide-react';

const RoadmapTree = ({ modules, onTopicClick, onTopicToggle }) => {

    // Helper to calculate status colors matching roadmap.sh theme
    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return {
                borderColor: '#22c55e', // Green
                bgColor: '#22c55e1a',
                textColor: '#22c55e',
                dotColor: '#22c55e'
            };
            case 'unlocked': return {
                borderColor: '#eab308', // Yellow
                bgColor: '#eab3081a',
                textColor: '#eab308',
                dotColor: '#eab308'
            };
            default: return {
                borderColor: '#4b5563', // Gray
                bgColor: '#1f293780',
                textColor: '#9ca3af',
                dotColor: '#4b5563'
            };
        }
    };

    return (
        <div className="w-full bg-[#101010] min-h-screen text-gray-200 font-sans pb-32">

            {/* Header Area */}
            <div className="bg-[#151515] border-b border-[#2a2a2a] py-12 px-4 mb-20 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"></div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                    Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Roadmap</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Follow this step-by-step path to master your skills.
                    Mark topics as done to track your progress.
                </p>
            </div>

            {/* Canvas */}
            <div className="relative max-w-4xl mx-auto px-6 md:px-0">

                {/* Global SVG Layer for Connectors */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                            <stop offset="10%" stopColor="#3b82f6" />
                            <stop offset="90%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Central Spine Line */}
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#262626" strokeWidth="4" />
                </svg>

                {modules.map((module, index) => {
                    const isLeft = index % 2 === 0;
                    const style = getStatusStyle(module.status);

                    return (
                        <div key={module.id} className={`relative mb-24 flex w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>

                            {/* Connector SVG: Module specific Curve */}
                            <svg className={`absolute top-0 w-1/2 h-full pointer-events-none ${isLeft ? 'left-0' : 'right-0'}`} style={{ left: isLeft ? '50%' : 'auto', right: !isLeft ? '50%' : 'auto' }}>
                                {/* Horizontal Arm */}
                                <path
                                    d={`M 0 32 L ${isLeft ? '40' : '-40'} 32`}
                                    fill="none"
                                    stroke={style.dotColor}
                                    strokeWidth="2"
                                    className="opacity-50"
                                />
                            </svg>

                            {/* Center Spine Dot */}
                            <div className="absolute left-1/2 top-8 transform -translate-x-1/2 -translate-y-1/2 z-10 p-1 bg-[#101010] rounded-full">
                                <div className={`w-4 h-4 rounded-full border-2 transition-colors duration-300`}
                                    style={{ borderColor: style.dotColor, backgroundColor: module.status === 'completed' ? style.dotColor : '#101010' }}>
                                </div>
                            </div>

                            {/* Node Content */}
                            <div className={`w-[calc(50%-40px)] ${isLeft ? 'mr-auto pr-8' : 'ml-auto pl-8 order-2'}`}>

                                <div className={`
                                    relative p-0.5 rounded-xl transition-all duration-300 group
                                    ${module.status === 'unlocked' ? 'hover:scale-[1.02]' : ''}
                                `}
                                    style={{ background: `linear-gradient(135deg, ${style.borderColor}, transparent)` }}
                                >
                                    <div className="bg-[#1a1a1a] rounded-[10px] p-6 h-full relative overflow-hidden">

                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                Week {index + 1}
                                            </span>
                                            {module.status === 'completed' && <Check className="w-4 h-4 text-green-500" />}
                                            {module.status === 'locked' && <Lock className="w-3 h-3 text-gray-600" />}
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">{module.title}</h3>
                                        <p className="text-sm text-gray-400 mb-6 line-clamp-2">{module.description}</p>

                                        {/* Interactive Topics List */}
                                        <div className="space-y-3">
                                            {module.topics.map((topic, tIdx) => (
                                                <div
                                                    key={tIdx}
                                                    className={`
                                                        w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all group/item
                                                        ${topic.status === 'completed'
                                                            ? 'bg-green-500/5 border-green-500/20'
                                                            : 'bg-[#222] border-[#333] hover:border-purple-500/30'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        {/* Checkbox */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onTopicToggle && onTopicToggle(module.id, topic.id, topic.status === 'completed' ? 'pending' : 'completed');
                                                            }}
                                                            className={`
                                                                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                                                                ${topic.status === 'completed'
                                                                    ? 'bg-green-500 border-green-500 text-black'
                                                                    : 'border-gray-500 hover:border-purple-400 text-transparent'
                                                                }
                                                            `}
                                                        >
                                                            <Check size={14} strokeWidth={3} />
                                                        </button>

                                                        {/* Title */}
                                                        <span
                                                            className={`text-sm font-medium cursor-pointer flex-1 ${topic.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-200'}`}
                                                            onClick={() => onTopicClick && onTopicClick(module.id, topic.id)}
                                                        >
                                                            {topic.title}
                                                        </span>
                                                    </div>

                                                    {/* Arrow */}
                                                    <ArrowDown
                                                        size={16}
                                                        className="text-gray-500 -rotate-90 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                                                        onClick={() => onTopicClick && onTopicClick(module.id, topic.id)}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}

                {/* End Marker */}
                <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full pt-8 flex flex-col items-center">
                    <div className="w-1 bg-[#262626] h-16 mb-4"></div>
                    <div className="px-6 py-2 border-2 border-[#262626] rounded-full text-gray-500 font-bold tracking-widest text-xs uppercase bg-[#101010]">
                        Goal Reached
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RoadmapTree;
