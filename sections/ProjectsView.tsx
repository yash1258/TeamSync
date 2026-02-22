'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Plus,
  X,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';
import { buildIssueTag, buildProjectTagFromName, extractProjectNameFromTag, extractProjectTag } from '@/lib/entityTags';

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
  key: string;
  name: string;
  tasks: ProjectTask[];
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  highOpen: number;
  issueTotal: number;
  issueDone: number;
  health: 'green' | 'yellow' | 'red';
  status?: 'planned' | 'active' | 'on-hold' | 'done' | 'archived';
  origin: 'tasks' | 'planning' | 'hybrid';
  planningProjectId?: Id<'projects'>;
}

interface PlanningProject {
  _id: Id<'projects'>;
  title: string;
  status: 'planned' | 'active' | 'on-hold' | 'done' | 'archived';
  health: 'green' | 'yellow' | 'red';
  summary?: string;
  targetDate?: string;
}

interface PlanningIssue {
  _id: Id<'issues'>;
  projectId?: Id<'projects'>;
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'canceled';
}

const getProjectName = (tags: string[]) => {
  return extractProjectNameFromTag(extractProjectTag(tags)) || 'Unscoped';
};

const safeDate = (isoDate: string) => {
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const todayIso = () => new Date().toISOString().split('T')[0];

const normalizeProjectKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const mapPlanningHealth = (
  health: PlanningProject['health'],
  status: PlanningProject['status']
): ProjectSummary['health'] => {
  if (status === 'done' || status === 'archived') return 'green';
  if (health === 'red') return 'red';
  if (health === 'yellow') return 'yellow';
  return status === 'planned' ? 'yellow' : 'green';
};

const healthClass = {
  green: 'text-green-400 bg-green-400/10 border border-green-400/30',
  yellow: 'text-amber-400 bg-amber-400/10 border border-amber-400/30',
  red: 'text-red-400 bg-red-400/10 border border-red-400/30',
} as const;

export function ProjectsView() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { openTask } = useTaskModal();

  const rawTeamTasks = useQuery(api.tasks.listTeam);
  const rawPlanningProjects = useQuery(api.projects.list, {});
  const rawPlanningIssues = useQuery(api.issues.list, {});
  const currentMember = useQuery(api.teamMembers.getCurrentMember);

  const createProject = useMutation(api.projects.create);
  const createIssue = useMutation(api.issues.create);
  const createTask = useMutation(api.tasks.create);

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState({
    title: '',
    summary: '',
    startDate: '',
    targetDate: '',
    createNativeIssue: true,
    createKickoffTask: true,
  });

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreateProjectModal(true);
    }
  }, [searchParams]);

  const closeCreateProjectModal = () => {
    setShowCreateProjectModal(false);
    if (searchParams.get('create') !== '1') return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('create');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const teamTasks = useMemo(() => rawTeamTasks ?? [], [rawTeamTasks]);
  const planningProjects = useMemo(
    () => (rawPlanningProjects ?? []) as PlanningProject[],
    [rawPlanningProjects]
  );
  const planningIssues = useMemo(
    () => (rawPlanningIssues ?? []) as PlanningIssue[],
    [rawPlanningIssues]
  );

  const today = todayIso();

  const projects = useMemo(() => {
    const issuesByProjectId = new Map<Id<'projects'>, { total: number; done: number }>();
    for (const issue of planningIssues) {
      if (!issue.projectId) continue;
      const bucket = issuesByProjectId.get(issue.projectId) ?? { total: 0, done: 0 };
      bucket.total += 1;
      if (issue.status === 'done') {
        bucket.done += 1;
      }
      issuesByProjectId.set(issue.projectId, bucket);
    }

    const taskBuckets = new Map<string, { name: string; tasks: ProjectTask[] }>();

    for (const task of teamTasks) {
      const projectLabel = getProjectName(task.tags);
      const key = normalizeProjectKey(projectLabel) || 'unscoped';
      const bucket = taskBuckets.get(key) ?? { name: projectLabel, tasks: [] };

      bucket.tasks.push({
        _id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status as TaskStatus,
        priority: task.priority,
      });

      taskBuckets.set(key, bucket);
    }

    const summariesByKey = new Map<string, ProjectSummary>();

    for (const [key, bucket] of taskBuckets.entries()) {
      const sortedTasks = bucket.tasks.sort((left, right) => safeDate(left.dueDate) - safeDate(right.dueDate));
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

      summariesByKey.set(key, {
        key,
        name: bucket.name,
        tasks: sortedTasks,
        total,
        done,
        inProgress,
        overdue,
        highOpen,
        issueTotal: 0,
        issueDone: 0,
        health,
        origin: 'tasks',
      });
    }

    for (const project of planningProjects) {
      const key = normalizeProjectKey(project.title);
      const existing = summariesByKey.get(key);
      const issueStats = issuesByProjectId.get(project._id) ?? { total: 0, done: 0 };

      if (existing) {
        summariesByKey.set(key, {
          ...existing,
          name: project.title,
          status: project.status,
          issueTotal: issueStats.total,
          issueDone: issueStats.done,
          origin: 'hybrid',
          planningProjectId: project._id,
        });
        continue;
      }

      summariesByKey.set(key, {
        key,
        name: project.title,
        tasks: [],
        total: 0,
        done: 0,
        inProgress: 0,
        overdue: 0,
        highOpen: 0,
        issueTotal: issueStats.total,
        issueDone: issueStats.done,
        health: mapPlanningHealth(project.health, project.status),
        status: project.status,
        origin: 'planning',
        planningProjectId: project._id,
      });
    }

    return Array.from(summariesByKey.values()).sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      return left.name.localeCompare(right.name);
    });
  }, [planningIssues, planningProjects, teamTasks, today]);

  const projectOptions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((project) => project.name)))],
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
        .sort((left, right) => safeDate(left.dueDate) - safeDate(right.dueDate)),
    [filteredProjects]
  );

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = projectDraft.title.trim();
    if (!title) {
      setCreateProjectError('Project title is required.');
      return;
    }

    setIsCreatingProject(true);
    setCreateProjectError(null);

    try {
      const projectId = await createProject({
        title,
        summary: projectDraft.summary.trim() || undefined,
        status: 'planned',
        health: 'green',
        leadId: currentMember?._id ?? undefined,
        startDate: projectDraft.startDate || undefined,
        targetDate: projectDraft.targetDate || undefined,
      });

      let createdIssueId: Id<'issues'> | null = null;

      if (projectDraft.createNativeIssue) {
        if (!currentMember?._id) {
          throw new Error('Join the team before creating native issues.');
        }

        createdIssueId = await createIssue({
          title: `${title} kickoff`,
          description:
            projectDraft.summary.trim() ||
            `Kickoff scope, sequencing, and delivery plan for ${title}.`,
          projectId,
          status: 'backlog',
          priority: 'medium',
          dueDate: projectDraft.targetDate || undefined,
          ownerId: currentMember._id,
          assigneeId: currentMember._id,
        });
      }

      if (projectDraft.createKickoffTask) {
        if (!currentMember?._id) {
          throw new Error('Join the team before creating kickoff tasks.');
        }

        await createTask({
          title: `${title} kickoff`,
          description:
            projectDraft.summary.trim() ||
            `Kickoff planning and scope definition for ${title}.`,
          status: 'todo',
          priority: 'medium',
          visibility: 'team',
          ownerId: currentMember._id,
          assigneeId: currentMember._id,
          dueDate: projectDraft.targetDate || todayIso(),
          tags: [
            buildProjectTagFromName(title),
            ...(createdIssueId ? [buildIssueTag(createdIssueId)] : []),
          ],
        });
      }

      setProjectFilter(title);
      closeCreateProjectModal();
      setProjectDraft({
        title: '',
        summary: '',
        startDate: '',
        targetDate: '',
        createNativeIssue: true,
        createKickoffTask: true,
      });
    } catch (error) {
      setCreateProjectError(
        error instanceof Error ? error.message : 'Failed to create project.'
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  if (
    rawTeamTasks === undefined ||
    rawPlanningProjects === undefined ||
    rawPlanningIssues === undefined ||
    currentMember === undefined
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <>
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
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>

            <div className="flex items-center gap-2 bg-[#0B0B0B] border border-[#232323] rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Filter</span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="bg-[#181818] border border-[#232323] rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
              >
                {projectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Projects' : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0B0B0B] border border-[#232323] rounded-lg">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'overview' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
                title="Overview"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
                title="List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'timeline' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'}`}
                title="Timeline"
              >
                <GanttChartSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-8">
            <p className="text-sm text-gray-500 mb-4">
              No projects found. Add task tags like `project:onboarding-revamp` to begin grouping.
            </p>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181818] border border-[#232323] text-sm hover:border-[#333] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Make New Project
            </button>
          </div>
        ) : null}

        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((project) => (
              <div key={project.key} className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium truncate">{project.name}</h2>
                  <div className="flex items-center gap-2">
                    {project.status ? (
                      <span className="text-[10px] px-2 py-1 rounded border border-[#2E2E2E] bg-[#121212] text-gray-400">
                        {project.status}
                      </span>
                    ) : null}
                    <span className={`text-xs px-2 py-1 rounded ${healthClass[project.health]}`}>
                      {project.health}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-xs">
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
                  <div className="bg-[#181818] rounded p-2">
                    <p className="text-gray-500">Issues</p>
                    <p className="font-medium mt-1">
                      {project.issueDone}/{project.issueTotal}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {project.tasks.length === 0 ? (
                    <p className="text-xs text-gray-500 px-1">No linked issues yet.</p>
                  ) : (
                    project.tasks.slice(0, 3).map((task) => (
                      <button
                        key={task._id}
                        onClick={() => openTask(task._id)}
                        className="w-full text-left bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 hover:border-[#333] transition-colors"
                      >
                        <p className="text-sm truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                      </button>
                    ))
                  )}
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
              <div key={project.key} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-[#181818] text-sm items-center">
                <div className="col-span-4 min-w-0">
                  <p className="font-medium truncate">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {project.status ? `${project.status} • ` : ''}
                    issues {project.issueDone}/{project.issueTotal}
                  </p>
                </div>
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

      {showCreateProjectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isCreatingProject) {
              closeCreateProjectModal();
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Make New Project</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Create a connected project with optional kickoff issue and kickoff task.
                </p>
              </div>
              <button
                onClick={closeCreateProjectModal}
                disabled={isCreatingProject}
                className="p-2 rounded-lg hover:bg-[#181818] text-gray-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Project Name</label>
                <input
                  value={projectDraft.title}
                  onChange={(event) =>
                    setProjectDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Growth analytics revamp"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Summary</label>
                <textarea
                  value={projectDraft.summary}
                  onChange={(event) =>
                    setProjectDraft((current) => ({ ...current, summary: event.target.value }))
                  }
                  placeholder="What is this project trying to ship?"
                  rows={3}
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={projectDraft.startDate}
                    onChange={(event) =>
                      setProjectDraft((current) => ({ ...current, startDate: event.target.value }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Target Date</label>
                  <input
                    type="date"
                    value={projectDraft.targetDate}
                    onChange={(event) =>
                      setProjectDraft((current) => ({ ...current, targetDate: event.target.value }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={projectDraft.createNativeIssue}
                  onChange={(event) =>
                    setProjectDraft((current) => ({
                      ...current,
                      createNativeIssue: event.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-[#2C2C2C] bg-[#181818]"
                />
                <span className="text-gray-400">
                  Auto-create a native kickoff issue in the planning graph.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={projectDraft.createKickoffTask}
                  onChange={(event) =>
                    setProjectDraft((current) => ({
                      ...current,
                      createKickoffTask: event.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-[#2C2C2C] bg-[#181818]"
                />
                <span className="text-gray-400">
                  Auto-create a kickoff task tagged with
                  <code className="mx-1 text-[#F0FF7A]">{buildProjectTagFromName(projectDraft.title || 'your-project')}</code>
                  and linked issue tag when a native issue is created.
                </span>
              </label>

              {createProjectError ? (
                <p className="text-xs text-red-400">{createProjectError}</p>
              ) : null}

              <div className="pt-2 border-t border-[#232323] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateProjectModal}
                  disabled={isCreatingProject}
                  className="px-3 py-2 rounded-lg bg-[#181818] border border-[#232323] text-sm hover:border-[#333] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0FF7A] text-[#010101] text-sm font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-70"
                >
                  {isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
