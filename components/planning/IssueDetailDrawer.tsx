'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Link2, X, Trash2, ArrowRight, Plus } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useTaskModal } from '@/components/TaskModalContext';
import {
  buildIssueTag,
  buildProjectTagFromName,
  hasIssueTag,
  mergeUniqueTags,
} from '@/lib/entityTags';

type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'canceled';
type IssuePriority = 'low' | 'medium' | 'high';
type IssueRelationType = 'blocks' | 'depends_on' | 'related_to' | 'duplicate_of';

interface PlanningIssue {
  _id: Id<'issues'>;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  projectTitle?: string | null;
  cycleName?: string | null;
  ownerName: string;
  assigneeName?: string | null;
  dueDate?: string;
  updatedAt: number;
}

interface TeamTask {
  _id: Id<'tasks'>;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  tags: string[];
  assignee?: {
    name?: string;
  } | null;
}

interface IssueRelation {
  _id: Id<'issueRelations'>;
  fromIssueId: Id<'issues'>;
  toIssueId: Id<'issues'>;
  relationType: IssueRelationType;
  fromIssueTitle: string;
  toIssueTitle: string;
  createdAt: number;
}

interface IssueDetailDrawerProps {
  issueId: Id<'issues'>;
  onClose: () => void;
}

const relationLabel: Record<IssueRelationType, { outgoing: string; incoming: string }> = {
  blocks: { outgoing: 'Blocks', incoming: 'Blocked by' },
  depends_on: { outgoing: 'Depends on', incoming: 'Dependency for' },
  related_to: { outgoing: 'Related to', incoming: 'Related to' },
  duplicate_of: { outgoing: 'Duplicate of', incoming: 'Duplicate reported by' },
};

const priorityClass: Record<IssuePriority, string> = {
  low: 'text-green-400 bg-green-500/10 border border-green-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  high: 'text-red-400 bg-red-500/10 border border-red-500/20',
};

const statusClass: Record<IssueStatus, string> = {
  backlog: 'text-gray-300 bg-gray-500/10 border border-gray-500/20',
  todo: 'text-gray-300 bg-gray-500/10 border border-gray-500/20',
  'in-progress': 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  review: 'text-amber-300 bg-amber-500/10 border border-amber-500/20',
  done: 'text-green-400 bg-green-500/10 border border-green-500/20',
  canceled: 'text-red-300 bg-red-500/10 border border-red-500/20',
};

const taskStatusClass: Record<TeamTask['status'], string> = {
  todo: 'text-gray-300 bg-gray-500/10 border border-gray-500/20',
  'in-progress': 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  review: 'text-amber-300 bg-amber-500/10 border border-amber-500/20',
  done: 'text-green-400 bg-green-500/10 border border-green-500/20',
};

const todayIso = () => new Date().toISOString().split('T')[0];

