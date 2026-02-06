"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";

export function SignOut() {
    const { signOut } = useAuthActions();

    return (
        <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
        >
            <LogOut className="w-5 h-5" />
            Sign Out
        </button>
    );
}
