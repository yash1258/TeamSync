'use client';

import { useState } from 'react';
import { Loader2, Users, Briefcase, Code2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter, useSearchParams } from 'next/navigation';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code');

    const redeemInvite = useMutation(api.invites.redeem);
    const addSelfAsMember = useMutation(api.teamMembers.addCurrentUserAsTeamMember);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        role: '',
        department: 'engineering' as 'engineering' | 'design' | 'finance' | 'product' | 'marketing',
        skills: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.role.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (inviteCode) {
                // Redeem invite code
                await redeemInvite({
                    code: inviteCode,
                    role: formData.role,
                    department: formData.department,
                    skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                });
            } else {
                // Self-add (first team member)
                await addSelfAsMember({
                    role: formData.role,
                    department: formData.department,
                });
            }
            router.push('/');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to join team');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-[#232323] text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F0FF7A]/20 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7 text-[#F0FF7A]" />
                    </div>
                    <h2 className="text-xl font-semibold mb-1">Welcome to the Team!</h2>
                    <p className="text-gray-400 text-sm">Complete your profile to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Your Role *
                        </label>
                        <input
                            type="text"
                            value={formData.role}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g., Frontend Developer, Product Designer..."
                            className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A]"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Department
                        </label>
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value as any }))}
                            className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                        >
                            <option value="engineering">Engineering</option>
                            <option value="design">Design</option>
                            <option value="product">Product</option>
                            <option value="marketing">Marketing</option>
                            <option value="finance">Finance</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            <Code2 className="w-4 h-4" /> Skills (optional)
                        </label>
                        <input
                            type="text"
                            value={formData.skills}
                            onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                            placeholder="React, TypeScript, Node.js..."
                            className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A]"
                        />
                        <p className="text-gray-500 text-xs mt-1">Comma separated</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.role.trim()}
                        className="w-full px-4 py-3 bg-[#F0FF7A] text-[#010101] rounded-lg font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Joining...' : 'Join Team'}
                    </button>
                </form>
            </div>
        </div>
    );
}
