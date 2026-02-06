'use client';

import { Bell, Search, Plus, MessageSquare, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/convex/_generated/api';

interface HeaderProps {
    scrolled: boolean;
}

export function Header({ scrolled }: HeaderProps) {
    const [showSearch, setShowSearch] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { signOut } = useAuthActions();

    // Get current user from Convex
    const user = useQuery(api.users.currentUser);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileClick = () => {
        setShowProfileMenu(false);
        router.push('/profile');
    };

    const handleSettingsClick = () => {
        setShowProfileMenu(false);
        router.push('/settings');
    };

    const handleLogout = () => {
        setShowProfileMenu(false);
        void signOut();
    };

    // Extract user display info
    const userName = user?.name || 'User';
    const userEmail = user?.email || '';
    const userImage = user?.image || null;

    // Get initials for fallback avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header
            className={`fixed top-0 right-0 left-0 z-40 transition-all duration-300 ${scrolled
                ? 'bg-[#010101]/80 backdrop-blur-xl border-b border-[#232323]'
                : 'bg-transparent'
                }`}
            style={{ marginLeft: 'inherit' }}
        >
            <div className="h-20 px-6 flex items-center justify-between">
                {/* Search */}
                <div className="flex items-center gap-4">
                    <div className={`relative transition-all duration-300 ${showSearch ? 'w-80' : 'w-64'}`}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search tasks, projects, team..."
                            className="w-full bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
                            onFocus={() => setShowSearch(true)}
                            onBlur={() => setShowSearch(false)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200">
                        <Plus className="w-4 h-4" />
                        <span>New Task</span>
                    </button>

                    <button className="relative p-2.5 rounded-lg bg-[#181818] border border-[#232323] text-gray-400 hover:text-white hover:border-[#333] transition-all duration-200">
                        <MessageSquare className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F0FF7A] text-[#010101] text-xs font-bold rounded-full flex items-center justify-center">
                            3
                        </span>
                    </button>

                    <button className="relative p-2.5 rounded-lg bg-[#181818] border border-[#232323] text-gray-400 hover:text-white hover:border-[#333] transition-all duration-200">
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            5
                        </span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 ml-2 pl-4 border-l border-[#232323] hover:opacity-80 transition-opacity"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{userName}</p>
                                <p className="text-xs text-gray-500 truncate max-w-32">{userEmail}</p>
                            </div>
                            <div className="relative">
                                {userImage ? (
                                    <img
                                        src={userImage}
                                        alt={userName}
                                        className="w-10 h-10 rounded-full border-2 border-[#232323] object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full border-2 border-[#232323] bg-[#F0FF7A] flex items-center justify-center">
                                        <span className="text-[#010101] font-bold text-sm">{getInitials(userName)}</span>
                                    </div>
                                )}
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#010101] rounded-full" />
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0B0B0B] border border-[#232323] rounded-xl shadow-xl overflow-hidden animate-fade-slide-up z-50">
                                {/* User Info */}
                                <div className="p-4 border-b border-[#232323]">
                                    <p className="font-medium">{userName}</p>
                                    <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                                </div>

                                {/* Menu Items */}
                                <div className="p-2">
                                    <button
                                        onClick={handleProfileClick}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all text-left"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="text-sm">My Profile</span>
                                    </button>
                                    <button
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all text-left"
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span className="text-sm">Settings</span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[#232323]" />

                                {/* Logout */}
                                <div className="p-2">
                                    <button
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
        </header>
    );
}
