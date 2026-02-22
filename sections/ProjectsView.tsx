'use client';

import { useMemo, useState } from 'react';
import {
  FolderKanban,
  Loader2,
  LayoutGrid,
  List,
  GanttChartSquare,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ArrowRight,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';

type ViewMode = 'overview' | 'list' | 'timeline';
type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

interface ProjectTask {
  _id: Id<'tasks'>;
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
}

interface ProjectSummary {
  name: string;
  tasks: ProjectTask[];
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  highOpen: number;
  health: 'green' | 'yellow' | 'red';
}

const getProjectName = (tags: string[]) => {
  const value = tags.find((tag) => tag.toLowerCase().startsWith('project:'));
  if (!value) return 'Unscoped';
  const projectName = value.split(':').slice(1).join(':').trim();
  return projectName || 'Unscoped';
};

const safeDate = (isoDate: string) => {
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const healthClass = {
  green: 'text-green-400 bg-green-400/10',
  yellow: 'text-amber-400 bg-amber-400/10',
  red: 'text-red-400 bg-red-400/10',
} as const;

export function ProjectsView() {
  const { openTask } = useTaskModal();
  const rawTeamTasks = useQuery(api.tasks.listTeam);

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const teamTasks = useMemo(() => rawTeamTasks ?? [], [rawTeamTasks]);
  const today = new Date().toISOString().split('T')[0];

  const projects = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const task of teamTasks) {
      const projectName = getProjectName(task.tags);
      const list = map.get(projectName) ?? [];
      list.push({
        _id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status as TaskStatus,
        priority: task.priority,
      });
      map.set(projectName, list);
    }

    const summaries: ProjectSummary[] = Array.from(map.entries()).map(([name, tasks]) => {
      const sortedTasks = tasks.sort((a, b) => safeDate(a.dueDate) - safeDate(b.dueDate));
      const total = sortedTasks.length;
      const done = sortedTasks.filter((task) => task.status === 'done').length;
      const inProgress = sortedTasks.filter((task) => task.status === 'in-progress').length;
      const overdue = sortedTasks.filter(
        (task) => task.status !== 'done' && task.dueDate < today
      ).length;
      const highOpen = sortedTasks.filter(
        (task) => task.status !== 'done' && task.priority === 'high'
      ).length;
      const doneRatio = total > 0 ? done / total : 0;

      const health: ProjectSummary['health'] =
        overdue > 0 || highOpen >= 3
          ? 'red'
          : doneRatio >= 0.6
            ? 'green'
            : 'yellow';

      return {
        name,
        tasks: sortedTasks,
        total,
        done,
        inProgress,
        overdue,
        highOpen,
        health,
      };
    });

    return summaries.sort((a, b) => b.total - a.total);
  }, [teamTasks, today]);

  const projectOptions = useMemo(
    () => ['all', ...projects.map((project) => project.name)],
    [projects]
  );

  const filteredProjects = useMemo(
    () =>
      projectFilter === 'all'
        ? projects
        : projects.filter((project) => project.name === projectFilter),
    [projectFilter, projects]
  );

  const timelineItems = useMemo(
    () =>
      filteredProjects
        .flatMap((project) =>
          project.tasks.map((task) => ({
            ...task,
            projectName: project.name,
          }))
        )
        .sort((a, b) => safeDate(a.dueDate) - safeDate(b.dueDate)),
    [filteredProjects]
  );

  if (rawTeamTasks === undefined) {
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
            <FolderKanban className="w-6 h-6 text-[#F0FF7A]" />
            Projects
          </h1>
          <p className="text-gray-400 text-sm">
            Project-level visibility over delivery health, execution load, and timeline risk.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="bg-[#181818] border border-[#232323] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
          >
            {projectOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All Projects' : option}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-[#0B0B0B] border border-[#232323] rounded-lg">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 rounded text-sm ${viewMode === 'overview' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded text-sm ${viewMode === 'timeline' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <GanttChartSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8">
          <p className="text-sm text-gray-500">
            No projects found. Add task tags like `project:onboarding-revamp` to begin grouping.
          </p>
        </div>
      ) : null}

      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.name} className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium truncate">{project.name}</h2>
                <span className={`text-xs px-2 py-1 rounded ${healthClass[project.health]}`}>
                  {project.health}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-[#181818] rounded p-2">
                  <p className="text-gray-500">Total</p>
                  <p className="font-medium mt-1">{project.total}</p>
                </div>
                <div className="bg-[#181818] rounded p-2">
                  <p className="text-gray-500">Done</p>
                  <p className="font-medium mt-1">{project.done}</p>
                </div>
                <div className="bg-[#181818] rounded p-2">
                  <p className="text-gray-500">In Progress</p>
                  <p className="font-medium mt-1">{project.inProgress}</p>
                </div>
                <div className="bg-[#181818] rounded p-2">
                  <p className="text-gray-500">Overdue</p>
                  <p className={`font-medium mt-1 ${project.overdue > 0 ? 'text-red-400' : ''}`}>{project.overdue}</p>
                </div>
              </div>

              <div className="space-y-2">
                {project.tasks.slice(0, 3).map((task) => (
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
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-gray-500 uppercase tracking-wide border-b border-[#232323]">
            <div className="col-span-4">Project</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2">Done</div>
            <div className="col-span-2">In Progress</div>
            <div className="col-span-2">Risk</div>
          </div>
          {filteredProjects.map((project) => (
            <div key={project.name} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-[#181818] text-sm items-center">
              <div className="col-span-4 font-medium truncate">{project.name}</div>
              <div className="col-span-2">{project.total}</div>
              <div className="col-span-2">{project.done}</div>
              <div className="col-span-2">{project.inProgress}</div>
              <div className="col-span-2">
                {project.overdue > 0 ? (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {project.overdue} overdue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    On track
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4 space-y-2">
          {timelineItems.length === 0 ? (
            <p className="text-sm text-gray-500">No timeline items.</p>
          ) : (
            timelineItems.map((item) => (
              <button
                key={item._id}
                onClick={() => openTask(item._id)}
                className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.projectName}</p>
                </div>
                <div className="text-xs text-gray-400 inline-flex items-center gap-1">
                  <Clock3 className="w-3 h-3" />
                  {item.dueDate}
                  <ArrowRight className="w-3 h-3" />
                  {item.status}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
