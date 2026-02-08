'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Phone,
  Crown,
  Code,
  Palette,
  DollarSign,
  Briefcase,
  Loader2,
  Shield,
  Eye,
  X
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import type { Id } from '@/convex/_generated/dataModel';

const departmentIcons: Record<string, React.ElementType> = {
  engineering: Code,
  design: Palette,
  finance: DollarSign,
  product: Crown,
  marketing: Briefcase,
};

const departmentColors: Record<string, string> = {
  engineering: 'bg-blue-500/10 text-blue-400',
  design: 'bg-purple-500/10 text-purple-400',
  finance: 'bg-green-500/10 text-green-400',
  product: 'bg-amber-500/10 text-amber-400',
  marketing: 'bg-pink-500/10 text-pink-400',
};

const accessLevelIcons: Record<string, React.ElementType> = {
  admin: Shield,
  member: Users,
  viewer: Eye,
};

const accessLevelOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
] as const;

type AccessLevel = (typeof accessLevelOptions)[number]['value'];

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

export function TeamView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<Id<'teamMembers'> | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<Id<'teamMembers'> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fetch team members from Convex
  const rawTeamMembers = useQuery(api.teamMembers.list);
  const teamMembers = rawTeamMembers ?? [];
  const currentMember = useQuery(api.teamMembers.getCurrentMember);
  const updateMember = useMutation(api.teamMembers.update);
  const removeMember = useMutation(api.teamMembers.remove);
  const isAdmin = currentMember?.accessLevel === 'admin';
  const isViewer = currentMember?.accessLevel === 'viewer';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-slide-up');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [rawTeamMembers]); // Re-run when data loads

  useEffect(() => {
    if (!actionSuccess) return undefined;
    const timeout = window.setTimeout(() => setActionSuccess(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [actionSuccess]);

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-amber-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const departments = ['all', ...Array.from(new Set(teamMembers.map(m => m.department)))];

  const stats = {
    total: teamMembers.length,
    online: teamMembers.filter(m => m.status === 'online').length,
    away: teamMembers.filter(m => m.status === 'away').length,
    offline: teamMembers.filter(m => m.status === 'offline').length,
  };

  const handleAccessLevelChange = async (
    memberId: Id<'teamMembers'>,
    memberName: string,
    currentAccessLevel: AccessLevel,
    nextAccessLevel: AccessLevel
  ) => {
    if (currentAccessLevel === nextAccessLevel) return;

    setActionError(null);
    setActionSuccess(null);
    setUpdatingMemberId(memberId);

    try {
      await updateMember({ id: memberId, accessLevel: nextAccessLevel });
      setActionSuccess(`${memberName} is now ${nextAccessLevel}.`);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: Id<'teamMembers'>, memberName: string) => {
    const confirmed = confirm(`Remove ${memberName} from the team?`);
    if (!confirmed) return;

    setActionError(null);
    setActionSuccess(null);
    setRemovingMemberId(memberId);

    try {
      await removeMember({ id: memberId });
      setActionSuccess(`${memberName} was removed from the team.`);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Loading state
  if (rawTeamMembers === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="space-y-6">
      {actionError && (
        <div className="fixed top-24 right-6 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-slide-up">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="fixed top-24 right-6 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-slide-up">
          {actionSuccess}
        </div>
      )}

      {/* Header */}
      <div className="animate-on-scroll opacity-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Team Members</h1>
          <p className="text-gray-400 text-sm">Manage your team and their permissions</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
            />
          </div>

          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-[#181818] border border-[#232323] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
          >
            <option value="all">All Departments</option>
            {departments.filter(d => d !== 'all').map((dept) => (
              <option key={dept} value={dept}>
                {dept.charAt(0).toUpperCase() + dept.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!isAdmin}
            title={!isAdmin ? 'Only admins can invite members' : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              isAdmin
                ? 'bg-[#F0FF7A] text-[#010101] hover:shadow-lg hover:shadow-[#F0FF7A]/20'
                : 'bg-[#181818] text-gray-500 cursor-not-allowed border border-[#232323]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
        <p className="text-sm text-gray-300">
          {isAdmin
            ? 'Admin access: you can invite members, manage access levels, and remove members.'
            : isViewer
              ? 'Viewer access: you have read-only access. Admins can grant additional permissions.'
              : 'Member access: you can collaborate, but only admins can manage invites and access levels.'}
        </p>
      </div>

      {/* Stats */}
      <div className="animate-on-scroll opacity-0 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-2xl font-semibold mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Members</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-2xl font-semibold mb-1">{stats.online}</p>
          </div>
          <p className="text-sm text-gray-500">Online</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-2xl font-semibold mb-1">{stats.away}</p>
          </div>
          <p className="text-sm text-gray-500">Away</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <p className="text-2xl font-semibold mb-1">{stats.offline}</p>
          </div>
          <p className="text-sm text-gray-500">Offline</p>
        </div>
      </div>

      {/* Team Grid */}
      <div className="animate-on-scroll opacity-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMembers.map((member, index) => {
          const DeptIcon = departmentIcons[member.department] || Briefcase;
          return (
            <div
              key={member._id}
              className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5 hover:border-[#333] transition-all duration-200 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#0B0B0B] ${getStatusColor(member.status)}`} />
                </div>
                {isAdmin && member._id !== currentMember?._id && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-[#181818] text-gray-500 opacity-0 group-hover:opacity-100 transition-all hover:text-red-400 disabled:opacity-60 disabled:cursor-wait"
                    title="Remove member"
                    onClick={() => void handleRemoveMember(member._id, member.name)}
                    disabled={removingMemberId === member._id || updatingMemberId === member._id}
                  >
                    {removingMemberId === member._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{member.name}</h3>
                {member.accessLevel && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#181818] border border-[#232323]">
                    {(() => {
                      const Icon = accessLevelIcons[member.accessLevel] || Users;
                      return <Icon className="w-3 h-3 text-gray-400" />;
                    })()}
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{member.accessLevel}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">{member.role}</p>

              {isAdmin && member._id !== currentMember?._id && (
                <div className="mb-3">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Access Level
                  </label>
                  <select
                    value={member.accessLevel}
                    onChange={(e) => {
                      const nextValue = e.target.value as AccessLevel;
                      void handleAccessLevelChange(member._id, member.name, member.accessLevel, nextValue);
                    }}
                    disabled={updatingMemberId === member._id || removingMemberId === member._id}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F0FF7A] transition-colors disabled:opacity-60"
                  >
                    {accessLevelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4 min-h-[56px] content-start">
                <div className="flex items-center gap-2 w-full">
                  <div className={`p-1.5 rounded-lg ${departmentColors[member.department]}`}>
                    <DeptIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{member.department}</span>
                </div>
                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {member.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-[10px] bg-[#181818] text-gray-500 px-2 py-0.5 rounded border border-[#232323]">
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="text-[10px] text-gray-600 px-1 py-0.5">+{member.skills.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-[#232323]">
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#181818] rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#232323] transition-all"
                  title="Send message"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Message</span>
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#181818] rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#232323] transition-all"
                  title="Start call"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </button>
              </div>

              {member._id === currentMember?._id && (
                <p className="text-[11px] text-gray-500 mt-3">This is your account.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No team members found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
