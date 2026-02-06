'use client';

import {
    Bell,
    Search,
    Plus,
    MessageSquare,
    User,
    Settings,
    LogOut,
    ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/convex/_generated/api';
import { AddTaskModal } from './AddTaskModal';

interface HeaderProps {
    scrolled: boolean;
}

export function Header({ scrolled }: HeaderProps) {
    const searchParams = useSearchParams();
    const [showSearch, setShowSearch] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [activeMenu, setActiveMenu] = useState<'messages' | 'notifications' | 'profile' | null>(null);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
    const menuRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const { signOut } = useAuthActions();

    // Get live header data from Convex
    const user = useQuery(api.users.currentUser);
    const dashboardStats = useQuery(api.dashboard.getStats);
    const activityLog = useQuery(api.dashboard.getActivity, { limit: 6 }) ?? [];
    const dueTasks = useQuery(api.dashboard.getDueTasks, { limit: 6 }) ?? [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openTasksWithSearch = (query: string) => {
        const trimmed = query.trim();
        router.push(trimmed ? `/tasks?q=${encodeURIComponent(trimmed)}` : '/tasks');
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        openTasksWithSearch(searchQuery);
    };

    const closeMenusAndNavigate = (path: string) => {
        setActiveMenu(null);
        router.push(path);
    };

    const handleProfileClick = () => {
        closeMenusAndNavigate('/profile');
    };

    const handleSettingsClick = () => {
        closeMenusAndNavigate('/settings');
    };

    const handleLogout = () => {
        setActiveMenu(null);
        void signOut();
    };

    // Extract user display info
    const userName = user?.name || 'User';
    const userEmail = user?.email || '';
    const userImage = user?.image || null;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatActivityTime = (timestamp: number) =>
        new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const messageCount = activityLog.length;
    const notificationCount = (dashboardStats?.overdue ?? 0) + (dashboardStats?.dueSoon ?? 0);

    return (
        <>
            <header
                className={`fixed top-0 right-0 left-0 z-40 transition-all duration-300 ${scrolled
                    ? 'bg-[#010101]/80 backdrop-blur-xl border-b border-[#232323]'
                    : 'bg-transparent'
                    }`}
                style={{ marginLeft: 'inherit' }}
            >
                <div className="h-20 px-4 md:px-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => setShowMobileSearch((prev) => !prev)}
                            className="sm:hidden p-2.5 rounded-lg bg-[#181818] border border-[#232323] text-gray-400 hover:text-white hover:border-[#333] transition-all duration-200"
                            aria-label="Toggle search"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        <form
                            onSubmit={handleSearchSubmit}
                            className={`relative hidden sm:block transition-all duration-300 ${showSearch ? 'w-80' : 'w-56 lg:w-72'}`}
                        >
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tasks and jump to Task Board..."
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
                                onFocus={() => setShowSearch(true)}
                                onBlur={() => setShowSearch(false)}
                            />
                        </form>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setShowAddTaskModal(true)}
                            className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-3 md:px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">New Task</span>
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActiveMenu(activeMenu === 'messages' ? null : 'messages')}
                                className="relative p-2.5 rounded-lg bg-[#181818] border border-[#232323] text-gray-400 hover:text-white hover:border-[#333] transition-all duration-200"
                                aria-label="Open team activity"
                            >
                                <MessageSquare className="w-5 h-5" />
                                {messageCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#F0FF7A] text-[#010101] text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {messageCount}
                                    </span>
                                )}
                            </button>

                            {activeMenu === 'messages' && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-[#0B0B0B] border border-[#232323] rounded-xl shadow-xl overflow-hidden animate-fade-slide-up z-[70]">
                                    <div className="p-4 border-b border-[#232323] flex items-center justify-between">
                                        <p className="font-medium">Team Activity</p>
                                        <button
                                            type="button"
                                            onClick={() => closeMenusAndNavigate('/team')}
                                            className="text-xs text-[#F0FF7A] hover:underline"
                                        >
                                            Open Team
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {activityLog.length === 0 ? (
                                            <p className="text-sm text-gray-500 p-4">No activity yet</p>
                                        ) : (
                                            activityLog.map((activity) => (
                                                <button
                                                    key={activity._id}
                                                    type="button"
                                                    onClick={() => closeMenusAndNavigate('/team')}
                                                    className="w-full text-left px-4 py-3 border-b border-[#181818] hover:bg-[#181818] transition-colors"
                                                >
                                                    <p className="text-sm leading-relaxed">
                                                        <span className="text-white font-medium">{activity.userName}</span>{' '}
                                                        <span className="text-gray-400">{activity.action}</span>{' '}
                                                        <span className="text-[#F0FF7A]">{activity.target}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{formatActivityTime(activity.createdAt)}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActiveMenu(activeMenu === 'notifications' ? null : 'notifications')}
                                className="relative p-2.5 rounded-lg bg-[#181818] border border-[#232323] text-gray-400 hover:text-white hover:border-[#333] transition-all duration-200"
                                aria-label="Open task alerts"
                            >
                                <Bell className="w-5 h-5" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {notificationCount}
                                    </span>
                                )}
                            </button>

                            {activeMenu === 'notifications' && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-[#0B0B0B] border border-[#232323] rounded-xl shadow-xl overflow-hidden animate-fade-slide-up z-[70]">
                                    <div className="p-4 border-b border-[#232323] flex items-center justify-between">
                                        <p className="font-medium">Task Alerts</p>
                                        <button
                                            type="button"
                                            onClick={() => closeMenusAndNavigate('/tasks')}
                                            className="text-xs text-[#F0FF7A] hover:underline"
                                        >
                                            Open Tasks
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {dueTasks.length === 0 ? (
                                            <p className="text-sm text-gray-500 p-4">No due tasks in the next 7 days.</p>
                                        ) : (
                                            dueTasks.map((task) => (
                                                <button
                                                    key={task._id}
                                                    type="button"
                                                    onClick={() => closeMenusAndNavigate('/tasks')}
                                                    className="w-full text-left px-4 py-3 border-b border-[#181818] hover:bg-[#181818] transition-colors"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium text-white truncate">{task.title}</p>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded ${task.isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {task.isOverdue ? 'Overdue' : 'Due Soon'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {task.dueDate} • {task.assigneeName}
                                                    </p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setActiveMenu(activeMenu === 'profile' ? null : 'profile')}
                                className="flex items-center gap-2 md:gap-3 ml-1 md:ml-2 pl-2 md:pl-4 border-l border-[#232323] hover:opacity-80 transition-opacity"
                            >
                                <div className="text-right hidden lg:block">
                                    <p className="text-sm font-medium text-white">{userName}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-32">{userEmail}</p>
                                </div>
                                <div className="relative">
                                    {userImage ? (
                                        <img
                                            src={userImage}
                                            alt={userName}
                                            className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-[#232323] object-cover"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-[#232323] bg-[#F0FF7A] flex items-center justify-center">
                                            <span className="text-[#010101] font-bold text-xs md:text-sm">{getInitials(userName)}</span>
                                        </div>
                                    )}
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#010101] rounded-full" />
                                </div>
                                <ChevronDown className={`hidden md:block w-4 h-4 text-gray-500 transition-transform ${activeMenu === 'profile' ? 'rotate-180' : ''}`} />
                            </button>

                            {activeMenu === 'profile' && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[#0B0B0B] border border-[#232323] rounded-xl shadow-xl overflow-hidden animate-fade-slide-up z-[70]">
                                    <div className="p-4 border-b border-[#232323]">
                                        <p className="font-medium">{userName}</p>
                                        <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            type="button"
                                            onClick={handleProfileClick}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all text-left"
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="text-sm">My Profile</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSettingsClick}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all text-left"
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span className="text-sm">Settings</span>
                                        </button>
                                    </div>
                                    <div className="border-t border-[#232323]" />
                                    <div className="p-2">
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm">Logout</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showMobileSearch && (
                    <div className="sm:hidden px-4 pb-3">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
                            />
                        </form>
                    </div>
                )}
            </header>

            <AddTaskModal
                isOpen={showAddTaskModal}
                onClose={() => setShowAddTaskModal(false)}
                defaultVisibility="team"
            />
        </>
    );
}
