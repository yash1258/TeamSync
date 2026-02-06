"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AuthLoading>
                <div className="min-h-screen bg-[#010101] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#F0FF7A] border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400">Loading...</p>
                    </div>
                </div>
            </AuthLoading>
            <Unauthenticated>
                {/* This should not render as middleware handles redirect */}
                <div className="min-h-screen bg-[#010101] flex items-center justify-center">
                    <p className="text-gray-400">Redirecting to login...</p>
                </div>
            </Unauthenticated>
            <Authenticated>
                {children}
            </Authenticated>
        </>
    );
}
