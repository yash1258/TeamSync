'use client';

import { useMemo, useState } from 'react';
import {
  Milestone,
  Loader2,
  CalendarRange,
  Clock3,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';

interface ProjectWindow {
  name: string;
  startDate: string;
  endDate: string;
  total: number;
  done: number;
  inProgress: number;
  nextTask?: {
    _id: Id<'tasks'>;
    title: string;
    dueDate: string;
  };
}

const getProjectName = (tags: string[]) => {
  const value = tags.find((tag) => tag.toLowerCase().startsWith('project:'));
  if (!value) return 'Unscoped';
  const name = value.split(':').slice(1).join(':').trim();
  return name || 'Unscoped';
};

const safeDateMs = (date: string) => {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const quarterLabel = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  const quarter = Math.floor(parsed.getMonth() / 3) + 1;
  return `Q${quarter} ${parsed.getFullYear()}`;
};

export function RoadmapView() {
  const { openTask } = useTaskModal();
  const rawTeamTasks = useQuery(api.tasks.listTeam);
  const rawMilestones = useQuery(api.calendar.listMilestones);
  const [quarterFilter, setQuarterFilter] = useState<string>('all');

  const teamTasks = useMemo(() => rawTeamTasks ?? [], [rawTeamTasks]);
  const milestones = useMemo(() => rawMilestones ?? [], [rawMilestones]);
  const today = new Date().toISOString().split('T')[0];

  const projectWindows = useMemo(() => {
    const groups = new Map<string, typeof teamTasks>();
    for (const task of teamTasks) {
      const project = getProjectName(task.tags);
      const list = groups.get(project) ?? [];
      list.push(task);
      groups.set(project, list);
    }

    const windows: ProjectWindow[] = Array.from(groups.entries()).map(([name, tasks]) => {
      const sorted = tasks.sort((a, b) => safeDateMs(a.dueDate) - safeDateMs(b.dueDate));
      const startDate = sorted[0]?.dueDate ?? today;
      const endDate = sorted[sorted.length - 1]?.dueDate ?? today;
      const total = sorted.length;
      const done = sorted.filter((task) => task.status === 'done').length;
      const inProgress = sorted.filter((task) => task.status === 'in-progress').length;
      const nextTask = sorted.find((task) => task.status !== 'done');

      return {
        name,
        startDate,
        endDate,
        total,
        done,
        inProgress,
        nextTask: nextTask
          ? { _id: nextTask._id, title: nextTask.title, dueDate: nextTask.dueDate }
          : undefined,
      };
    });

    return windows.sort((a, b) => safeDateMs(a.startDate) - safeDateMs(b.startDate));
  }, [teamTasks, today]);

  const quarterOptions = useMemo(
    () => ['all', ...Array.from(new Set(projectWindows.map((window) => quarterLabel(window.startDate))))],
    [projectWindows]
  );

  const filteredWindows = useMemo(
    () =>
      quarterFilter === 'all'
        ? projectWindows
        : projectWindows.filter((window) => quarterLabel(window.startDate) === quarterFilter),
    [projectWindows, quarterFilter]
  );

  const nowBucket = useMemo(
    () => teamTasks.filter((task) => task.status === 'in-progress').slice(0, 6),
    [teamTasks]
  );
  const nextBucket = useMemo(
    () =>
      teamTasks
        .filter((task) => task.status === 'todo' || task.status === 'review')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 6),
    [teamTasks]
  );

  if (rawTeamTasks === undefined || rawMilestones === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            <Milestone className="w-6 h-6 text-[#F0FF7A]" />
            Roadmap
          </h1>
          <p className="text-gray-400 text-sm">
            Quarter-level view across project delivery windows, milestones, and execution flow.
          </p>
        </div>
        <select
          value={quarterFilter}
          onChange={(event) => setQuarterFilter(event.target.value)}
          className="bg-[#181818] border border-[#232323] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
        >
          {quarterOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All Quarters' : option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#F0FF7A]" />
            Project Windows
          </h2>
          {filteredWindows.length === 0 ? (
            <p className="text-sm text-gray-500">No roadmap windows found.</p>
          ) : (
            <div className="space-y-3">
              {filteredWindows.map((window) => (
                <div key={window.name} className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{window.name}</p>
                    <span className="text-xs text-gray-500">
                      {window.total} issues
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {window.startDate} {'->'} {window.endDate}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="bg-[#0F0F0F] rounded px-2 py-1">Done: {window.done}</div>
                    <div className="bg-[#0F0F0F] rounded px-2 py-1">In Progress: {window.inProgress}</div>
                    <div className="bg-[#0F0F0F] rounded px-2 py-1">
                      Completion: {window.total > 0 ? Math.round((window.done / window.total) * 100) : 0}%
                    </div>
                  </div>
                  {window.nextTask ? (
                    <button
                      onClick={() => openTask(window.nextTask._id)}
                      className="mt-3 w-full text-left bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2 text-sm hover:border-[#333] transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{window.nextTask.title}</span>
                      <span className="text-xs text-gray-500">{window.nextTask.dueDate}</span>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#F0FF7A]" />
            Milestones
          </h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-500">No milestones configured.</p>
          ) : (
            <div className="space-y-2">
              {milestones.slice(0, 8).map((milestone) => (
                <div key={milestone._id} className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                  <p className="text-sm font-medium truncate">{milestone.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{milestone.dueDate}</p>
                  <p className="text-xs mt-1 text-gray-400">{milestone.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 inline-flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-[#F0FF7A]" />
            Now
          </h2>
          {nowBucket.length === 0 ? (
            <p className="text-sm text-gray-500">No in-progress tasks.</p>
          ) : (
            <div className="space-y-2">
              {nowBucket.map((task) => (
                <button
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors"
                >
                  <p className="text-sm truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[#F0FF7A]" />
            Next
          </h2>
          {nextBucket.length === 0 ? (
            <p className="text-sm text-gray-500">No queued tasks.</p>
          ) : (
            <div className="space-y-2">
              {nextBucket.map((task) => (
                <button
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors"
                >
                  <p className="text-sm truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
