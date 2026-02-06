"use client";

import { SidebarProvider } from "@/components/SidebarContext";
import { TaskModalProvider } from "@/components/TaskModalContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <SidebarProvider>
                <TaskModalProvider>
                    <AppLayout>
                        {children}
                    </AppLayout>
                </TaskModalProvider>
            </SidebarProvider>
        </AuthGuard>
    );
}
