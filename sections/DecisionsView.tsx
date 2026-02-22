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
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';

type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

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

const statusClass: Record<DecisionStatus, string> = {
  proposed: 'text-blue-400 bg-blue-500/10',
  accepted: 'text-green-400 bg-green-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  superseded: 'text-amber-400 bg-amber-500/10',
};

const inferDecisionStatus = (doc: DecisionDoc): DecisionStatus => {
  const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
  if (tags.includes('accepted')) return 'accepted';
  if (tags.includes('rejected')) return 'rejected';
  if (tags.includes('superseded')) return 'superseded';
  return 'proposed';
};

const getDecisionSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getProjectTag = (tags?: string[]) =>
  tags?.find((tag) => tag.toLowerCase().startsWith('project:'))?.toLowerCase();

export function DecisionsView() {
  const { openTask } = useTaskModal();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DecisionStatus>('all');
  const [selectedId, setSelectedId] = useState<Id<'documents'> | null>(null);

  const rawDocuments = useQuery(api.documents.list, {});
  const rawTasks = useQuery(api.tasks.listTeam);

  const documents = useMemo(() => (rawDocuments ?? []) as DecisionDoc[], [rawDocuments]);
  const tasks = useMemo(() => rawTasks ?? [], [rawTasks]);

  const decisionDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const title = doc.title.toLowerCase();
        const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
        return title.includes('decision') || tags.includes('decision') || tags.includes('adr');
      }),
    [documents]
  );

  const filteredDecisions = useMemo(
    () =>
      decisionDocs.filter((doc) => {
        const matchesSearch =
          doc.title.toLowerCase().includes(search.toLowerCase()) ||
          (doc.description ?? '').toLowerCase().includes(search.toLowerCase());
        const status = inferDecisionStatus(doc);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [decisionDocs, search, statusFilter]
  );

  const activeSelectedId = useMemo(
    () =>
      selectedId && filteredDecisions.some((doc) => doc._id === selectedId)
        ? selectedId
        : (filteredDecisions[0]?._id ?? null),
    [filteredDecisions, selectedId]
  );

  const versions = useQuery(
    api.documents.listVersions,
    activeSelectedId ? { documentId: activeSelectedId } : 'skip'
  ) as DecisionVersion[] | undefined;

  const selectedDecision = useMemo(
    () => filteredDecisions.find((doc) => doc._id === activeSelectedId) ?? null,
    [filteredDecisions, activeSelectedId]
  );

  const linkedTasks = useMemo(() => {
    if (!selectedDecision) return [];
    const decisionSlug = getDecisionSlug(selectedDecision.title);
    const projectTag = getProjectTag(selectedDecision.tags);

    return tasks
      .filter((task) => {
        const normalizedTags = task.tags.map((tag) => tag.toLowerCase());
        const linkedByDecision = normalizedTags.includes(`decision:${decisionSlug}`);
        const linkedByProject = projectTag ? normalizedTags.includes(projectTag) : false;
        return linkedByDecision || linkedByProject;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8);
  }, [selectedDecision, tasks]);

  if (rawDocuments === undefined || rawTasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
          <Scale className="w-6 h-6 text-[#F0FF7A]" />
          Decisions
        </h1>
        <p className="text-gray-400 text-sm">
          Structured decision log with linked execution context and version history.
        </p>
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
              filteredDecisions.map((doc) => {
                const status = inferDecisionStatus(doc);
                const selected = doc._id === activeSelectedId;
                return (
                  <button
                    key={doc._id}
                    onClick={() => setSelectedId(doc._id)}
                    className={`w-full text-left border rounded-lg px-3 py-2 transition-colors ${
                      selected ? 'bg-[#181818] border-[#F0FF7A]/50' : 'bg-[#111111] border-[#232323] hover:border-[#333]'
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] px-2 py-1 rounded ${statusClass[status]}`}>
                        {status}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(doc.updatedAt).toLocaleDateString()}
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
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusClass[inferDecisionStatus(selectedDecision)]}`}>
                  {inferDecisionStatus(selectedDecision)}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                  <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#F0FF7A]" />
                    Linked Work
                  </h3>
                  {linkedTasks.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Add task tags like `decision:{getDecisionSlug(selectedDecision.title)}` or matching `project:*` tags.
                    </p>
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
                    <FileClock className="w-4 h-4 text-[#F0FF7A]" />
                    Version History
                  </h3>
                  {versions === undefined ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F0FF7A]" />
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-gray-500">No versions available.</p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((version) => (
                        <div key={version._id} className="bg-[#0F0F0F] border border-[#232323] rounded px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">v{version.version}</p>
                            <p className="text-[10px] text-gray-500">{new Date(version.createdAt).toLocaleDateString()}</p>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            by {version.uploaderName}
                          </p>
                          {version.changeNote ? (
                            <p className="text-xs text-gray-300 mt-1">{version.changeNote}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#181818] border border-[#232323] rounded-lg p-3">
                <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#F0FF7A]" />
                  Decision Meta
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-[#0F0F0F] border border-[#232323]">
                    Current version: v{selectedDecision.currentVersion}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-[#0F0F0F] border border-[#232323]">
                    Updated: {new Date(selectedDecision.updatedAt).toLocaleDateString()}
                  </span>
                  {(selectedDecision.tags ?? []).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded bg-[#0F0F0F] border border-[#232323]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
        <h2 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
          <CircleDashed className="w-4 h-4 text-[#F0FF7A]" />
          Next Step
        </h2>
        <p className="text-sm text-gray-400">
          Once Convex codegen is run, this screen should switch from document-derived decisions to
          the dedicated `decisions` table as source of truth.
        </p>
      </div>
    </div>
  );
}
