'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Loader2,
  Target,
  Flag,
  CalendarClock,
  MessageSquareText,
  ArrowRight,
  Plus,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  GitBranchPlus,
  Link2,
  Sparkles,
  X,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { AddTaskModal } from '@/components/AddTaskModal';
import { IssueDetailDrawer } from '@/components/planning/IssueDetailDrawer';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
type NativeIssueStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'canceled';
type NativeIssuePriority = 'low' | 'medium' | 'high';

interface ProjectBucket {
  name: string;
  tasks: Array<{
    _id: Id<'tasks'>;
    title: string;
    status: TaskStatus;
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
  }>;
}

interface NativeIssue {
  _id: Id<'issues'>;
  title: string;
  description?: string;
  status: NativeIssueStatus;
  priority: NativeIssuePriority;
  projectId?: Id<'projects'>;
  projectTitle?: string | null;
  cycleName?: string | null;
  assigneeName?: string | null;
  dueDate?: string;
  updatedAt: number;
}

const getProjectTag = (tags: string[]) => {
  const match = tags.find((tag) => tag.toLowerCase().startsWith('project:'));
  return match ? match.split(':').slice(1).join(':').trim() : null;
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-400 bg-red-400/10';
    case 'medium':
      return 'text-amber-400 bg-amber-400/10';
    default:
      return 'text-green-400 bg-green-400/10';
  }
};

