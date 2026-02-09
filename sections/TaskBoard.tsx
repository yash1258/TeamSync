'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, MoreHorizontal, Search, Calendar, Loader2, Users, User, BookmarkPlus, X } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import { AddTaskModal } from '@/components/AddTaskModal';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Id } from '@/convex/_generated/dataModel';

type ColumnStatus = 'todo' | 'in-progress' | 'review' | 'done';
type TaskPriorityFilter = 'all' | 'low' | 'medium' | 'high';

interface SavedTaskView {
  id: string;
  label: string;
  query?: string;
  priority: TaskPriorityFilter;
  viewMode: 'team' | 'personal';
  createdAt: number;
}

interface Column {
  id: ColumnStatus;
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'border-gray-500' },
  { id: 'in-progress', title: 'In Progress', color: 'border-blue-500' },
  { id: 'review', title: 'Review', color: 'border-amber-500' },
  { id: 'done', title: 'Done', color: 'border-green-500' },
];

export function TaskBoard() {
  const { openTask } = useTaskModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterPriority, setFilterPriority] = useState<TaskPriorityFilter>('all');
  const [viewMode, setViewMode] = useState<'team' | 'personal'>('team');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewFeedback, setViewFeedback] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const searchQuery = searchParams.get('q') ?? '';

  // Resolve the current authenticated team member for personal task filtering.
  const currentMember = useQuery(api.teamMembers.getCurrentMember);

  // Fetch tasks based on view mode
  const teamTasks = useQuery(api.tasks.listTeam);
  const personalTasks = useQuery(
    api.tasks.listPersonal,
    currentMember?._id ? { ownerId: currentMember._id } : 'skip'
  );
  const rawSavedViews = useQuery(api.users.getTaskViews);
  const saveTaskView = useMutation(api.users.saveTaskView);
  const deleteTaskView = useMutation(api.users.deleteTaskView);
  const savedViews = useMemo(() => (rawSavedViews ?? []) as SavedTaskView[], [rawSavedViews]);
  const canLoadPersonalTasks = !!currentMember?._id;

  const tasks = useMemo(
    () => (viewMode === 'team' ? teamTasks : canLoadPersonalTasks ? personalTasks : []),
    [viewMode, teamTasks, canLoadPersonalTasks, personalTasks]
  );
  const isTaskListLoading =
    teamTasks === undefined ||
    (viewMode === 'personal' &&
      (currentMember === undefined ||
        (canLoadPersonalTasks && personalTasks === undefined)));
  const updateTaskStatus = useMutation(api.tasks.updateStatus);

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
  }, [tasks]);

  useEffect(() => {
    if (!viewFeedback) return undefined;
    const timeout = window.setTimeout(() => setViewFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [viewFeedback]);

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSaveView = async () => {
    const suggestedName = `${viewMode === 'team' ? 'Team' : 'My'} ${filterPriority === 'all' ? 'Tasks' : `${filterPriority} Priority`} View`;
    const label = prompt('Name this saved view:', suggestedName);
    if (!label) return;

    setViewError(null);
    setViewFeedback(null);
    setIsSavingView(true);
    try {
      await saveTaskView({
        label,
        query: searchQuery.trim() || undefined,
        priority: filterPriority,
        viewMode,
      });
      setViewFeedback(`Saved view "${label.trim()}"`);
    } catch (error) {
      console.error('Failed to save view:', error);
      setViewError(error instanceof Error ? error.message : 'Failed to save view.');
    } finally {
      setIsSavingView(false);
    }
  };

  const applySavedView = (view: SavedTaskView) => {
    setViewMode(view.viewMode);
    setFilterPriority(view.priority);
    handleSearchChange(view.query ?? '');
  };

  const handleDeleteSavedView = async (view: SavedTaskView) => {
    setViewError(null);
    setViewFeedback(null);
    try {
      await deleteTaskView({ id: view.id });
      setViewFeedback(`Deleted "${view.label}"`);
    } catch (error) {
      console.error('Failed to delete saved view:', error);
      setViewError(error instanceof Error ? error.message : 'Failed to delete view.');
    }
  };

  const filteredTasks = (tasks ?? []).filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const getTasksByStatus = (status: ColumnStatus) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10';
      case 'medium':
        return 'text-amber-400 bg-amber-400/10';
      case 'low':
        return 'text-green-400 bg-green-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    try {
      await updateTaskStatus({ id: taskId as Id<"tasks">, status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  // Loading state
  if (isTaskListLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0FF7A]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="space-y-6">
      {viewError && (
        <div className="fixed top-24 right-6 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-slide-up">
          {viewError}
        </div>
      )}
      {viewFeedback && (
        <div className="fixed top-24 right-6 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-slide-up">
          {viewFeedback}
        </div>
      )}

      {/* Header */}
      <div className="animate-on-scroll opacity-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Task Board</h1>
          <p className="text-gray-400 text-sm">Manage and track your team&apos;s tasks</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Team/Personal Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0B0B] border border-[#232323] rounded-lg">
            <button
              onClick={() => setViewMode('team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'
                }`}
            >
              <Users className="w-4 h-4" />
              Team
            </button>
            <button
              onClick={() => setViewMode('personal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'personal' ? 'bg-[#181818] text-white' : 'text-gray-500 hover:text-white'
                }`}
            >
              <User className="w-4 h-4" />
              My Tasks
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-48 bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
            />
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriorityFilter)}
            className="bg-[#181818] border border-[#232323] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#F0FF7A] transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => void handleSaveView()}
            disabled={isSavingView}
            className="flex items-center gap-2 px-4 py-2 bg-[#181818] border border-[#232323] rounded-lg text-sm hover:border-[#333] transition-colors disabled:opacity-60"
          >
            {isSavingView ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
            <span>Save View</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#F0FF7A] text-[#010101] px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {savedViews.length > 0 && (
        <div className="animate-on-scroll opacity-0 bg-[#0B0B0B] border border-[#232323] rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Saved Views</p>
          <div className="flex flex-wrap gap-2">
            {savedViews.map((view) => {
              const isActive =
                view.viewMode === viewMode &&
                view.priority === filterPriority &&
                (view.query ?? '') === searchQuery;

              return (
                <div key={view.id} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                  isActive
                    ? 'border-[#F0FF7A] bg-[#F0FF7A]/10 text-[#F0FF7A]'
                    : 'border-[#232323] bg-[#111111] text-gray-300'
                }`}>
                  <button
                    onClick={() => applySavedView(view)}
                    className="hover:underline"
                    title={`${view.viewMode} • ${view.priority}${view.query ? ` • ${view.query}` : ''}`}
                  >
                    {view.label}
                  </button>
                  <button
                    onClick={() => void handleDeleteSavedView(view)}
                    className="p-0.5 rounded hover:bg-[#181818]"
                    title={`Delete ${view.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="animate-on-scroll opacity-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div
              key={column.id}
              className="bg-[#0B0B0B] border border-[#232323] rounded-xl flex flex-col max-h-[calc(100vh-280px)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b-2 ${column.color} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{column.title}</h3>
                  <span className="px-2 py-0.5 bg-[#181818] rounded-full text-xs text-gray-400">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="p-1 rounded hover:bg-[#181818] text-gray-500">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                    onClick={() => openTask(task._id)}
                    className="bg-[#181818] border border-[#232323] rounded-lg p-4 cursor-pointer hover:border-[#333] hover:shadow-lg transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#232323] text-gray-500 transition-all">
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </div>

                    <h4 className="font-medium text-sm mb-1 group-hover:text-[#F0FF7A] transition-colors">
                      {task.title}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <img
                            src={task.assignee.avatar}
                            alt={task.assignee.name}
                            className="w-6 h-6 rounded-full"
                            title={task.assignee.name}
                          />
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </div>
                      </div>

                      {task.comments && task.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>💬</span>
                          <span>{task.comments.length}</span>
                        </div>
                      )}
                    </div>

                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-[#0B0B0B] rounded text-xs text-gray-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Task Button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-2 border border-dashed border-[#232323] rounded-lg text-sm text-gray-500 hover:text-[#F0FF7A] hover:border-[#F0FF7A]/50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultVisibility={viewMode}
      />
    </div>
  );
}
