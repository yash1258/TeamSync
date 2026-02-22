'use client';

import { useMemo, useState } from 'react';
import {
  Milestone,
  Loader2,
  CalendarRange,
  Clock3,
  Target,
  ArrowRight,
  GitBranchPlus,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';
import { extractProjectNameFromTag, extractProjectTag, normalizeEntitySlug } from '@/lib/entityTags';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'canceled';

type RoadmapWorkItem =
  | {
      kind: 'task';
      id: Id<'tasks'>;
      title: string;
      status: TaskStatus;
      dueDate?: string;
      projectName?: string;
    }
  | {
      kind: 'issue';
      id: Id<'issues'>;
      title: string;
      status: IssueStatus;
      dueDate?: string;
      projectName?: string;
    };

interface TaskLite {
  _id: Id<'tasks'>;
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

interface PlanningProject {
  _id: Id<'projects'>;
  title: string;
  status: 'planned' | 'active' | 'on-hold' | 'done' | 'archived';
  startDate?: string;
  targetDate?: string;
}

interface PlanningIssue {
  _id: Id<'issues'>;
  title: string;
  status: IssueStatus;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  projectId?: Id<'projects'>;
  updatedAt: number;
}

interface ProjectWindow {
  key: string;
  name: string;
  origin: 'planning' | 'tasks' | 'hybrid';
  startDate: string;
  endDate: string;
  taskTotal: number;
  taskDone: number;
  taskInProgress: number;
  issueTotal: number;
  issueDone: number;
  issueInProgress: number;
  nextTask?: {
    _id: Id<'tasks'>;
    title: string;
    dueDate: string;
  };
  nextIssue?: {
    _id: Id<'issues'>;
    title: string;
    dueDate?: string;
    status: IssueStatus;
  };
}

const safeDateMs = (date?: string) => {
  if (!date) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const quarterLabel = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  const quarter = Math.floor(parsed.getMonth() / 3) + 1;
  return `Q${quarter} ${parsed.getFullYear()}`;
};

const pickEarliest = (dates: Array<string | undefined>, fallback: string) => {
  const valid = dates.filter(Boolean) as string[];
  if (valid.length === 0) return fallback;
  return valid.slice().sort((left, right) => safeDateMs(left) - safeDateMs(right))[0];
};

const pickLatest = (dates: Array<string | undefined>, fallback: string) => {
  const valid = dates.filter(Boolean) as string[];
  if (valid.length === 0) return fallback;
  return valid.slice().sort((left, right) => safeDateMs(right) - safeDateMs(left))[0];
};

const getProjectNameFromTask = (tags: string[]) =>
  extractProjectNameFromTag(extractProjectTag(tags)) || 'Unscoped';

const isOpenIssue = (status: IssueStatus) => status !== 'done' && status !== 'canceled';

export function RoadmapView() {
  const router = useRouter();
  const { openTask } = useTaskModal();

  const rawTeamTasks = useQuery(api.tasks.listTeam);
  const rawMilestones = useQuery(api.calendar.listMilestones);
  const rawPlanningProjects = useQuery(api.projects.list, {});
  const rawPlanningIssues = useQuery(api.issues.list, {});

  const [quarterFilter, setQuarterFilter] = useState<string>('all');

  const teamTasks = useMemo(() => (rawTeamTasks ?? []) as TaskLite[], [rawTeamTasks]);
  const milestones = useMemo(() => rawMilestones ?? [], [rawMilestones]);
  const planningProjects = useMemo(
    () => (rawPlanningProjects ?? []) as PlanningProject[],
    [rawPlanningProjects]
  );
  const planningIssues = useMemo(
    () => (rawPlanningIssues ?? []) as PlanningIssue[],
    [rawPlanningIssues]
  );

  const today = new Date().toISOString().split('T')[0];

  const projectWindows = useMemo(() => {
    const projectsByKey = new Map<string, PlanningProject>();
    const projectTitlesById = new Map<Id<'projects'>, string>();
    const issuesByProjectId = new Map<Id<'projects'>, PlanningIssue[]>();
    const taskBuckets = new Map<string, { name: string; tasks: TaskLite[] }>();

    for (const project of planningProjects) {
      const key = normalizeEntitySlug(project.title) || project._id;
      projectsByKey.set(key, project);
      projectTitlesById.set(project._id, project.title);
    }

    for (const issue of planningIssues) {
      if (!issue.projectId) continue;
      const list = issuesByProjectId.get(issue.projectId) ?? [];
      list.push(issue);
      issuesByProjectId.set(issue.projectId, list);
    }

    for (const task of teamTasks) {
      const projectName = getProjectNameFromTask(task.tags);
      const key = normalizeEntitySlug(projectName) || 'unscoped';
      const existing = taskBuckets.get(key) ?? { name: projectName, tasks: [] };
      existing.tasks.push(task);
      taskBuckets.set(key, existing);
    }

    const windowsByKey = new Map<string, ProjectWindow>();

    for (const [key, project] of projectsByKey.entries()) {
      const projectIssues = issuesByProjectId.get(project._id) ?? [];
      const projectTasks = taskBuckets.get(key)?.tasks ?? [];

      const issueTotal = projectIssues.length;
      const issueDone = projectIssues.filter((issue) => issue.status === 'done').length;
      const issueInProgress = projectIssues.filter((issue) => issue.status === 'in-progress').length;

      const taskTotal = projectTasks.length;
      const taskDone = projectTasks.filter((task) => task.status === 'done').length;
      const taskInProgress = projectTasks.filter((task) => task.status === 'in-progress').length;

      const sortedOpenIssues = projectIssues
        .filter((issue) => isOpenIssue(issue.status))
        .sort((left, right) => {
          const dueSort = safeDateMs(left.dueDate) - safeDateMs(right.dueDate);
          if (dueSort !== 0) return dueSort;
          return right.updatedAt - left.updatedAt;
        });
      const sortedOpenTasks = projectTasks
        .filter((task) => task.status !== 'done')
        .sort((left, right) => safeDateMs(left.dueDate) - safeDateMs(right.dueDate));

      windowsByKey.set(key, {
        key,
        name: project.title,
        origin: projectTasks.length > 0 ? 'hybrid' : 'planning',
        startDate: pickEarliest(
          [
            project.startDate,
            ...projectIssues.map((issue) => issue.dueDate),
            ...projectTasks.map((task) => task.dueDate),
          ],
          today
        ),
        endDate: pickLatest(
          [
            project.targetDate,
            ...projectIssues.map((issue) => issue.dueDate),
            ...projectTasks.map((task) => task.dueDate),
          ],
          today
        ),
        taskTotal,
        taskDone,
        taskInProgress,
        issueTotal,
        issueDone,
        issueInProgress,
        nextIssue: sortedOpenIssues[0]
          ? {
              _id: sortedOpenIssues[0]._id,
              title: sortedOpenIssues[0].title,
              dueDate: sortedOpenIssues[0].dueDate,
              status: sortedOpenIssues[0].status,
            }
          : undefined,
        nextTask: sortedOpenTasks[0]
          ? {
              _id: sortedOpenTasks[0]._id,
              title: sortedOpenTasks[0].title,
              dueDate: sortedOpenTasks[0].dueDate,
            }
          : undefined,
      });
    }

    for (const [key, bucket] of taskBuckets.entries()) {
      if (windowsByKey.has(key)) continue;

      const sortedTasks = bucket.tasks
        .slice()
        .sort((left, right) => safeDateMs(left.dueDate) - safeDateMs(right.dueDate));
      const taskTotal = sortedTasks.length;
      const taskDone = sortedTasks.filter((task) => task.status === 'done').length;
      const taskInProgress = sortedTasks.filter((task) => task.status === 'in-progress').length;

      windowsByKey.set(key, {
        key,
        name: bucket.name,
        origin: 'tasks',
        startDate: sortedTasks[0]?.dueDate ?? today,
        endDate: sortedTasks[sortedTasks.length - 1]?.dueDate ?? today,
        taskTotal,
        taskDone,
        taskInProgress,
        issueTotal: 0,
        issueDone: 0,
        issueInProgress: 0,
        nextTask: sortedTasks.find((task) => task.status !== 'done')
          ? {
              _id: sortedTasks.find((task) => task.status !== 'done')!._id,
              title: sortedTasks.find((task) => task.status !== 'done')!.title,
              dueDate: sortedTasks.find((task) => task.status !== 'done')!.dueDate,
            }
          : undefined,
      });
    }

    return {
      windows: Array.from(windowsByKey.values()).sort(
        (left, right) => safeDateMs(left.startDate) - safeDateMs(right.startDate)
      ),
      projectTitlesById,
    };
  }, [planningIssues, planningProjects, teamTasks, today]);

  const quarterOptions = useMemo(
    () => ['all', ...Array.from(new Set(projectWindows.windows.map((window) => quarterLabel(window.startDate))))],
    [projectWindows.windows]
  );

  const filteredWindows = useMemo(
    () =>
      quarterFilter === 'all'
        ? projectWindows.windows
        : projectWindows.windows.filter((window) => quarterLabel(window.startDate) === quarterFilter),
    [projectWindows.windows, quarterFilter]
  );

  const nowBucket = useMemo(() => {
    const taskItems: RoadmapWorkItem[] = teamTasks
      .filter((task) => task.status === 'in-progress')
      .map((task) => ({
        kind: 'task',
        id: task._id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        projectName: getProjectNameFromTask(task.tags),
      }));

    const issueItems: RoadmapWorkItem[] = planningIssues
      .filter((issue) => issue.status === 'in-progress')
      .map((issue) => ({
        kind: 'issue',
        id: issue._id,
        title: issue.title,
        status: issue.status,
        dueDate: issue.dueDate,
        projectName: issue.projectId ? projectWindows.projectTitlesById.get(issue.projectId) ?? undefined : undefined,
      }));

    return [...issueItems, ...taskItems]
      .sort((left, right) => safeDateMs(left.dueDate) - safeDateMs(right.dueDate))
      .slice(0, 8);
  }, [planningIssues, projectWindows.projectTitlesById, teamTasks]);

  const nextBucket = useMemo(() => {
    const taskItems: RoadmapWorkItem[] = teamTasks
      .filter((task) => task.status === 'todo' || task.status === 'review')
      .map((task) => ({
        kind: 'task',
        id: task._id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        projectName: getProjectNameFromTask(task.tags),
      }));

    const issueItems: RoadmapWorkItem[] = planningIssues
      .filter((issue) => issue.status === 'backlog' || issue.status === 'todo' || issue.status === 'review')
      .map((issue) => ({
        kind: 'issue',
        id: issue._id,
        title: issue.title,
        status: issue.status,
        dueDate: issue.dueDate,
        projectName: issue.projectId ? projectWindows.projectTitlesById.get(issue.projectId) ?? undefined : undefined,
      }));

    return [...issueItems, ...taskItems]
      .sort((left, right) => safeDateMs(left.dueDate) - safeDateMs(right.dueDate))
      .slice(0, 8);
  }, [planningIssues, projectWindows.projectTitlesById, teamTasks]);

  const openRoadmapItem = (item: RoadmapWorkItem) => {
    if (item.kind === 'task') {
      openTask(item.id);
      return;
    }
    router.push(`/planning?issue=${item.id}`);
  };

  if (
    rawTeamTasks === undefined ||
    rawMilestones === undefined ||
    rawPlanningProjects === undefined ||
    rawPlanningIssues === undefined
  ) {
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
            Native project and issue windows with linked execution tasks and milestone context.
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
              {filteredWindows.map((projectWindow) => {
                const totalWork = projectWindow.issueTotal + projectWindow.taskTotal;
                const totalDone = projectWindow.issueDone + projectWindow.taskDone;
                const completion = totalWork > 0 ? Math.round((totalDone / totalWork) * 100) : 0;

                return (
                  <div key={projectWindow.key} className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{projectWindow.name}</p>
                      <span className="text-xs text-gray-500">{projectWindow.origin}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {projectWindow.startDate} {'->'} {projectWindow.endDate}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                      <div className="bg-[#0F0F0F] rounded px-2 py-1">
                        Issues: {projectWindow.issueDone}/{projectWindow.issueTotal}
                      </div>
                      <div className="bg-[#0F0F0F] rounded px-2 py-1">
                        Tasks: {projectWindow.taskDone}/{projectWindow.taskTotal}
                      </div>
                      <div className="bg-[#0F0F0F] rounded px-2 py-1">
                        In Flight: {projectWindow.issueInProgress + projectWindow.taskInProgress}
                      </div>
                      <div className="bg-[#0F0F0F] rounded px-2 py-1">Completion: {completion}%</div>
                    </div>

                    {projectWindow.nextIssue ? (
                      <button
                        onClick={() => router.push(`/planning?issue=${projectWindow.nextIssue!._id}`)}
                        className="mt-3 w-full text-left bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2 text-sm hover:border-[#333] transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{projectWindow.nextIssue.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Next issue • {projectWindow.nextIssue.status}</p>
                        </div>
                        <span className="text-xs text-gray-500">{projectWindow.nextIssue.dueDate || 'No due date'}</span>
                      </button>
                    ) : projectWindow.nextTask ? (
                      <button
                        onClick={() => openTask(projectWindow.nextTask!._id)}
                        className="mt-3 w-full text-left bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2 text-sm hover:border-[#333] transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{projectWindow.nextTask.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Next task</p>
                        </div>
                        <span className="text-xs text-gray-500">{projectWindow.nextTask.dueDate}</span>
                      </button>
                    ) : null}
                  </div>
                );
              })}
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
            <p className="text-sm text-gray-500">No in-progress work items.</p>
          ) : (
            <div className="space-y-2">
              {nowBucket.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  onClick={() => openRoadmapItem(item)}
                  className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm truncate">{item.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#2E2E2E] bg-[#121212] text-gray-400 inline-flex items-center gap-1">
                      {item.kind === 'issue' ? <GitBranchPlus className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      {item.kind}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.projectName ? `${item.projectName} • ` : ''}
                    {item.status}
                    {item.dueDate ? ` • Due ${item.dueDate}` : ''}
                  </p>
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
            <p className="text-sm text-gray-500">No queued work items.</p>
          ) : (
            <div className="space-y-2">
              {nextBucket.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  onClick={() => openRoadmapItem(item)}
                  className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm truncate">{item.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#2E2E2E] bg-[#121212] text-gray-400 inline-flex items-center gap-1">
                      {item.kind === 'issue' ? <GitBranchPlus className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      {item.kind}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.projectName ? `${item.projectName} • ` : ''}
                    {item.status}
                    {item.dueDate ? ` • Due ${item.dueDate}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
