'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Calendar, Flag, Users, UserPlus } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultVisibility?: 'team' | 'personal';
}

function NoTeamMembersPrompt() {
    const addSelf = useMutation(api.teamMembers.addCurrentUserAsTeamMember);
    const [isAdding, setIsAdding] = useState(false);
    const [added, setAdded] = useState(false);

    const handleAddSelf = async () => {
        setIsAdding(true);
        try {
            await addSelf({});
            setAdded(true);
        } catch (error) {
            console.error('Failed to add yourself:', error);
        } finally {
            setIsAdding(false);
        }
    };

    if (added) {
        return (
            <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">You&apos;re now a team member!</h3>
                <p className="text-sm text-gray-400 mb-4">Close and reopen this modal to create a task.</p>
            </div>
        );
    }

    return (
        <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F0FF7A]/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-[#F0FF7A]" />
            </div>
            <h3 className="font-semibold mb-2">No Team Members Yet</h3>
            <p className="text-sm text-gray-400 mb-4">You need to be a team member to create tasks.</p>
            <button
                onClick={handleAddSelf}
                disabled={isAdding}
                className="px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
                {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAdding ? 'Adding...' : 'Add Yourself to Team'}
            </button>
        </div>
    );
}

export function AddTaskModal({ isOpen, onClose, defaultVisibility = 'team' }: AddTaskModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const createTask = useMutation(api.tasks.create);
    const teamMembers = useQuery(api.teamMembers.list);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        dueDate: '',
        visibility: defaultVisibility,
        assigneeId: '' as string,
        tags: '',
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Set default assignee when team members load
    useEffect(() => {
        if (teamMembers && teamMembers.length > 0 && !formData.assigneeId) {
            setFormData(prev => ({ ...prev, assigneeId: teamMembers[0]._id }));
        }
    }, [teamMembers, formData.assigneeId]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.assigneeId) return;

        setIsSubmitting(true);
        try {
            await createTask({
                title: formData.title.trim(),
                description: formData.description.trim(),
                status: 'todo',
                priority: formData.priority,
                visibility: formData.visibility,
                ownerId: formData.assigneeId as Id<"teamMembers">,
                assigneeId: formData.assigneeId as Id<"teamMembers">,
                dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                dueDate: '',
                visibility: defaultVisibility,
                assigneeId: teamMembers?.[0]?._id || '',
                tags: '',
            });
            onClose();
        } catch (error) {
            console.error('Failed to create task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const noTeamMembers = teamMembers && teamMembers.length === 0;

    return (
        <div
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-lg overflow-hidden animate-scale-fade">
                <div className="p-5 border-b border-[#232323] flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Create New Task</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {noTeamMembers ? (
                    <NoTeamMembersPrompt />
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter task title..."
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter task description..."
                                rows={3}
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Flag className="w-4 h-4" />Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />Due Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Visibility</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, visibility: 'team' }))}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${formData.visibility === 'team' ? 'bg-[#F0FF7A] text-[#010101]' : 'bg-[#181818] text-gray-400 hover:text-white'}`}
                                >
                                    <Users className="w-4 h-4 inline mr-2" />Team
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, visibility: 'personal' }))}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${formData.visibility === 'personal' ? 'bg-[#F0FF7A] text-[#010101]' : 'bg-[#181818] text-gray-400 hover:text-white'}`}
                                >
                                    Personal
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Assign To</label>
                            <select
                                value={formData.assigneeId}
                                onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
                                required
                            >
                                {!formData.assigneeId && <option value="">Select assignee...</option>}
                                {teamMembers?.map((member) => (
                                    <option key={member._id} value={member._id}>
                                        {member.name} ({member.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tags (comma separated)</label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                placeholder="design, frontend, urgent..."
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#232323]">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[#181818] rounded-lg text-sm hover:bg-[#232323] transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.title.trim() || !formData.assigneeId}
                                className="px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSubmitting ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
