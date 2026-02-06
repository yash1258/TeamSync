'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Id } from '@/convex/_generated/dataModel';

interface TaskModalContextType {
    selectedTaskId: Id<"tasks"> | null;
    openTask: (taskId: Id<"tasks">) => void;
    closeTask: () => void;
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

export function TaskModalProvider({ children }: { children: ReactNode }) {
    const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);

    const openTask = (taskId: Id<"tasks">) => setSelectedTaskId(taskId);
    const closeTask = () => setSelectedTaskId(null);

    return (
        <TaskModalContext.Provider value={{ selectedTaskId, openTask, closeTask }}>
            {children}
        </TaskModalContext.Provider>
    );
}

export function useTaskModal() {
    const context = useContext(TaskModalContext);
    if (context === undefined) {
        throw new Error('useTaskModal must be used within a TaskModalProvider');
    }
    return context;
}
