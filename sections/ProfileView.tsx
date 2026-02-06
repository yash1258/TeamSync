'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Link as LinkIcon,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Award,
  Clock,
  FileText,
  Star,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface EditableProfile {
  phone: string;
  location: string;
  timezone: string;
  bio: string;
  website: string;
  role: string;
  department: string;
  skills: string[];
}

const stats = {
  tasksCompleted: 0,
  projectsLed: 0,
  hoursLogged: 0,
  satisfaction: 0
};

export function ProfileView() {
  const profile = useQuery(api.users.getProfile);
  const updateProfile = useMutation(api.users.updateProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<EditableProfile>({
    phone: '',
    location: '',
    timezone: '',
    bio: '',
    website: '',
    role: '',
    department: '',
    skills: [],
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Initialize edited profile when data loads
  useEffect(() => {
    if (profile) {
      setEditedProfile({
        phone: profile.phone,
        location: profile.location,
        timezone: profile.timezone,
        bio: profile.bio,
        website: profile.website,
        role: profile.role,
        department: profile.department,
        skills: profile.skills,
      });
    }
  }, [profile]);

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
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        phone: editedProfile.phone || undefined,
        location: editedProfile.location || undefined,
        timezone: editedProfile.timezone || undefined,
        bio: editedProfile.bio || undefined,
        website: editedProfile.website || undefined,
        role: editedProfile.role || undefined,
        department: editedProfile.department || undefined,
        skills: editedProfile.skills.length > 0 ? editedProfile.skills : undefined,
      });
      setIsEditing(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditedProfile({
        phone: profile.phone,
        location: profile.location,
        timezone: profile.timezone,
        bio: profile.bio,
        website: profile.website,
        role: profile.role,
        department: profile.department,
        skills: profile.skills,
      });
    }
    setIsEditing(false);
  };

  const handleChange = (field: keyof EditableProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'comment':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'project':
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      case 'review':
        return <Star className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Loading state
  if (profile === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to view your profile</p>
      </div>
    );
  }

  // Get initials for avatar fallback
  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={sectionRef} className="space-y-6">
      {/* Success Toast */}
      {showSaveSuccess && (
        <div className="fixed top-24 right-6 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-slide-up">
          <CheckCircle2 className="w-5 h-5" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-on-scroll opacity-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">My Profile</h1>
          <p className="text-gray-400 text-sm">Manage your personal information and preferences</p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#181818] border border-[#232323] rounded-lg text-sm hover:border-[#333] transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="animate-on-scroll opacity-0 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-[#F0FF7A]/20 to-[#F0FF7A]/5" />
            <div className="px-6 pb-6">
              <div className="relative -mt-12 mb-4">
                <div className="relative inline-block">
                  {profile.image ? (
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-24 h-24 rounded-full border-4 border-[#0B0B0B] object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-[#0B0B0B] bg-[#F0FF7A] flex items-center justify-center text-[#010101] text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 p-2 bg-[#F0FF7A] rounded-full text-[#010101] hover:shadow-lg transition-shadow">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold">{profile.name}</p>
                    <p className="text-xs text-gray-500">Name from GitHub (not editable)</p>
                  </div>
                  <input
                    type="text"
                    value={editedProfile.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="Your role (e.g. Product Lead)"
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-1">{profile.name}</h2>
                  <p className="text-gray-400 text-sm mb-4">{profile.role || 'No role set'}</p>
                </>
              )}

              <div className="flex items-center gap-2 mb-4">
                {editedProfile.department && (
                  <span className="px-3 py-1 bg-[#F0FF7A]/10 text-[#F0FF7A] rounded-full text-xs font-medium">
                    {isEditing ? editedProfile.department : profile.department}
                  </span>
                )}
                <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Online
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#F0FF7A]"
                    />
                  ) : (
                    <span>{profile.phone || 'Not set'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Location"
                      className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#F0FF7A]"
                    />
                  ) : (
                    <span>{profile.location || 'Not set'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Clock className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      placeholder="Timezone (e.g. PST)"
                      className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#F0FF7A]"
                    />
                  ) : (
                    <span>{profile.timezone || 'Not set'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Briefcase className="w-4 h-4" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      placeholder="Department"
                      className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#F0FF7A]"
                    />
                  ) : (
                    <span>{profile.department || 'Not set'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#F0FF7A]" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {(isEditing ? editedProfile.skills : profile.skills).map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-[#181818] rounded-lg text-sm text-gray-300"
                >
                  {skill}
                </span>
              ))}
              {(isEditing ? editedProfile.skills : profile.skills).length === 0 && (
                <span className="text-sm text-gray-500">No skills added yet</span>
              )}
              {isEditing && (
                <button className="px-3 py-1.5 border border-dashed border-[#232323] rounded-lg text-sm text-gray-500 hover:text-[#F0FF7A] hover:border-[#F0FF7A]/50 transition-colors">
                  + Add Skill
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="animate-on-scroll opacity-0 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-2xl font-semibold">{stats.tasksCompleted}</span>
              </div>
              <p className="text-sm text-gray-500">Tasks Completed</p>
            </div>
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-semibold">{stats.projectsLed}</span>
              </div>
              <p className="text-sm text-gray-500">Projects Led</p>
            </div>
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-2xl font-semibold">{stats.hoursLogged}</span>
              </div>
              <p className="text-sm text-gray-500">Hours Logged</p>
            </div>
            <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-semibold">{stats.satisfaction}</span>
              </div>
              <p className="text-sm text-gray-500">Satisfaction</p>
            </div>
          </div>

          {/* About */}
          <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
            <h3 className="font-semibold mb-4">About</h3>
            {isEditing ? (
              <textarea
                value={editedProfile.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#F0FF7A] resize-none"
              />
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {profile.bio || 'No bio added yet'}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-[#232323]">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="Your website"
                    className="flex-1 bg-[#181818] border border-[#232323] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                  />
                ) : profile.website ? (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#F0FF7A] hover:underline"
                  >
                    {profile.website}
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">No website added</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity - Placeholder */}
          <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#232323]">
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Your activity will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
