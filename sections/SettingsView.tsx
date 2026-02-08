'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Mail,
  Smartphone,
  Check,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { api } from '@/convex/_generated/api';

type SettingsTab = 'account' | 'notifications' | 'security' | 'appearance';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

const initialNotifications: NotificationSetting[] = [
  {
    id: 'task_assignments',
    label: 'Task Assignments',
    description: 'When you are assigned a new task',
    email: true,
    push: true,
    inApp: true
  },
  {
    id: 'task_due',
    label: 'Task Due Dates',
    description: 'Reminders for upcoming deadlines',
    email: true,
    push: false,
    inApp: true
  },
  {
    id: 'mentions',
    label: 'Mentions & Comments',
    description: 'When someone mentions you or comments on your tasks',
    email: true,
    push: true,
    inApp: true
  },
  {
    id: 'project_updates',
    label: 'Project Updates',
    description: 'Changes to projects you are part of',
    email: false,
    push: false,
    inApp: true
  },
  {
    id: 'team_activity',
    label: 'Team Activity',
    description: 'General team updates and announcements',
    email: false,
    push: false,
    inApp: false
  },
  {
    id: 'budget_alerts',
    label: 'Budget Alerts',
    description: 'When budget thresholds are reached',
    email: true,
    push: true,
    inApp: true
  },
];

