'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Copy, Check, Link as LinkIcon, Clock3, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface InviteListItem {
    _id: Id<'invites'>;
    code: string;
    expiresAt: number;
    usedAt?: number;
    usedBy?: Id<'teamMembers'>;
    creatorName: string;
    creatorEmail: string;
    isExpired: boolean;
    isUsed: boolean;
}

const formatDateTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return 'Action failed. Please try again.';
};

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
    const createInvite = useMutation(api.invites.create);
    const revokeInvite = useMutation(api.invites.revoke);
    const extendInvite = useMutation(api.invites.extend);
    const currentMember = useQuery(api.teamMembers.getCurrentMember);
    const rawInvites = useQuery(api.invites.list);
    const invites = useMemo(() => (rawInvites ?? []) as InviteListItem[], [rawInvites]);

    const [isCreating, setIsCreating] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [actionInviteId, setActionInviteId] = useState<Id<'invites'> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const activeInvites = useMemo(
        () => invites.filter((invite) => !invite.isUsed && !invite.isExpired),
        [invites]
    );
    const historicalInvites = useMemo(
        () => invites.filter((invite) => invite.isUsed || invite.isExpired).slice(0, 6),
        [invites]
    );

    useEffect(() => {
        if (!feedback) return undefined;
        const timeout = window.setTimeout(() => setFeedback(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const getInviteUrl = (code: string) =>
        `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${code}`;

    const handleCreateInvite = async () => {
        setError(null);
        setFeedback(null);
        setIsCreating(true);
        try {
            const result = await createInvite({ expiresInDays });
            setInviteCode(result.code);
            setFeedback('Invite link generated.');
        } catch (createError) {
            setError(getErrorMessage(createError));
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(getInviteUrl(code));
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (copyError) {
            setError(getErrorMessage(copyError));
        }
    };

    const handleRevoke = async (invite: InviteListItem) => {
        const confirmed = confirm(`Revoke invite code ${invite.code}?`);
        if (!confirmed) return;

        setError(null);
        setFeedback(null);
        setActionInviteId(invite._id);
        try {
            await revokeInvite({ id: invite._id });
            setFeedback(`Invite ${invite.code} revoked.`);
            if (inviteCode === invite.code) {
                setInviteCode(null);
            }
        } catch (revokeError) {
            setError(getErrorMessage(revokeError));
        } finally {
            setActionInviteId(null);
        }
    };

    const handleExtend = async (invite: InviteListItem) => {
        setError(null);
        setFeedback(null);
        setActionInviteId(invite._id);
        try {
            await extendInvite({ id: invite._id, expiresInDays: 7 });
            setFeedback(`Extended ${invite.code} by 7 days.`);
        } catch (extendError) {
            setError(getErrorMessage(extendError));
        } finally {
            setActionInviteId(null);
        }
    };

    const handleClose = () => {
        setInviteCode(null);
        setCopiedCode(null);
        setError(null);
        setFeedback(null);
        onClose();
    };

    if (!isOpen) return null;

    if (currentMember === undefined) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-md p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#F0FF7A]" />
                </div>
            </div>
        );
    }

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
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-[#232323] flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Invite Team Members</h2>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-[#181818] text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {feedback && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
                            {feedback}
                        </div>
                    )}

                    <div className="bg-[#111111] border border-[#232323] rounded-xl p-4 space-y-4">
                        <p className="text-sm text-gray-400">
                            Generate a new invite link. New members will sign in with GitHub, then complete onboarding.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                            <select
                                value={expiresInDays}
                                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white"
                            >
                                <option value={1}>Expires in 1 day</option>
                                <option value={7}>Expires in 7 days</option>
                                <option value={30}>Expires in 30 days</option>
                            </select>
                            <button
                                onClick={() => void handleCreateInvite()}
                                disabled={isCreating}
                                className="px-4 py-2.5 bg-[#F0FF7A] text-[#010101] rounded-lg font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                                {isCreating ? 'Generating...' : 'Generate Link'}
                            </button>
                        </div>
                        {inviteCode && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500">Latest invite link</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getInviteUrl(inviteCode)}
                                        className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white"
                                    />
                                    <button
                                        onClick={() => void handleCopy(inviteCode)}
                                        className="px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg font-medium flex items-center gap-2"
                                    >
                                        {copiedCode === inviteCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copiedCode === inviteCode ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-medium">Active Invites</h3>
                        {activeInvites.length === 0 ? (
                            <div className="bg-[#111111] border border-[#232323] rounded-xl p-4 text-sm text-gray-500">
                                No active invites right now.
                            </div>
                        ) : (
                            activeInvites.map((invite) => {
                                const isBusy = actionInviteId === invite._id;
                                return (
                                    <div key={invite._id} className="bg-[#111111] border border-[#232323] rounded-xl p-4 space-y-3">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div>
                                                <p className="font-mono text-sm text-white">{invite.code}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Created by {invite.creatorName || invite.creatorEmail}
                                                </p>
                                            </div>
                                            <div className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-1 w-fit">
                                                <Clock3 className="w-3 h-3" />
                                                Expires {formatDateTime(invite.expiresAt)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => void handleCopy(invite.code)}
                                                disabled={isBusy}
                                                className="px-3 py-1.5 text-xs bg-[#181818] border border-[#232323] rounded-lg hover:border-[#333] transition-colors disabled:opacity-60"
                                            >
                                                {copiedCode === invite.code ? 'Copied' : 'Copy Link'}
                                            </button>
                                            <button
                                                onClick={() => void handleExtend(invite)}
                                                disabled={isBusy}
                                                className="px-3 py-1.5 text-xs bg-[#181818] border border-[#232323] rounded-lg hover:border-[#333] transition-colors disabled:opacity-60 flex items-center gap-1"
                                            >
                                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                Extend +7d
                                            </button>
                                            <button
                                                onClick={() => void handleRevoke(invite)}
                                                disabled={isBusy}
                                                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-60 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Revoke
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-medium">Recent Invite History</h3>
                        {historicalInvites.length === 0 ? (
                            <div className="bg-[#111111] border border-[#232323] rounded-xl p-4 text-sm text-gray-500">
                                No used or expired invites yet.
                            </div>
                        ) : (
                            historicalInvites.map((invite) => (
                                <div key={invite._id} className="bg-[#111111] border border-[#232323] rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-mono text-sm">{invite.code}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {invite.isUsed
                                                ? `Used ${invite.usedAt ? formatDateTime(invite.usedAt) : ''}`
                                                : `Expired ${formatDateTime(invite.expiresAt)}`}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                        invite.isUsed
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                        {invite.isUsed ? 'Used' : 'Expired'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
