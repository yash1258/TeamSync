'use client';

import {
    LayoutDashboard,
    Kanban,
    Wallet,
    Users,
    Calendar,
    FileText,
    ChevronLeft,
    ChevronRight,
    Settings,
    HelpCircle,
    LogOut,
    Loader2
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import { useAuthActions } from '@convex-dev/auth/react';
import { useTaskModal } from './TaskModalContext';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Task Board', icon: Kanban },
    { href: '/budget', label: 'Budget', icon: Wallet },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/docs', label: 'Docs', icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isOpen, toggle } = useSidebar();
    const { closeTask } = useTaskModal();
    const { signOut } = useAuthActions();
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        navItems.forEach((item) => router.prefetch(item.href));
        router.prefetch('/settings');
    }, [router]);

    const handleLogout = () => {
        void signOut();
    };

    const navigateTo = (href: string) => {
        if (pathname === href) return;
        closeTask();
        setPendingPath(href);
        startTransition(() => {
            router.push(href);
        });
    };

    const isNavigatingTo = (href: string) => isPending && pendingPath === href;

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-[#0B0B0B] border-r border-[#232323] z-[60] transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'
                }`}
        >
            {/* Logo */}
            <div className="h-20 flex items-center justify-between px-4 border-b border-[#232323]">
                {isOpen ? (
                    <button type="button" onClick={() => navigateTo('/')} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F0FF7A] flex items-center justify-center">
                            <span className="text-[#010101] font-bold text-sm">TS</span>
                        </div>
                        <span className="font-semibold text-lg">TeamSync</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigateTo('/')}
                        className="w-8 h-8 rounded-lg bg-[#F0FF7A] flex items-center justify-center mx-auto"
                    >
                        <span className="text-[#010101] font-bold text-sm">TS</span>
                    </button>
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
                    const isNavigating = isNavigatingTo(item.href);

                    return (
                        <button
                            type="button"
                            key={item.href}
                            onClick={() => navigateTo(item.href)}
                            disabled={isNavigating}
                            aria-busy={isNavigating}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-[#F0FF7A] text-[#010101]'
                                : 'text-gray-400 hover:bg-[#181818] hover:text-white'
                                } ${isNavigating ? 'opacity-80 cursor-wait' : ''}`}
                            title={!isOpen ? item.label : undefined}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-[#010101]' : 'text-gray-400 group-hover:text-white'}`} />
                            {isOpen && (
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isActive ? 'text-[#010101]' : ''}`}>
                                        {item.label}
                                    </span>
                                    {isNavigating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#232323]">
                <button
                    type="button"
                    onClick={() => navigateTo('/settings')}
                    disabled={isNavigatingTo('/settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#181818] hover:text-white transition-all duration-200 ${!isOpen && 'justify-center'
                        } ${isNavigatingTo('/settings') ? 'opacity-80 cursor-wait' : ''}`}
                    title={!isOpen ? 'Settings' : undefined}
                >
                    <Settings className="w-5 h-5" />
                    {isOpen && <span className="font-medium">Settings</span>}
                </button>

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
