"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Github } from "lucide-react";

export function SignIn() {
    const { signIn } = useAuthActions();

    const handleSignIn = () => {
        void signIn("github", { redirectTo: "/" });
    };

    return (
        <button
            onClick={handleSignIn}
            className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 hover:scale-105 shadow-lg"
        >
            <Github className="w-5 h-5" />
            Sign in with GitHub
        </button>
    );
}