export function PlanningView() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { openTask } = useTaskModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMember = useQuery(api.teamMembers.getCurrentMember);
  const teamTasks = useQuery(api.tasks.listTeam);
  const personalTasks = useQuery(
    api.tasks.listPersonal,
    currentMember?._id ? { ownerId: currentMember._id } : 'skip'
  );
  const activity = useQuery(api.dashboard.getActivity, { limit: 8 });
  const documents = useQuery(api.documents.list, {});
  const nativeIssues = useQuery(api.issues.list, {});
  const planningProjects = useQuery(api.projects.list, {});

  const updateStatus = useMutation(api.tasks.updateStatus);
  const createIssue = useMutation(api.issues.create);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showNativeIssueModal, setShowNativeIssueModal] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<Id<'tasks'> | null>(null);
  const [selectedNativeIssueId, setSelectedNativeIssueId] = useState<Id<'issues'> | null>(null);
  const [isCreatingNativeIssue, setIsCreatingNativeIssue] = useState(false);
  const [nativeIssueError, setNativeIssueError] = useState<string | null>(null);
  const [nativeIssueStatusFilter, setNativeIssueStatusFilter] = useState<
    'all' | 'active' | NativeIssueStatus
  >('active');
  const [nativeIssueProjectFilter, setNativeIssueProjectFilter] = useState<string>('all');
  const [nativeIssueDraft, setNativeIssueDraft] = useState({
    title: '',
    description: '',
    priority: 'medium' as NativeIssuePriority,
    status: 'backlog' as NativeIssueStatus,
    dueDate: '',
  });

  const replacePlanningQuery = (nextParams: URLSearchParams) => {
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const resolvedTeamTasks = useMemo(() => teamTasks ?? [], [teamTasks]);
  const resolvedPersonalTasks = useMemo(() => personalTasks ?? [], [personalTasks]);
  const resolvedActivity = useMemo(() => activity ?? [], [activity]);
  const resolvedDocuments = useMemo(() => documents ?? [], [documents]);
  const resolvedNativeIssues = useMemo(() => (nativeIssues ?? []) as NativeIssue[], [nativeIssues]);
  const resolvedPlanningProjects = useMemo(() => planningProjects ?? [], [planningProjects]);

  useEffect(() => {
    if (searchParams.get('createIssue') === '1') {
      setShowNativeIssueModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const issueParam = searchParams.get('issue');
    if (!issueParam) return;

    const matchingIssue = resolvedNativeIssues.find((issue) => issue._id === issueParam);
    if (matchingIssue) {
      setSelectedNativeIssueId(matchingIssue._id);
    }
  }, [resolvedNativeIssues, searchParams]);

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
  }, [resolvedTeamTasks, resolvedPersonalTasks, resolvedActivity, resolvedDocuments, resolvedNativeIssues]);

  const triageTasks = useMemo(
    () =>
      resolvedTeamTasks
        .filter((task) => task.status === 'todo' || task.status === 'review')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [resolvedTeamTasks]
  );

  const upcomingTasks = useMemo(
    () =>
      resolvedTeamTasks
        .filter((task) => task.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 6),
    [resolvedTeamTasks]
  );

  const blockedCount = useMemo(
    () =>
      resolvedTeamTasks.filter(
        (task) =>
          task.status !== 'done' &&
          task.tags.some((tag) => tag.toLowerCase() === 'blocked')
      ).length,
    [resolvedTeamTasks]
  );

  const projectBuckets = useMemo(() => {
    const buckets = new Map<string, ProjectBucket['tasks']>();
    for (const task of resolvedTeamTasks) {
      const project = getProjectTag(task.tags);
      if (!project) continue;
      const existing = buckets.get(project) ?? [];
      existing.push({
        _id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
      });
      buckets.set(project, existing);
    }

    return Array.from(buckets.entries())
      .map(([name, tasks]) => ({ name, tasks }))
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [resolvedTeamTasks]);

  const projectOptions = useMemo(
    () => ['all', ...projectBuckets.map((bucket) => bucket.name)],
    [projectBuckets]
  );

  const filteredProjects = useMemo(
    () =>
      projectFilter === 'all'
        ? projectBuckets
        : projectBuckets.filter((bucket) => bucket.name === projectFilter),
    [projectBuckets, projectFilter]
  );

  const decisionDocs = useMemo(
    () =>
      resolvedDocuments
        .filter((doc) => {
          const title = doc.title.toLowerCase();
          const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
          return title.includes('decision') || tags.includes('decision') || tags.includes('adr');
        })
        .slice(0, 6),
    [resolvedDocuments]
  );

  const myFocus = useMemo(
    () =>
      resolvedPersonalTasks
        .filter((task) => task.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [resolvedPersonalTasks]
  );

  const nativeIssueProjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All Projects' },
      ...resolvedPlanningProjects.map((project) => ({
        value: project._id,
        label: project.title,
      })),
    ],
    [resolvedPlanningProjects]
  );

  const filteredNativeIssues = useMemo(
    () =>
      resolvedNativeIssues
        .filter((issue) => {
          if (nativeIssueStatusFilter === 'active') {
            if (issue.status === 'done' || issue.status === 'canceled') return false;
          } else if (nativeIssueStatusFilter !== 'all' && issue.status !== nativeIssueStatusFilter) {
            return false;
          }

          if (nativeIssueProjectFilter !== 'all' && issue.projectId !== nativeIssueProjectFilter) {
            return false;
          }

          return true;
        })
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [nativeIssueProjectFilter, nativeIssueStatusFilter, resolvedNativeIssues]
  );

  const relationReadyIssues = useMemo(
    () => resolvedNativeIssues.filter((issue) => issue.status !== 'canceled').slice(0, 8),
    [resolvedNativeIssues]
  );

  const openNativeIssueDrawer = (issueId: Id<'issues'>) => {
    setSelectedNativeIssueId(issueId);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('issue', issueId);
    replacePlanningQuery(nextParams);
  };

  const closeNativeIssueDrawer = () => {
    setSelectedNativeIssueId(null);
    if (!searchParams.get('issue')) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('issue');
    replacePlanningQuery(nextParams);
  };

  const closeNativeIssueModal = () => {
    setShowNativeIssueModal(false);
    if (searchParams.get('createIssue') !== '1') return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('createIssue');
    replacePlanningQuery(nextParams);
  };

  const handlePushTaskForward = async (taskId: Id<'tasks'>, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus =
      currentStatus === 'todo'
        ? 'in-progress'
        : currentStatus === 'review'
          ? 'done'
          : currentStatus;

    if (nextStatus === currentStatus) return;
    setUpdatingTaskId(taskId);
    try {
      await updateStatus({ id: taskId, status: nextStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleCreateNativeIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = nativeIssueDraft.title.trim();
    if (!title) {
      setNativeIssueError('Issue title is required.');
      return;
    }

    setNativeIssueError(null);
    setIsCreatingNativeIssue(true);
    try {
      const issueId = await createIssue({
        title,
        description: nativeIssueDraft.description.trim() || undefined,
        status: nativeIssueDraft.status,
        priority: nativeIssueDraft.priority,
        dueDate: nativeIssueDraft.dueDate || undefined,
      });
      setNativeIssueDraft({
        title: '',
        description: '',
        priority: 'medium',
        status: 'backlog',
        dueDate: '',
      });
      closeNativeIssueModal();
      openNativeIssueDrawer(issueId);
    } catch (error) {
      setNativeIssueError(error instanceof Error ? error.message : 'Failed to create issue.');
    } finally {
      setIsCreatingNativeIssue(false);
    }
  };

  if (
    teamTasks === undefined ||
    activity === undefined ||
    documents === undefined ||
    nativeIssues === undefined ||
    planningProjects === undefined ||
    (currentMember?._id && personalTasks === undefined)
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="space-y-6">
      <div className="animate-on-scroll opacity-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#F0FF7A]" />
            Planning Hub
          </h1>
          <p className="text-gray-400 text-sm">
            Triage work, align projects, and keep decisions/context in one place.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Quick Add Issue
        </button>
      </div>

      <div className="animate-on-scroll opacity-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Triage Queue</p>
          <p className="text-2xl font-semibold">{triageTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">To Do + Review items</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">My Focus</p>
          <p className="text-2xl font-semibold">{myFocus.length}</p>
          <p className="text-xs text-gray-500 mt-1">Personal active tasks</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Blocked</p>
          <p className="text-2xl font-semibold">{blockedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Tagged with `blocked`</p>
        </div>
        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Decision Docs</p>
          <p className="text-2xl font-semibold">{decisionDocs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Tagged `decision` or `adr`</p>
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-[#F0FF7A]" />
              Triage Queue
            </h2>
          </div>
          {triageTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No triage items. Good momentum.</p>
          ) : (
            <div className="space-y-2">
              {triageTasks.map((task) => (
                <div key={task._id} className="flex items-center justify-between gap-3 p-3 bg-[#181818] border border-[#232323] rounded-lg">
                  <button onClick={() => openTask(task._id)} className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded ${getPriorityClass(task.priority)}`}>
                      {task.priority}
                    </span>
                    <button
                      onClick={() => void handlePushTaskForward(task._id, task.status)}
                      disabled={updatingTaskId === task._id}
                      className="text-xs px-2 py-1 rounded bg-[#232323] hover:bg-[#303030] transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {updatingTaskId === task._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3" />
                          Advance
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#F0FF7A]" />
            My Focus
          </h2>
          {myFocus.length === 0 ? (
            <p className="text-sm text-gray-500">No active personal tasks.</p>
          ) : (
            <div className="space-y-2">
              {myFocus.map((task) => (
                <button
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="w-full text-left p-3 bg-[#181818] border border-[#232323] rounded-lg hover:border-[#333] transition-colors"
                >
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <h2 className="font-medium flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#F0FF7A]" />
              Project Lenses (from `project:*` tags)
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
              >
                {projectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Projects' : option}
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/projects?create=1')}
                className="inline-flex items-center gap-2 bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm hover:border-[#333] transition-colors"
              >
                <Plus className="w-4 h-4 text-[#F0FF7A]" />
                New Project
              </button>
            </div>
          </div>
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add task tags like `project:landing-page` to unlock project grouping.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div key={project.name} className="p-3 bg-[#181818] border border-[#232323] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{project.name}</p>
                    <span className="text-xs text-gray-500">{project.tasks.length} issues</span>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.slice(0, 4).map((task) => (
                      <button
                        key={task._id}
                        onClick={() => openTask(task._id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded bg-[#0F0F0F] border border-[#232323] hover:border-[#333] transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{task.title}</span>
                        <span className="text-gray-500">{task.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[#F0FF7A]" />
            Team Activity
          </h2>
          {resolvedActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {resolvedActivity.map((item) => (
                <div key={item._id} className="p-3 bg-[#181818] border border-[#232323] rounded-lg">
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">{item.userName}</span>{' '}
                    <span className="text-gray-400">{item.action}</span>{' '}
                    <span className="text-[#F0FF7A]">{item.target}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <h2 className="font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#F0FF7A]" />
              Native Issues and Relations
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={nativeIssueStatusFilter}
                onChange={(event) =>
                  setNativeIssueStatusFilter(
                    event.target.value as 'all' | 'active' | NativeIssueStatus
                  )
                }
                className="bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
              >
                <option value="active">Active</option>
                <option value="all">All Statuses</option>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="canceled">Canceled</option>
              </select>
              <select
                value={nativeIssueProjectFilter}
                onChange={(event) => setNativeIssueProjectFilter(event.target.value)}
                className="bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
              >
                {nativeIssueProjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNativeIssueModal(true)}
                className="inline-flex items-center gap-2 bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm hover:border-[#333] transition-colors"
              >
                <GitBranchPlus className="w-4 h-4 text-[#F0FF7A]" />
                New Native Issue
              </button>
            </div>
          </div>

          {filteredNativeIssues.length === 0 ? (
            <p className="text-sm text-gray-500">
              No native issues found for the selected filters. Create one to start linking dependencies.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredNativeIssues.slice(0, 8).map((issue) => (
                <button
                  key={issue._id}
                  onClick={() => openNativeIssueDrawer(issue._id)}
                  className="w-full p-3 bg-[#181818] border border-[#232323] rounded-lg text-left hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate">{issue.title}</p>
                    <span className={`text-[10px] px-2 py-1 rounded ${getPriorityClass(issue.priority)}`}>
                      {issue.priority}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    <span>{issue.status}</span>
                    {issue.projectTitle ? (
                      <>
                        <span>•</span>
                        <span>{issue.projectTitle}</span>
                      </>
                    ) : null}
                    {issue.cycleName ? (
                      <>
                        <span>•</span>
                        <span>{issue.cycleName}</span>
                      </>
                    ) : null}
                    {issue.dueDate ? (
                      <>
                        <span>•</span>
                        <span>Due {issue.dueDate}</span>
                      </>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F0FF7A]" />
            Relation Coverage
          </h2>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#181818] border border-[#232323] p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Native Issues</p>
              <p className="text-2xl font-semibold mt-1">{filteredNativeIssues.length}</p>
            </div>
            <div className="rounded-lg bg-[#181818] border border-[#232323] p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Relation Ready</p>
              <p className="text-2xl font-semibold mt-1">{relationReadyIssues.length}</p>
            </div>
            <p className="text-xs text-gray-500">
              Open any native issue to add dependency links (`depends_on`, `blocks`, `related_to`, `duplicate_of`).
            </p>
          </div>
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4 text-[#F0FF7A]" />
          Decision Snapshot
        </h2>
        {decisionDocs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="w-4 h-4" />
            No decision docs found. Tag docs with `decision` or `adr`.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {decisionDocs.map((doc) => (
              <button
                key={doc._id}
                className="p-3 bg-[#181818] border border-[#232323] rounded-lg text-left hover:border-[#333] transition-colors"
              >
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>v{doc.currentVersion}</span>
                  <span>•</span>
                  <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
        <h2 className="font-medium mb-3">Upcoming Team Work</h2>
        {upcomingTasks.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming tasks.</p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <button
                key={task._id}
                onClick={() => openTask(task._id)}
                className="w-full p-3 bg-[#181818] border border-[#232323] rounded-lg text-left hover:border-[#333] transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded ${getPriorityClass(task.priority)}`}>
                  {task.priority}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultVisibility="team"
      />

      {showNativeIssueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!isCreatingNativeIssue) {
              closeNativeIssueModal();
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create Native Issue</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Native issues support dependency links through the Issue Relations drawer.
                </p>
              </div>
              <button
                onClick={closeNativeIssueModal}
                className="p-2 rounded-lg hover:bg-[#181818] text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNativeIssue} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                <input
                  value={nativeIssueDraft.title}
                  onChange={(event) =>
                    setNativeIssueDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Define issue scope"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={nativeIssueDraft.description}
                  onChange={(event) =>
                    setNativeIssueDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Context, constraints, and success criteria"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Status</label>
                  <select
                    value={nativeIssueDraft.status}
                    onChange={(event) =>
                      setNativeIssueDraft((current) => ({
                        ...current,
                        status: event.target.value as NativeIssueStatus,
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Priority</label>
                  <select
                    value={nativeIssueDraft.priority}
                    onChange={(event) =>
                      setNativeIssueDraft((current) => ({
                        ...current,
                        priority: event.target.value as NativeIssuePriority,
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={nativeIssueDraft.dueDate}
                    onChange={(event) =>
                      setNativeIssueDraft((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
              </div>

              {nativeIssueError ? <p className="text-xs text-red-400">{nativeIssueError}</p> : null}

              <div className="pt-3 border-t border-[#232323] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNativeIssueModal}
                  disabled={isCreatingNativeIssue}
                  className="px-4 py-2 bg-[#181818] rounded-lg text-sm hover:bg-[#232323] transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingNativeIssue}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {isCreatingNativeIssue ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedNativeIssueId ? (
        <IssueDetailDrawer
          issueId={selectedNativeIssueId}
          onClose={closeNativeIssueDrawer}
        />
      ) : null}
    </div>
  );
}
