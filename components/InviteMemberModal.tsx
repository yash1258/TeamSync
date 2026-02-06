'use client';

import { useState } from 'react';
import { X, Loader2, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
    const createInvite = useMutation(api.invites.create);
    const currentMember = useQuery(api.teamMembers.getCurrentMember);

    const [isCreating, setIsCreating] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [expiresInDays, setExpiresInDays] = useState(7);

    const handleCreateInvite = async () => {
        setIsCreating(true);
        try {
            const result = await createInvite({ expiresInDays });
            setInviteCode(result.code);
        } catch (error) {
            console.error('Failed to create invite:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async () => {
        if (!inviteCode) return;
        const inviteUrl = `${window.location.origin}/join?code=${inviteCode}`;
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setInviteCode(null);
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    // Only admins can create invites
    if (currentMember?.accessLevel !== 'admin') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-md p-6 text-center">
                    <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
                    <p className="text-gray-400 mb-4">Only admins can invite new team members.</p>
                    <button onClick={handleClose} className="px-4 py-2 bg-[#181818] rounded-lg text-sm">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-md overflow-hidden">
                <div className="p-5 border-b border-[#232323] flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Invite Team Member</h2>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[#181818] text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {!inviteCode ? (
                        <>
                            <p className="text-gray-400 text-sm mb-4">
                                Generate an invite link to share with your team member. They&apos;ll sign in with GitHub and complete their profile.
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Link expires in
                                </label>
                                <select
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white"
                                >
                                    <option value={1}>1 day</option>
                                    <option value={7}>7 days</option>
                                    <option value={30}>30 days</option>
                                </select>
                            </div>
                            <button
                                onClick={handleCreateInvite}
                                disabled={isCreating}
                                className="w-full px-4 py-3 bg-[#F0FF7A] text-[#010101] rounded-lg font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                                {isCreating ? 'Generating...' : 'Generate Invite Link'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Invite Link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${inviteCode}`}
                                        className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg font-medium flex items-center gap-2"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-500 text-xs">
                                Share this link with your team member. It expires in {expiresInDays} days.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
