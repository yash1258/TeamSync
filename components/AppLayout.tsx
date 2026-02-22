'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskModal } from './TaskModal';
import { useSidebar } from './SidebarContext';
import { useTaskModal } from './TaskModalContext';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { OnboardingModal } from './OnboardingModal';
import { CommandPalette } from './planning/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [scrolled, setScrolled] = useState(false);
    const { isOpen: isSidebarOpen } = useSidebar();
    const { selectedTaskId, closeTask } = useTaskModal();
    const pathname = usePathname();
    const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
    const { isOpen: isCommandPaletteOpen, setIsOpen: setIsCommandPaletteOpen, openPalette } = useCommandPalette();

    // Check if user is a team member
    const currentMember = useQuery(api.teamMembers.getCurrentMember);
    const showOnboarding =
        isAuthenticated &&
        !isAuthLoading &&
        currentMember === null &&
        pathname !== '/login' &&
        pathname !== '/join';

    // Close an open task modal only when route changes.
    useEffect(() => {
        closeTask();
    }, [pathname, closeTask]);

    // Determine if we should show sidebar (not on profile/settings)
    const showSidebar = !pathname.startsWith('/profile') && !pathname.startsWith('/settings');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#010101] text-white flex">
            {showSidebar && <Sidebar />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidebar ? (isSidebarOpen ? 'ml-64' : 'ml-16') : ''
                }`}>
                <Header scrolled={scrolled} onOpenCommandPalette={openPalette} />

                <main className="flex-1 p-6 pt-24">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {selectedTaskId && (
                <TaskModal taskId={selectedTaskId} onClose={closeTask} />
            )}

            <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />

            <OnboardingModal isOpen={showOnboarding} onClose={() => { }} />
        </div>
    );
}