export function IssueDetailDrawer({ issueId, onClose }: IssueDetailDrawerProps) {
  const { openTask } = useTaskModal();
  const issue = useQuery(api.issues.getById, { id: issueId }) as PlanningIssue | null | undefined;
  const rawIssues = useQuery(api.issues.list, {});
  const rawRelations = useQuery(api.issueRelations.listForIssue, { issueId });
  const rawTeamTasks = useQuery(api.tasks.listTeam);
  const rawTeamMembers = useQuery(api.teamMembers.list);
  const currentMember = useQuery(api.teamMembers.getCurrentMember);

  const createRelation = useMutation(api.issueRelations.create);
  const removeRelation = useMutation(api.issueRelations.remove);
  const updateIssue = useMutation(api.issues.update);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);

  const [relationTypeDraft, setRelationTypeDraft] = useState<IssueRelationType>('depends_on');
  const [targetIssueIdDraft, setTargetIssueIdDraft] = useState<string>('');
  const [isCreatingRelation, setIsCreatingRelation] = useState(false);
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);
  const [isLinkingTask, setIsLinkingTask] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [removingRelationId, setRemovingRelationId] = useState<Id<'issueRelations'> | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<IssueStatus>('backlog');
  const [priorityDraft, setPriorityDraft] = useState<IssuePriority>('medium');
  const [linkTaskIdDraft, setLinkTaskIdDraft] = useState<string>('');
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    priority: 'medium' as TeamTask['priority'],
    dueDate: todayIso(),
    assigneeId: '',
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  useEffect(() => {
    if (!issue) return;
    setStatusDraft(issue.status);
    setPriorityDraft(issue.priority);
  }, [issue]);

  const issues = useMemo(() => (rawIssues ?? []) as PlanningIssue[], [rawIssues]);
  const relations = useMemo(() => (rawRelations ?? []) as IssueRelation[], [rawRelations]);
  const teamTasks = useMemo(() => (rawTeamTasks ?? []) as TeamTask[], [rawTeamTasks]);
  const teamMembers = useMemo(() => rawTeamMembers ?? [], [rawTeamMembers]);

  const issueTag = useMemo(() => buildIssueTag(issueId), [issueId]);
  const projectTag = useMemo(
    () => (issue?.projectTitle ? buildProjectTagFromName(issue.projectTitle) : null),
    [issue?.projectTitle]
  );

  const relationTargets = useMemo(
    () =>
      issues
        .filter((candidate) => candidate._id !== issueId)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [issueId, issues]
  );

  useEffect(() => {
    if (!targetIssueIdDraft && relationTargets.length > 0) {
      setTargetIssueIdDraft(relationTargets[0]._id);
    }
  }, [targetIssueIdDraft, relationTargets]);

  useEffect(() => {
    if (taskDraft.assigneeId || teamMembers.length === 0) return;
    const preferredAssigneeId = currentMember?._id ?? teamMembers[0]?._id ?? '';
    if (!preferredAssigneeId) return;
    setTaskDraft((current) => ({ ...current, assigneeId: preferredAssigneeId }));
  }, [currentMember?._id, taskDraft.assigneeId, teamMembers]);

  useEffect(() => {
    if (!issue) return;
    setTaskDraft((current) => ({
      ...current,
      title: current.title || `${issue.title} execution`,
      dueDate: issue.dueDate || current.dueDate || todayIso(),
    }));
  }, [issue]);

  const sortedRelations = useMemo(
    () => relations.slice().sort((left, right) => right.createdAt - left.createdAt),
    [relations]
  );

  const linkedTasks = useMemo(
    () =>
      teamTasks
        .filter((task) => hasIssueTag(task.tags, issueId))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [issueId, teamTasks]
  );

  const linkableTasks = useMemo(
    () =>
      teamTasks
        .filter((task) => !hasIssueTag(task.tags, issueId))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
        .slice(0, 40),
    [issueId, teamTasks]
  );

  useEffect(() => {
    if (!linkTaskIdDraft && linkableTasks.length > 0) {
      setLinkTaskIdDraft(linkableTasks[0]._id);
    }
  }, [linkTaskIdDraft, linkableTasks]);

  const handleCreateRelation = async () => {
    if (!targetIssueIdDraft) {
      setRelationError('Select a target issue first.');
      return;
    }

    setRelationError(null);
    setIsCreatingRelation(true);
    try {
      await createRelation({
        fromIssueId: issueId,
        toIssueId: targetIssueIdDraft as Id<'issues'>,
        relationType: relationTypeDraft,
      });
    } catch (error) {
      setRelationError(error instanceof Error ? error.message : 'Failed to create issue relation.');
    } finally {
      setIsCreatingRelation(false);
    }
  };

  const handleRemoveRelation = async (relationId: Id<'issueRelations'>) => {
    setRelationError(null);
    setRemovingRelationId(relationId);
    try {
      await removeRelation({ id: relationId });
    } catch (error) {
      setRelationError(error instanceof Error ? error.message : 'Failed to remove issue relation.');
    } finally {
      setRemovingRelationId(null);
    }
  };

  const handleUpdateIssue = async () => {
    if (!issue) return;
    if (statusDraft === issue.status && priorityDraft === issue.priority) return;

    setUpdateError(null);
    setIsUpdatingIssue(true);
    try {
      await updateIssue({
        id: issueId,
        status: statusDraft,
        priority: priorityDraft,
      });
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update issue.');
    } finally {
      setIsUpdatingIssue(false);
    }
  };

  const handleLinkTask = async () => {
    if (!linkTaskIdDraft) {
      setTaskError('Select a task to link.');
      return;
    }

    const targetTask = teamTasks.find((task) => task._id === linkTaskIdDraft);
    if (!targetTask) {
      setTaskError('Task not found.');
      return;
    }

    setTaskError(null);
    setIsLinkingTask(true);
    try {
      await updateTask({
        id: targetTask._id,
        tags: mergeUniqueTags(
          targetTask.tags,
          [issueTag],
          projectTag ? [projectTag] : []
        ),
      });
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Failed to link task to issue.');
    } finally {
      setIsLinkingTask(false);
    }
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = taskDraft.title.trim();
    if (!title) {
      setTaskError('Task title is required.');
      return;
    }
    if (!currentMember?._id) {
      setTaskError('Join the team before creating tasks.');
      return;
    }

    setTaskError(null);
    setIsCreatingTask(true);
    try {
      const taskId = await createTask({
        title,
        description: issue
          ? `Execution task linked to issue: ${issue.title}`
          : 'Execution task linked to native issue',
        status: 'todo',
        priority: taskDraft.priority,
        visibility: 'team',
        ownerId: currentMember._id,
        assigneeId: (taskDraft.assigneeId || currentMember._id) as Id<'teamMembers'>,
        dueDate: taskDraft.dueDate || issue?.dueDate || todayIso(),
        tags: mergeUniqueTags([issueTag], projectTag ? [projectTag] : []),
      });
      setTaskDraft((current) => ({
        ...current,
        title: issue ? `${issue.title} follow-up` : '',
      }));
      openTask(taskId);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="flex-1 cursor-default"
        aria-label="Close issue drawer backdrop"
      />
      <aside className="w-full max-w-2xl h-full overflow-y-auto bg-[#0B0B0B] border-l border-[#232323]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B] border-b border-[#232323] px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">Issue Detail</p>
            <h2 className="text-lg font-semibold truncate mt-1">
              {issue?.title ?? 'Loading issue...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#181818] text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {issue === undefined ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F0FF7A]" />
          </div>
        ) : issue === null ? (
          <div className="p-6">
            <p className="text-sm text-gray-500">Issue not found.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] px-2 py-1 rounded ${statusClass[issue.status]}`}>
                  {issue.status}
                </span>
                <span className={`text-[11px] px-2 py-1 rounded ${priorityClass[issue.priority]}`}>
                  {issue.priority}
                </span>
                {issue.projectTitle ? (
                  <span className="text-[11px] px-2 py-1 rounded border border-[#2A2A2A] bg-[#131313] text-gray-300">
                    {issue.projectTitle}
                  </span>
                ) : null}
                {issue.cycleName ? (
                  <span className="text-[11px] px-2 py-1 rounded border border-[#2A2A2A] bg-[#131313] text-gray-300">
                    {issue.cycleName}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {issue.description || 'No issue description yet.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-[#232323] bg-[#131313] p-3">
                  <p className="text-gray-500">Owner</p>
                  <p className="text-gray-200 mt-1">{issue.ownerName}</p>
                </div>
                <div className="rounded-lg border border-[#232323] bg-[#131313] p-3">
                  <p className="text-gray-500">Assignee</p>
                  <p className="text-gray-200 mt-1">{issue.assigneeName ?? 'Unassigned'}</p>
                </div>
              </div>
            </div>

            <section className="rounded-xl border border-[#232323] bg-[#101010] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-sm">Quick State Update</h3>
                <button
                  onClick={() => void handleUpdateIssue()}
                  disabled={
                    isUpdatingIssue ||
                    (statusDraft === issue.status && priorityDraft === issue.priority)
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F0FF7A] text-[#010101] text-xs font-medium disabled:opacity-60"
                >
                  {isUpdatingIssue ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Apply
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Status</label>
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as IssueStatus)}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Priority</label>
                  <select
                    value={priorityDraft}
                    onChange={(event) => setPriorityDraft(event.target.value as IssuePriority)}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              {updateError ? <p className="text-xs text-red-400">{updateError}</p> : null}
            </section>

            <section className="rounded-xl border border-[#232323] bg-[#101010] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-sm">Linked Tasks ({linkedTasks.length})</h3>
                <span className="text-[11px] px-2 py-1 rounded border border-[#2A2A2A] bg-[#141414] text-gray-400">
                  {issueTag}
                </span>
              </div>

              {linkedTasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks linked to this issue yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedTasks.slice(0, 8).map((task) => (
                    <button
                      key={task._id}
                      onClick={() => openTask(task._id)}
                      className="w-full text-left rounded-lg border border-[#232323] bg-[#151515] px-3 py-2 hover:border-[#333] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm truncate">{task.title}</p>
                        <span className={`text-[10px] px-2 py-1 rounded ${priorityClass[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${taskStatusClass[task.status]}`}>
                          {task.status}
                        </span>
                        <span>Due {task.dueDate}</span>
                        {task.assignee?.name ? (
                          <>
                            <span>•</span>
                            <span>{task.assignee.name}</span>
                          </>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <select
                  value={linkTaskIdDraft}
                  onChange={(event) => setLinkTaskIdDraft(event.target.value)}
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                >
                  {linkableTasks.length === 0 ? (
                    <option value="">No unlinked tasks available</option>
                  ) : (
                    linkableTasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.title}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={() => void handleLinkTask()}
                  disabled={isLinkingTask || linkableTasks.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#181818] border border-[#2A2A2A] text-sm hover:border-[#3A3A3A] disabled:opacity-60"
                >
                  {isLinkingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Link Task
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 pt-2 border-t border-[#232323]">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Create Task</label>
                  <input
                    value={taskDraft.title}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Create execution task for this issue"
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={taskDraft.priority}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        priority: event.target.value as TeamTask['priority'],
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  />
                  <select
                    value={taskDraft.assigneeId}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        assigneeId: event.target.value,
                      }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    {teamMembers.length === 0 ? (
                      <option value="">No team members found</option>
                    ) : (
                      teamMembers.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F0FF7A] text-[#010101] text-sm font-medium disabled:opacity-60"
                >
                  {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Linked Task
                </button>
              </form>

              {taskError ? <p className="text-xs text-red-400">{taskError}</p> : null}
            </section>

            <section className="rounded-xl border border-[#232323] bg-[#101010] p-4 space-y-3">
              <h3 className="font-medium text-sm inline-flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#F0FF7A]" />
                Link Another Issue
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Relation</label>
                  <select
                    value={relationTypeDraft}
                    onChange={(event) => setRelationTypeDraft(event.target.value as IssueRelationType)}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="depends_on">Depends On</option>
                    <option value="blocks">Blocks</option>
                    <option value="related_to">Related To</option>
                    <option value="duplicate_of">Duplicate Of</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Target Issue</label>
                  <select
                    value={targetIssueIdDraft}
                    onChange={(event) => setTargetIssueIdDraft(event.target.value)}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    {relationTargets.length === 0 ? (
                      <option value="">No other issues found</option>
                    ) : (
                      relationTargets.map((candidate) => (
                        <option key={candidate._id} value={candidate._id}>
                          {candidate.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <button
                onClick={() => void handleCreateRelation()}
                disabled={isCreatingRelation || relationTargets.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181818] border border-[#2A2A2A] text-sm hover:border-[#3A3A3A] disabled:opacity-60"
              >
                {isCreatingRelation ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Add Relation
              </button>
              {relationError ? <p className="text-xs text-red-400">{relationError}</p> : null}
            </section>

            <section className="rounded-xl border border-[#232323] bg-[#101010] p-4">
              <h3 className="font-medium text-sm mb-3">Current Relations</h3>
              {sortedRelations.length === 0 ? (
                <p className="text-sm text-gray-500">No linked issues yet.</p>
              ) : (
                <div className="space-y-2">
                  {sortedRelations.map((relation) => {
                    const isOutgoing = relation.fromIssueId === issueId;
                    const otherIssueTitle = isOutgoing
                      ? relation.toIssueTitle
                      : relation.fromIssueTitle;
                    return (
                      <div
                        key={relation._id}
                        className="rounded-lg border border-[#232323] bg-[#151515] p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {relationLabel[relation.relationType][isOutgoing ? 'outgoing' : 'incoming']}
                          </p>
                          <p className="text-sm mt-1 truncate">{otherIssueTitle}</p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {new Date(relation.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => void handleRemoveRelation(relation._id)}
                          disabled={removingRelationId === relation._id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs disabled:opacity-60"
                        >
                          {removingRelationId === relation._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
