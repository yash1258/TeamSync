'use client';

import { Suspense } from 'react';
import { OnboardingModal } from '@/components/OnboardingModal';
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignIn } from "@/components/SignIn";

function JoinContent() {
    return (
        <div className="min-h-screen bg-[#010101] flex flex-col items-center justify-center p-4">
            <AuthLoading>
                <div className="w-12 h-12 border-4 border-[#F0FF7A] border-t-transparent rounded-full animate-spin" />
            </AuthLoading>

            <Unauthenticated>
                <div className="text-center max-w-md mx-auto p-8 bg-[#0B0B0B] border border-[#232323] rounded-2xl shadow-xl flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#F0FF7A] to-[#C8E048] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#F0FF7A]/20">
                        <span className="text-[#010101] font-bold text-2xl">TS</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Join the Team</h1>
                    <p className="text-gray-400 mb-8">Please sign in with GitHub to accept the invitation and complete your profile.</p>
                    <SignIn />
                </div>
            </Unauthenticated>

            <Authenticated>
                <OnboardingModal isOpen={true} onClose={() => { }} />
            </Authenticated>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#010101] flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        }>
            <JoinContent />
        </Suspense>
    );
}
