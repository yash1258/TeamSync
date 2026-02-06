"use client";

import { SignIn } from "@/components/SignIn";
import { Authenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const router = useRouter();

    return (
        <>
            <AuthLoading>
                <div className="min-h-screen bg-[#010101] flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#F0FF7A] border-t-transparent rounded-full animate-spin" />
                </div>
            </AuthLoading>

            <Authenticated>
                <AuthenticatedRedirect />
            </Authenticated>

            <div className="min-h-screen bg-[#010101] flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    {/* Logo */}
                    <div className="mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#F0FF7A] to-[#C8E048] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#F0FF7A]/20">
                            <span className="text-[#010101] font-bold text-2xl">TS</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Welcome to TeamSync
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Collaborate, manage tasks, and sync with your team
                        </p>
                    </div>

                    {/* Sign In Button */}
                    <div className="flex justify-center mb-8">
                        <SignIn />
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-4 text-center mt-12">
                        <div className="p-4">
                            <div className="text-2xl mb-2">📋</div>
                            <p className="text-gray-500 text-sm">Task Management</p>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl mb-2">👥</div>
                            <p className="text-gray-500 text-sm">Team Collaboration</p>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl mb-2">📊</div>
                            <p className="text-gray-500 text-sm">Budget Tracking</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function AuthenticatedRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push("/");
    }, [router]);

    return (
        <div className="min-h-screen bg-[#010101] flex items-center justify-center">
            <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
    );
}
