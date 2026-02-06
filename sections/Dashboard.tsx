'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Users,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Loader2
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';

type Trend = 'up' | 'down' | 'neutral';

const getGreeting = (hour: number) => {
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Dashboard() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [nowMs] = useState(() => Date.now());
    const { openTask } = useTaskModal();

    // Fetch real data from Convex
    const dashboardStats = useQuery(api.dashboard.getStats);
    const recentTasks = useQuery(api.tasks.listRecent, { limit: 4 });
    const activityLog = useQuery(api.dashboard.getActivity, { limit: 4 });
    const currentUser = useQuery(api.users.currentUser);

    const taskCreationTrend: Trend = dashboardStats
        ? dashboardStats.taskCreationChangePercent > 0
            ? 'up'
            : dashboardStats.taskCreationChangePercent < 0
                ? 'down'
                : 'neutral'
        : 'neutral';
    const budgetRemaining = dashboardStats
        ? dashboardStats.budgetAllocated - dashboardStats.budgetSpent
        : 0;

    // Build stats array from real data
    const stats = [
        {
            label: 'Total Tasks',
            value: dashboardStats?.totalTasks?.toString() ?? '0',
            change: dashboardStats
                ? dashboardStats.taskCreationChangePercent === 0
                    ? 'No change vs last week'
                    : `${dashboardStats.taskCreationChangePercent > 0 ? '+' : ''}${dashboardStats.taskCreationChangePercent}% vs last week`
                : 'Loading...',
            trend: taskCreationTrend,
            icon: CheckCircle2,
            color: 'text-green-400',
            bgColor: 'bg-green-400/10'
        },
        {
            label: 'In Progress',
            value: dashboardStats?.inProgress?.toString() ?? '0',
            change: dashboardStats && dashboardStats.totalTasks > 0
                ? `${Math.round((dashboardStats.inProgress / dashboardStats.totalTasks) * 100)}% of all tasks`
                : 'No tasks yet',
            trend: 'neutral' as Trend,
            icon: Clock,
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10'
        },
        {
            label: 'Overdue',
            value: dashboardStats?.overdue?.toString() ?? '0',
            change: dashboardStats?.overdue === 0
                ? 'No overdue tasks'
                : `${dashboardStats?.dueSoon ?? 0} due this week`,
            trend: (dashboardStats?.overdue ?? 0) > 0 ? 'down' : 'neutral',
            icon: AlertCircle,
            color: 'text-red-400',
            bgColor: 'bg-red-400/10'
        },
        {
            label: 'Budget Used',
            value: `${dashboardStats?.budgetUsedPercent ?? 0}%`,
            change: dashboardStats
                ? budgetRemaining >= 0
                    ? `${formatCurrency(budgetRemaining)} remaining`
                    : `${formatCurrency(Math.abs(budgetRemaining))} over budget`
                : 'Loading...',
            trend: dashboardStats && (dashboardStats.budgetUsedPercent > 90 || budgetRemaining < 0) ? 'down' : 'neutral',
            icon: Wallet,
            color: 'text-[#F0FF7A]',
            bgColor: 'bg-[#F0FF7A]/10'
        },
    ];

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
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll');
        elements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [dashboardStats, recentTasks]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'todo':
                return <span className="w-2 h-2 rounded-full bg-gray-500" />;
            case 'in-progress':
                return <span className="w-2 h-2 rounded-full bg-blue-400" />;
            case 'review':
                return <span className="w-2 h-2 rounded-full bg-amber-400" />;
            case 'done':
                return <span className="w-2 h-2 rounded-full bg-green-400" />;
            default:
                return null;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'todo':
                return 'To Do';
            case 'in-progress':
                return 'In Progress';
            case 'review':
                return 'Review';
            case 'done':
                return 'Done';
            default:
                return status;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-400';
            case 'medium':
                return 'text-amber-400';
            case 'low':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    // Format activity time
    const formatTime = (timestamp: number) => {
        const diff = nowMs - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''} ago`;
    };

    const greeting = getGreeting(new Date(nowMs).getHours());
    const firstName = currentUser?.name?.split(' ')[0] ?? 'there';

    // Loading state
    if (dashboardStats === undefined || recentTasks === undefined || activityLog === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
            </div>
        );
    }

    return (
        <div ref={sectionRef} className="space-y-6">
            {/* Welcome */}
            <div className="animate-on-scroll opacity-0">
                <h1 className="text-3xl font-semibold mb-1">Good {greeting}, {firstName}.</h1>
                <p className="text-gray-400">
                    {dashboardStats.overdue} overdue tasks, {dashboardStats.dueSoon} due this week, and {dashboardStats.onlineMembers} members online.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-5 card-hover"
                            style={{ animationDelay: `${index * 80}ms` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div className={`flex items-center gap-1 text-xs ${stat.trend === 'up' ? 'text-green-400' :
                                    stat.trend === 'down' ? 'text-red-400' :
                                        'text-gray-400'
                                    }`}>
                                    {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                                    {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                                    <span>{stat.change}</span>
                                </div>
                            </div>
                            <p className="text-2xl font-semibold mb-1">{stat.value}</p>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Tasks */}
                <div className="lg:col-span-2 animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-[#232323] flex items-center justify-between">
                        <h2 className="font-semibold">Recent Tasks ({recentTasks.length})</h2>
                        <Link href="/tasks" className="text-sm text-[#F0FF7A] hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="divide-y divide-[#232323]">
                        {(recentTasks ?? []).map((task) => (
                            <div
                                key={task._id}
                                onClick={() => openTask(task._id)}
                                className="p-4 hover:bg-[#181818] transition-colors cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">{getStatusIcon(task.status)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium truncate group-hover:text-[#F0FF7A] transition-colors">
                                                {task.title}
                                            </h3>
                                            <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-2">{task.description}</p>
                                        <div className="flex items-center gap-3">
                                            {task.assignee?.avatar && (
                                                <>
                                                    <img
                                                        src={task.assignee.avatar}
                                                        alt={task.assignee.name}
                                                        className="w-5 h-5 rounded-full"
                                                    />
                                                    <span className="text-xs text-gray-500">{task.assignee.name}</span>
                                                    <span className="text-xs text-gray-600">•</span>
                                                </>
                                            )}
                                            <span className="text-xs text-gray-500">{getStatusLabel(task.status)}</span>
                                            <span className="text-xs text-gray-600">•</span>
                                            <span className="text-xs text-gray-500">Due {task.dueDate}</span>
                                        </div>
                                    </div>
                                    <button className="p-1.5 rounded-lg hover:bg-[#232323] text-gray-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(recentTasks ?? []).length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No tasks yet. Create your first task!
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Activity */}
                <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-[#232323]">
                        <h2 className="font-semibold">Team Activity</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {(activityLog ?? []).map((activity) => (
                            <div key={activity._id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#181818] flex items-center justify-center flex-shrink-0">
                                    <Users className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-medium text-white">{activity.userName}</span>
                                        {' '}<span className="text-gray-500">{activity.action}</span>{' '}
                                        <span className="text-[#F0FF7A]">{activity.target}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{formatTime(activity.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                        {(activityLog ?? []).length === 0 && (
                            <div className="py-4 text-center text-gray-500 text-sm">
                                No activity yet
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-[#232323]">
                        <Link href="/team" className="block w-full py-2 text-center text-sm text-gray-400 hover:text-white transition-colors">
                            View all activity
                        </Link>
                    </div>
                </div>
            </div>

            {/* Team Snapshot */}
            <div className="animate-on-scroll opacity-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Completed', value: dashboardStats.done, icon: CheckCircle2, color: 'bg-green-500/10 text-green-400' },
                    { label: 'To Do', value: dashboardStats.todo, icon: Clock, color: 'bg-blue-500/10 text-blue-400' },
                    { label: 'In Review', value: dashboardStats.review, icon: AlertCircle, color: 'bg-amber-500/10 text-amber-400' },
                    { label: 'Online Members', value: dashboardStats.onlineMembers, icon: Users, color: 'bg-[#F0FF7A]/10 text-[#F0FF7A]' },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="flex items-center gap-3 p-4 bg-[#0B0B0B] border border-[#232323] rounded-xl"
                        >
                            <div className={`p-2 rounded-lg ${item.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold">{item.value}</p>
                                <p className="text-sm text-gray-500">{item.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
