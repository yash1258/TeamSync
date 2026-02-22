'use client';

import { useMemo, useState } from 'react';
import {
  Scale,
  Loader2,
  Search,
  GitBranch,
  CalendarClock,
  FileClock,
  CircleDashed,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';
import { buildProjectTagFromName, extractProjectNameFromTag, extractProjectTag } from '@/lib/entityTags';

type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
type ItemKind = 'native' | 'doc';

interface NativeDecision {
  _id: Id<'decisions'>;
  title: string;
  context: string;
  decision: string;
  consequences?: string;
  projectId?: Id<'projects'>;
  projectTitle?: string | null;
  status: DecisionStatus;
  updatedAt: number;
  decidedAt?: number;
}

interface DecisionDoc {
  _id: Id<'documents'>;
  title: string;
  description?: string;
  tags?: string[];
  currentVersion: number;
  updatedAt: number;
}

interface DecisionVersion {
  _id: Id<'documentVersions'>;
  version: number;
  createdAt: number;
  uploaderName: string;
  changeNote?: string;
}

interface PlanningIssue {
  _id: Id<'issues'>;
  title: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'canceled';
  dueDate?: string;
  projectId?: Id<'projects'>;
  projectTitle?: string | null;
}

interface PlanningProject {
  _id: Id<'projects'>;
  title: string;
}

interface DecisionListItem {
  key: string;
  id: string;
  kind: ItemKind;
  title: string;
  status: DecisionStatus;
  description?: string;
  tags?: string[];
  projectId?: Id<'projects'>;
  projectTitle?: string | null;
  updatedAt: number;
  nativeDecision?: NativeDecision;
  document?: DecisionDoc;
}

const statusClass: Record<DecisionStatus, string> = {
  proposed: 'text-blue-400 bg-blue-500/10',
  accepted: 'text-green-400 bg-green-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  superseded: 'text-amber-400 bg-amber-500/10',
};

const getDecisionSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const inferDocStatus = (doc: DecisionDoc): DecisionStatus => {
  const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
  if (tags.includes('accepted')) return 'accepted';
  if (tags.includes('rejected')) return 'rejected';
  if (tags.includes('superseded')) return 'superseded';
  return 'proposed';
};

const getProjectTagFromItem = (item: DecisionListItem) => {
  if (item.projectTitle) {
    return buildProjectTagFromName(item.projectTitle);
  }

  const fromDoc = extractProjectNameFromTag(extractProjectTag(item.tags ?? []));
  return fromDoc ? buildProjectTagFromName(fromDoc) : null;
};

export function DecisionsView() {
  const router = useRouter();
  const { openTask } = useTaskModal();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DecisionStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingDecision, setIsCreatingDecision] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    context: '',
    decision: '',
    consequences: '',
    status: 'proposed' as DecisionStatus,
    projectId: '',
  });

  const rawNativeDecisions = useQuery(api.decisions.list, {});
  const rawDocuments = useQuery(api.documents.list, {});
  const rawTasks = useQuery(api.tasks.listTeam);
  const rawIssues = useQuery(api.issues.list, {});
  const rawProjects = useQuery(api.projects.list, {});

  const createDecision = useMutation(api.decisions.create);

  const nativeDecisions = useMemo(
    () => (rawNativeDecisions ?? []) as NativeDecision[],
    [rawNativeDecisions]
  );
  const documents = useMemo(() => (rawDocuments ?? []) as DecisionDoc[], [rawDocuments]);
  const tasks = useMemo(() => rawTasks ?? [], [rawTasks]);
  const issues = useMemo(() => (rawIssues ?? []) as PlanningIssue[], [rawIssues]);
  const projects = useMemo(() => (rawProjects ?? []) as PlanningProject[], [rawProjects]);

  const decisionItems = useMemo(() => {
    const nativeTitleSet = new Set(nativeDecisions.map((decision) => getDecisionSlug(decision.title)));

    const nativeItems: DecisionListItem[] = nativeDecisions.map((decision) => ({
      key: `native:${decision._id}`,
      id: `native:${decision._id}`,
      kind: 'native',
      title: decision.title,
      status: decision.status,
      description: decision.context,
      projectId: decision.projectId,
      projectTitle: decision.projectTitle,
      updatedAt: decision.updatedAt,
      nativeDecision: decision,
    }));

    const fallbackDocs = documents
      .filter((doc) => {
        const title = doc.title.toLowerCase();
        const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
        const looksLikeDecision = title.includes('decision') || tags.includes('decision') || tags.includes('adr');
        if (!looksLikeDecision) return false;

        const normalizedTitle = getDecisionSlug(doc.title);
        return !nativeTitleSet.has(normalizedTitle);
      })
      .map<DecisionListItem>((doc) => ({
        key: `doc:${doc._id}`,
        id: `doc:${doc._id}`,
        kind: 'doc',
        title: doc.title,
        status: inferDocStatus(doc),
        description: doc.description,
        tags: doc.tags,
        updatedAt: doc.updatedAt,
        document: doc,
      }));

    return [...nativeItems, ...fallbackDocs].sort((left, right) => right.updatedAt - left.updatedAt);
  }, [documents, nativeDecisions]);

  const filteredDecisions = useMemo(
    () =>
      decisionItems.filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          (item.description ?? '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [decisionItems, search, statusFilter]
  );

  const activeSelectedId = useMemo(
    () =>
      selectedId && filteredDecisions.some((item) => item.id === selectedId)
        ? selectedId
        : (filteredDecisions[0]?.id ?? null),
    [filteredDecisions, selectedId]
  );

  const selectedDecision = useMemo(
    () => filteredDecisions.find((item) => item.id === activeSelectedId) ?? null,
    [filteredDecisions, activeSelectedId]
  );

  const selectedDocumentId =
    selectedDecision?.kind === 'doc' ? selectedDecision.document?._id ?? null : null;

  const versions = useQuery(
    api.documents.listVersions,
    selectedDocumentId ? { documentId: selectedDocumentId } : 'skip'
  ) as DecisionVersion[] | undefined;

  const linkedTasks = useMemo(() => {
    if (!selectedDecision) return [];

    const decisionTag = `decision:${getDecisionSlug(selectedDecision.title)}`;
    const projectTag = getProjectTagFromItem(selectedDecision);

    return tasks
      .filter((task) => {
        const normalizedTags = task.tags.map((tag) => tag.toLowerCase());
        const linkedByDecision = normalizedTags.includes(decisionTag);
        const linkedByProject = projectTag ? normalizedTags.includes(projectTag) : false;
        return linkedByDecision || linkedByProject;
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 8);
  }, [selectedDecision, tasks]);

  const linkedIssues = useMemo(() => {
    if (!selectedDecision) return [];

    if (selectedDecision.projectId) {
      return issues
        .filter((issue) => issue.projectId === selectedDecision.projectId)
        .sort((left, right) => {
          const leftDue = Date.parse(left.dueDate ?? '');
          const rightDue = Date.parse(right.dueDate ?? '');
          const safeLeft = Number.isNaN(leftDue) ? Number.POSITIVE_INFINITY : leftDue;
          const safeRight = Number.isNaN(rightDue) ? Number.POSITIVE_INFINITY : rightDue;
          return safeLeft - safeRight;
        })
        .slice(0, 8);
    }

    const fallbackProjectTag = getProjectTagFromItem(selectedDecision);
    if (!fallbackProjectTag) return [];

    return issues
      .filter((issue) => {
        if (!issue.projectTitle) return false;
        return buildProjectTagFromName(issue.projectTitle) === fallbackProjectTag;
      })
      .slice(0, 8);
  }, [issues, selectedDecision]);

  const handleCreateDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    const context = draft.context.trim();
    const decision = draft.decision.trim();

    if (!title || !context || !decision) {
      setCreateError('Title, context, and decision are required.');
      return;
    }

    setCreateError(null);
    setIsCreatingDecision(true);
    try {
      const decisionId = await createDecision({
        title,
        context,
        decision,
        consequences: draft.consequences.trim() || undefined,
        status: draft.status,
        projectId: draft.projectId ? (draft.projectId as Id<'projects'>) : undefined,
      });

      setDraft({
        title: '',
        context: '',
        decision: '',
        consequences: '',
        status: 'proposed',
        projectId: '',
      });
      setShowCreateModal(false);
      setSelectedId(`native:${decisionId}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create decision.');
    } finally {
      setIsCreatingDecision(false);
    }
  };

  if (
    rawNativeDecisions === undefined ||
    rawDocuments === undefined ||
    rawTasks === undefined ||
    rawIssues === undefined ||
    rawProjects === undefined
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
              <Scale className="w-6 h-6 text-[#F0FF7A]" />
              Decisions
            </h1>
            <p className="text-gray-400 text-sm">
              Native decision records with project, issue, and task context. Fallback docs remain visible.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Decision
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search decisions..."
                className="w-full bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | DecisionStatus)}
              className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
            >
              <option value="all">All statuses</option>
              <option value="proposed">Proposed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="superseded">Superseded</option>
            </select>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredDecisions.length === 0 ? (
                <p className="text-sm text-gray-500">No decisions found.</p>
              ) : (
                filteredDecisions.map((item) => {
                  const selected = item.id === activeSelectedId;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left border rounded-lg px-3 py-2 transition-colors ${
                        selected
                          ? 'bg-[#181818] border-[#F0FF7A]/50'
                          : 'bg-[#111111] border-[#232323] hover:border-[#333]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <span className="text-[10px] px-2 py-1 rounded border border-[#2E2E2E] bg-[#121212] text-gray-400">
                          {item.kind}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] px-2 py-1 rounded ${statusClass[item.status]}`}>
                          {item.status}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="xl:col-span-2 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4 space-y-4">
            {!selectedDecision ? (
              <p className="text-sm text-gray-500">Select a decision to inspect details.</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedDecision.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedDecision.description || 'No summary provided.'}
                    </p>
                    {selectedDecision.projectTitle ? (
                      <p className="text-xs text-gray-500 mt-1">Project: {selectedDecision.projectTitle}</p>
                    ) : null}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${statusClass[selectedDecision.status]}`}>
                    {selectedDecision.status}
                  </span>
                </div>

                {selectedDecision.kind === 'native' && selectedDecision.nativeDecision ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Context</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedDecision.nativeDecision.context}
                      </p>
                    </div>
                    <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Decision</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedDecision.nativeDecision.decision}
                      </p>
                    </div>
                    {selectedDecision.nativeDecision.consequences ? (
                      <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Consequences</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                          {selectedDecision.nativeDecision.consequences}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-[#181818] border border-[#232323] rounded-lg p-3 text-sm text-gray-400">
                    Document-derived decision. Convert to native decision records for full structured governance.
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                    <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#F0FF7A]" />
                      Linked Work (Tasks)
                    </h3>
                    {linkedTasks.length === 0 ? (
                      <p className="text-xs text-gray-500">No linked tasks found for this decision context.</p>
                    ) : (
                      <div className="space-y-2">
                        {linkedTasks.map((task) => (
                          <button
                            key={task._id}
                            onClick={() => openTask(task._id)}
                            className="w-full text-left bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2 hover:border-[#333] transition-colors"
                          >
                            <p className="text-sm truncate">{task.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                    <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F0FF7A]" />
                      Linked Issues
                    </h3>
                    {linkedIssues.length === 0 ? (
                      <p className="text-xs text-gray-500">No linked issues found for this decision context.</p>
                    ) : (
                      <div className="space-y-2">
                        {linkedIssues.map((issue) => (
                          <button
                            key={issue._id}
                            onClick={() => router.push(`/planning?issue=${issue._id}`)}
                            className="w-full text-left bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2 hover:border-[#333] transition-colors"
                          >
                            <p className="text-sm truncate">{issue.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {issue.status}
                              {issue.dueDate ? ` • Due ${issue.dueDate}` : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedDecision.kind === 'doc' && selectedDecision.document ? (
                  <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                    <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                      <FileClock className="w-4 h-4 text-[#F0FF7A]" />
                      Document Version History
                    </h3>
                    {versions === undefined ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#F0FF7A]" />
                    ) : versions.length === 0 ? (
                      <p className="text-xs text-gray-500">No version history found.</p>
                    ) : (
                      <div className="space-y-2">
                        {versions.slice(0, 6).map((version) => (
                          <div key={version._id} className="bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2">
                            <p className="text-sm">Version {version.version}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {version.uploaderName} • {new Date(version.createdAt).toLocaleString()}
                            </p>
                            {version.changeNote ? (
                              <p className="text-xs text-gray-400 mt-1">{version.changeNote}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                    <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-[#F0FF7A]" />
                      Decision Timeline
                    </h3>
                    {selectedDecision.nativeDecision?.decidedAt ? (
                      <p className="text-xs text-gray-400">
                        Accepted on {new Date(selectedDecision.nativeDecision.decidedAt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                        <CircleDashed className="w-3 h-3" />
                        Not accepted yet.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!isCreatingDecision) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">New Decision</h2>
                <p className="text-xs text-gray-500 mt-1">Create a native decision record linked to execution.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-[#181818] text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Title</label>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Adopt event-driven scraping pipeline"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Context</label>
                <textarea
                  rows={3}
                  value={draft.context}
                  onChange={(event) => setDraft((current) => ({ ...current, context: event.target.value }))}
                  placeholder="What problem are we solving and why now?"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Decision</label>
                <textarea
                  rows={3}
                  value={draft.decision}
                  onChange={(event) => setDraft((current) => ({ ...current, decision: event.target.value }))}
                  placeholder="What did we choose?"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Consequences</label>
                <textarea
                  rows={2}
                  value={draft.consequences}
                  onChange={(event) => setDraft((current) => ({ ...current, consequences: event.target.value }))}
                  placeholder="Tradeoffs, risks, follow-up actions"
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Status</label>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, status: event.target.value as DecisionStatus }))
                    }
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="proposed">Proposed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="superseded">Superseded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Project</label>
                  <select
                    value={draft.projectId}
                    onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createError ? <p className="text-xs text-red-400">{createError}</p> : null}

              <div className="pt-2 border-t border-[#232323] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingDecision}
                  className="px-4 py-2 bg-[#181818] rounded-lg text-sm hover:bg-[#232323] transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDecision}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0FF7A] text-[#010101] rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {isCreatingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
