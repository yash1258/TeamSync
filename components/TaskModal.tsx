'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Calendar, Flag, User, Tag, Send, Trash2, Edit2, Save, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface TaskModalProps {
    taskId: Id<"tasks">;
    onClose: () => void;
    onDeleted?: () => void;
}

export function TaskModal({ taskId, onClose, onDeleted }: TaskModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const task = useQuery(api.tasks.getById, { id: taskId });
    const updateTask = useMutation(api.tasks.update);
    const deleteTask = useMutation(api.tasks.remove);
    const teamMembers = useQuery(api.teamMembers.list);

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editData, setEditData] = useState({
        title: '',
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        status: 'todo' as 'todo' | 'in-progress' | 'review' | 'done',
        dueDate: '',
        assigneeId: '' as string,
        tags: '',
    });

    useEffect(() => {
        if (task) {
            setEditData({
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                dueDate: task.dueDate,
                assigneeId: task.assigneeId,
                tags: task.tags.join(', '),
            });
        }
    }, [task]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateTask({
                id: taskId,
                title: editData.title,
                description: editData.description,
                priority: editData.priority,
                status: editData.status,
                dueDate: editData.dueDate,
                assigneeId: editData.assigneeId as Id<"teamMembers">,
                tags: editData.tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteTask({ id: taskId });
            onDeleted?.();
            onClose();
        } catch (error) {
            console.error('Failed to delete task:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'todo':
                return 'bg-gray-500/20 text-gray-400';
            case 'in-progress':
                return 'bg-blue-500/20 text-blue-400';
            case 'review':
                return 'bg-amber-500/20 text-amber-400';
            case 'done':
                return 'bg-green-500/20 text-green-400';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'todo':
                return 'To Do';
            case 'in-progress':
                return 'In Progress';
            case 'review':
                return 'Review';
            case 'done':
                return 'Done';
            default:
                return status;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-400';
            case 'medium':
                return 'text-amber-400';
            case 'low':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    // Loading state
    if (task === undefined) {
        return (
            <div
                ref={modalRef}
                onClick={handleBackdropClick}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
                </div>
            </div>
        );
    }

    if (task === null) {
        return (
            <div
                ref={modalRef}
                onClick={handleBackdropClick}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8 text-center">
                    <p className="text-gray-400">Task not found</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-[#181818] rounded-lg text-sm">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-fade">
                {/* Header */}
                <div className="p-5 border-b border-[#232323] flex items-start justify-between">
                    <div className="flex-1 pr-4">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editData.title}
                                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-xl font-semibold focus:outline-none focus:border-[#F0FF7A]"
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                        {task.priority} priority
                                    </span>
                                </div>
                                <h2 className="text-xl font-semibold">{task.title}</h2>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-3 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-[#181818] text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="p-4 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between">
                        <p className="text-sm text-red-400">Are you sure you want to delete this task?</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                                {isEditing ? (
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={4}
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#F0FF7A] resize-none"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-300 leading-relaxed">{task.description || 'No description'}</p>
                                )}
                            </div>

                            {/* Comments */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3">
                                    Comments ({task.comments?.length ?? 0})
                                </h3>

                                {(task.comments?.length ?? 0) > 0 ? (
                                    <div className="space-y-4">
                                        {task.comments?.map((comment: any) => (
                                            <div key={comment._id} className="flex gap-3">
                                                {comment.author?.avatar ? (
                                                    <img
                                                        src={comment.author.avatar}
                                                        alt={comment.author.name}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-[#181818] flex items-center justify-center text-xs">
                                                        {comment.author?.name?.[0] ?? '?'}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">{comment.author?.name ?? 'Unknown'}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(comment.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-300">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No comments yet</p>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-5">
                            {/* Status */}
                            {isEditing && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                                    <select
                                        value={editData.status}
                                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                            )}

                            {/* Priority */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Flag className="w-4 h-4" />
                                    Priority
                                </h3>
                                {isEditing ? (
                                    <select
                                        value={editData.priority}
                                        onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value as any }))}
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                ) : (
                                    <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    </span>
                                )}
                            </div>

                            {/* Assignee */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Assignee
                                </h3>
                                {isEditing ? (
                                    <select
                                        value={editData.assigneeId}
                                        onChange={(e) => setEditData(prev => ({ ...prev, assigneeId: e.target.value }))}
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                                    >
                                        {teamMembers?.map((member) => (
                                            <option key={member._id} value={member._id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 p-2 bg-[#181818] rounded-lg">
                                        {task.assignee?.avatar ? (
                                            <img
                                                src={task.assignee.avatar}
                                                alt={task.assignee.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#232323] flex items-center justify-center text-sm">
                                                {task.assignee?.name?.[0] ?? '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{task.assignee?.name ?? 'Unassigned'}</p>
                                            <p className="text-xs text-gray-500">{task.assignee?.role ?? ''}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Due Date */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Due Date
                                </h3>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={editData.dueDate}
                                        onChange={(e) => setEditData(prev => ({ ...prev, dueDate: e.target.value }))}
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                                    />
                                ) : (
                                    <p className="text-sm">{task.dueDate}</p>
                                )}
                            </div>

                            {/* Tags */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Tags
                                </h3>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.tags}
                                        onChange={(e) => setEditData(prev => ({ ...prev, tags: e.target.value }))}
                                        placeholder="design, frontend..."
                                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map((tag: string) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-[#181818] rounded text-xs text-gray-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {task.tags.length === 0 && <span className="text-sm text-gray-500">No tags</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#232323] flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Created {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                    {!isEditing && (
                        <button
                            onClick={() => {
                                updateTask({ id: taskId, status: 'done' });
                            }}
                            className="px-4 py-2 bg-[#181818] rounded-lg text-sm hover:bg-[#232323] transition-colors"
                        >
                            Mark Complete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
