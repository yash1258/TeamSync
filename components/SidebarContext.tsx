'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface SidebarContextType {
    isOpen: boolean;
    toggle: () => void;
    setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
    const setOpen = useCallback((open: boolean) => setIsOpen(open), []);
    const value = useMemo(
        () => ({ isOpen, toggle, setOpen }),
        [isOpen, toggle, setOpen]
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
