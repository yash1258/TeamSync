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
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AddTaskModal } from '@/components/AddTaskModal';
import { useTaskModal } from '@/components/TaskModalContext';
import type { Id } from '@/convex/_generated/dataModel';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

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

  const currentMember = useQuery(api.teamMembers.getCurrentMember);
  const teamTasks = useQuery(api.tasks.listTeam);
  const personalTasks = useQuery(
    api.tasks.listPersonal,
    currentMember?._id ? { ownerId: currentMember._id } : 'skip'
  );
  const activity = useQuery(api.dashboard.getActivity, { limit: 8 });
  const documents = useQuery(api.documents.list, {});

  const updateStatus = useMutation(api.tasks.updateStatus);

  const [showAddModal, setShowAddModal] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<Id<'tasks'> | null>(null);

  const resolvedTeamTasks = useMemo(() => teamTasks ?? [], [teamTasks]);
  const resolvedPersonalTasks = useMemo(() => personalTasks ?? [], [personalTasks]);
  const resolvedActivity = useMemo(() => activity ?? [], [activity]);
  const resolvedDocuments = useMemo(() => documents ?? [], [documents]);

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
  }, [resolvedTeamTasks, resolvedPersonalTasks, resolvedActivity, resolvedDocuments]);

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

  if (
    teamTasks === undefined ||
    activity === undefined ||
    documents === undefined ||
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
    </div>
  );
}
