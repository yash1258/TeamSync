'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Link2, X, Trash2, ArrowRight } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

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

export function IssueDetailDrawer({ issueId, onClose }: IssueDetailDrawerProps) {
  const issue = useQuery(api.issues.getById, { id: issueId }) as PlanningIssue | null | undefined;
  const rawIssues = useQuery(api.issues.list, {});
  const rawRelations = useQuery(api.issueRelations.listForIssue, { issueId });

  const createRelation = useMutation(api.issueRelations.create);
  const removeRelation = useMutation(api.issueRelations.remove);
  const updateIssue = useMutation(api.issues.update);

  const [relationTypeDraft, setRelationTypeDraft] = useState<IssueRelationType>('depends_on');
  const [targetIssueIdDraft, setTargetIssueIdDraft] = useState<string>('');
  const [isCreatingRelation, setIsCreatingRelation] = useState(false);
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);
  const [removingRelationId, setRemovingRelationId] = useState<Id<'issueRelations'> | null>(null);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<IssueStatus>('backlog');
  const [priorityDraft, setPriorityDraft] = useState<IssuePriority>('medium');

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

  const sortedRelations = useMemo(
    () => relations.slice().sort((left, right) => right.createdAt - left.createdAt),
    [relations]
  );

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