export function SettingsView() {
  const currentUser = useQuery(api.users.currentUser);
  const persistedSettings = useQuery(api.users.getSettings);
  const updateSettings = useMutation(api.users.updateSettings);

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [notifications, setNotifications] = useState<NotificationSetting[]>(initialNotifications);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('en');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    if (!persistedSettings) return;

    setTheme(persistedSettings.theme);
    setLanguage(persistedSettings.language);
    setTwoFactorEnabled(persistedSettings.twoFactorEnabled);
    setNotifications(
      initialNotifications.map((notification) => {
        const persisted = persistedSettings.notifications.find(
          (item) => item.id === notification.id
        );
        if (!persisted) return notification;
        return {
          ...notification,
          email: persisted.email,
          push: persisted.push,
          inApp: persisted.inApp,
        };
      })
    );
  }, [persistedSettings]);

  const handleNotificationToggle = (id: string, channel: 'email' | 'push' | 'inApp') => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, [channel]: !n[channel] } : n)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        theme,
        language,
        twoFactorEnabled,
        notifications: notifications.map((notification) => ({
          id: notification.id,
          email: notification.email,
          push: notification.push,
          inApp: notification.inApp,
        })),
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div ref={sectionRef} className="space-y-6">
      {/* Success Toast */}
      {showSaveSuccess && (
        <div className="fixed top-24 right-6 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-slide-up">
          <CheckCircle2 className="w-5 h-5" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-on-scroll opacity-0">
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-gray-400 text-sm">Manage your account preferences and configuration</p>
      </div>

      <div className="animate-on-scroll opacity-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-2 space-y-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-[#F0FF7A] text-[#010101]'
                      : 'text-gray-400 hover:bg-[#181818] hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Information */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#F0FF7A]" />
                  Profile Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                      <input
                        type="text"
                        defaultValue="Alex Chen"
                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                      <input
                        type="text"
                        defaultValue="alex"
                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      defaultValue="alex@team.com"
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Job Title</label>
                    <input
                      type="text"
                      defaultValue="Product Lead"
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Language & Region */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#F0FF7A]" />
                  Language & Region
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Timezone</label>
                    <select
                      defaultValue="pst"
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    >
                      <option value="pst">Pacific Time (PST)</option>
                      <option value="mst">Mountain Time (MST)</option>
                      <option value="cst">Central Time (CST)</option>
                      <option value="est">Eastern Time (EST)</option>
                      <option value="gmt">Greenwich Mean Time (GMT)</option>
                      <option value="cet">Central European Time (CET)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                    </div>
                    <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
                <div className="p-5 border-b border-[#232323]">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#F0FF7A]" />
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
                </div>
                <div className="divide-y divide-[#232323]">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-[#181818] text-sm text-gray-400">
                    <div className="col-span-5">Notification Type</div>
                    <div className="col-span-2 text-center">Email</div>
                    <div className="col-span-2 text-center">Push</div>
                    <div className="col-span-2 text-center">In-App</div>
                  </div>
                  {/* Notification Rows */}
                  {notifications.map((notification) => (
                    <div key={notification.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#181818]/50 transition-colors">
                      <div className="col-span-5">
                        <p className="font-medium text-sm">{notification.label}</p>
                        <p className="text-xs text-gray-500">{notification.description}</p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => handleNotificationToggle(notification.id, 'email')}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${notification.email ? 'bg-[#F0FF7A] text-[#010101]' : 'bg-[#181818] border border-[#232323]'
                            }`}
                        >
                          {notification.email && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => handleNotificationToggle(notification.id, 'push')}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${notification.push ? 'bg-[#F0FF7A] text-[#010101]' : 'bg-[#181818] border border-[#232323]'
                            }`}
                        >
                          {notification.push && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => handleNotificationToggle(notification.id, 'inApp')}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${notification.inApp ? 'bg-[#F0FF7A] text-[#010101]' : 'bg-[#181818] border border-[#232323]'
                            }`}
                        >
                          {notification.inApp && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Channels */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">{currentUser?.email ?? 'No email on file'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Smartphone className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-500">Mobile app and browser</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-[#F0FF7A] text-[#010101] rounded-lg text-xs font-medium">
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              {/* Password */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#F0FF7A]" />
                  Change Password
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors pr-10"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F0FF7A] transition-colors"
                    />
                  </div>
                  <button className="px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all">
                    Update Password
                  </button>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#F0FF7A]" />
                  Two-Factor Authentication
                </h3>
                <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-gray-500">Use an authenticator app to generate codes</p>
                  </div>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${twoFactorEnabled ? 'bg-[#F0FF7A]' : 'bg-[#232323]'
                      }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
                {twoFactorEnabled && (
                  <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Two-factor authentication is enabled
                    </p>
                  </div>
                )}
              </div>

              {/* Active Sessions */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Monitor className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Chrome on MacOS</p>
                        <p className="text-sm text-gray-500">Current session • San Francisco, CA</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Smartphone className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">iPhone 15 Pro</p>
                        <p className="text-sm text-gray-500">Last active 2 hours ago</p>
                      </div>
                    </div>
                    <button className="text-sm text-red-400 hover:text-red-300">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              {/* Theme */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#F0FF7A]" />
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark'
                        ? 'border-[#F0FF7A] bg-[#F0FF7A]/5'
                        : 'border-[#232323] hover:border-[#333]'
                      }`}
                  >
                    <Moon className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-[#F0FF7A]' : 'text-gray-500'}`} />
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-400'}`}>Dark</p>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border-2 transition-all ${theme === 'light'
                        ? 'border-[#F0FF7A] bg-[#F0FF7A]/5'
                        : 'border-[#232323] hover:border-[#333]'
                      }`}
                  >
                    <Sun className={`w-8 h-8 mx-auto mb-2 ${theme === 'light' ? 'text-[#F0FF7A]' : 'text-gray-500'}`} />
                    <p className={`text-sm font-medium ${theme === 'light' ? 'text-white' : 'text-gray-400'}`}>Light</p>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-xl border-2 transition-all ${theme === 'system'
                        ? 'border-[#F0FF7A] bg-[#F0FF7A]/5'
                        : 'border-[#232323] hover:border-[#333]'
                      }`}
                  >
                    <Monitor className={`w-8 h-8 mx-auto mb-2 ${theme === 'system' ? 'text-[#F0FF7A]' : 'text-gray-500'}`} />
                    <p className={`text-sm font-medium ${theme === 'system' ? 'text-white' : 'text-gray-400'}`}>System</p>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4">Accent Color</h3>
                <div className="flex gap-3">
                  {['#F0FF7A', '#60A5FA', '#A78BFA', '#F472B6', '#34D399'].map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Density */}
              <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-5">
                <h3 className="font-semibold mb-4">Interface Density</h3>
                <div className="space-y-3">
                  {['Compact', 'Comfortable', 'Spacious'].map((density) => (
                    <label key={density} className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg cursor-pointer hover:bg-[#232323] transition-colors">
                      <input
                        type="radio"
                        name="density"
                        defaultChecked={density === 'Comfortable'}
                        className="w-4 h-4 accent-[#F0FF7A]"
                      />
                      <span className="font-medium">{density}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || persistedSettings === undefined}
              className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-6 py-2.5 rounded-lg font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
