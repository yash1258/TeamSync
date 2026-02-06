'use client';

import {
    LayoutDashboard,
    Kanban,
    Wallet,
    Users,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Settings,
    HelpCircle,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import { useAuthActions } from '@convex-dev/auth/react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Task Board', icon: Kanban },
    { href: '/budget', label: 'Budget', icon: Wallet },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, toggle } = useSidebar();
    const { signOut } = useAuthActions();

    const handleLogout = () => {
        void signOut();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-[#0B0B0B] border-r border-[#232323] z-50 transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'
                }`}
        >
            {/* Logo */}
            <div className="h-20 flex items-center justify-between px-4 border-b border-[#232323]">
                {isOpen ? (
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F0FF7A] flex items-center justify-center">
                            <span className="text-[#010101] font-bold text-sm">TS</span>
                        </div>
                        <span className="font-semibold text-lg">TeamSync</span>
                    </Link>
                ) : (
                    <Link href="/" className="w-8 h-8 rounded-lg bg-[#F0FF7A] flex items-center justify-center mx-auto">
                        <span className="text-[#010101] font-bold text-sm">TS</span>
                    </Link>
                )}

                <button
                    onClick={toggle}
                    className={`p-1.5 rounded-lg hover:bg-[#181818] transition-colors ${!isOpen && 'hidden'}`}
                >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Toggle button when collapsed */}
            {!isOpen && (
                <button
                    onClick={toggle}
                    className="absolute top-6 -right-3 w-6 h-6 bg-[#181818] border border-[#232323] rounded-full flex items-center justify-center hover:bg-[#232323] transition-colors"
                >
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                </button>
            )}

            {/* Navigation */}
            <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-[#F0FF7A] text-[#010101]'
                                : 'text-gray-400 hover:bg-[#181818] hover:text-white'
                                }`}
                            title={!isOpen ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#010101]' : 'text-gray-400 group-hover:text-white'}`} />
                            {isOpen && (
                                <span className={`font-medium ${isActive ? 'text-[#010101]' : ''}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#232323]">
                <Link
                    href="/settings"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all duration-200 ${!isOpen && 'justify-center'
                        }`}
                    title={!isOpen ? 'Settings' : undefined}
                >
                    <Settings className="w-5 h-5" />
                    {isOpen && <span className="font-medium">Settings</span>}
                </Link>

                <button
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all duration-200 mt-1 ${!isOpen && 'justify-center'
                        }`}
                    title={!isOpen ? 'Help' : undefined}
                >
                    <HelpCircle className="w-5 h-5" />
                    {isOpen && <span className="font-medium">Help</span>}
                </button>

                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 mt-1 ${!isOpen && 'justify-center'
                        }`}
                    title={!isOpen ? 'Logout' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {isOpen && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    );
}

