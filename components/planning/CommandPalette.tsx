'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  FileText,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Milestone,
  PlusCircle,
  Scale,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTaskModal } from '@/components/TaskModalContext';
import { AddTaskModal } from '@/components/AddTaskModal';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { publicFeatureFlags } from '@/lib/featureFlags';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RouteCommand {
  href: string;
  label: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
}

type PaletteGroup = 'Quick Actions' | 'Navigate' | 'Issues' | 'Decisions';

interface PaletteItem {
  id: string;
  group: PaletteGroup;
  label: string;
  value: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const baseRoutes: RouteCommand[] = [
  { href: '/', label: 'Dashboard', keywords: 'home overview', icon: LayoutDashboard },
  { href: '/tasks', label: 'Task Board', keywords: 'issues backlog work', icon: Kanban },
  { href: '/budget', label: 'Budget', keywords: 'finance spend expenses', icon: Wallet },
  { href: '/team', label: 'Team', keywords: 'members access people', icon: Users },
  { href: '/calendar', label: 'Calendar', keywords: 'events milestones schedule', icon: CalendarDays },
  { href: '/docs', label: 'Docs', keywords: 'documents adr notes', icon: FileText },
  { href: '/settings', label: 'Settings', keywords: 'preferences profile', icon: Settings },
];

const planningRoutes: RouteCommand[] = [
  { href: '/planning', label: 'Planning Hub', keywords: 'triage inbox cycles', icon: Compass },
  { href: '/projects', label: 'Projects', keywords: 'portfolio board timeline', icon: FolderKanban },
  { href: '/roadmap', label: 'Roadmap', keywords: 'quarter windows now next', icon: Milestone },
  { href: '/decisions', label: 'Decisions', keywords: 'adr architecture review', icon: Scale },
];

const groupOrder: PaletteGroup[] = ['Quick Actions', 'Navigate', 'Issues', 'Decisions'];

const safeDueDate = (date: string) => {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { openTask } = useTaskModal();

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const rawTasks = useQuery(api.tasks.listTeam);
  const rawDocuments = useQuery(api.documents.list, {});

  const tasks = useMemo(
    () =>
      (rawTasks ?? [])
        .slice()
        .sort((a, b) => safeDueDate(a.dueDate) - safeDueDate(b.dueDate))
        .slice(0, 8),
    [rawTasks]
  );

  const decisionDocs = useMemo(
    () =>
      (rawDocuments ?? [])
        .filter((doc) => {
          const title = doc.title.toLowerCase();
          const tags = doc.tags?.map((tag) => tag.toLowerCase()) ?? [];
          return title.includes('decision') || tags.includes('decision') || tags.includes('adr');
        })
        .slice(0, 8),
    [rawDocuments]
  );

  const routes = publicFeatureFlags.planningHub ? [...planningRoutes, ...baseRoutes] : baseRoutes;

  const closeThen = useCallback((action: () => void) => {
    onOpenChange(false);
    action();
  }, [onOpenChange]);

  const baseItems: PaletteItem[] = [
    {
      id: 'create-issue',
      group: 'Quick Actions',
      label: 'Create Issue',
      value: 'create issue new task add issue',
      shortcut: 'Cmd/Ctrl+N',
      icon: PlusCircle,
      run: () => closeThen(() => setShowAddTaskModal(true)),
    },
    {
      id: 'open-triage',
      group: 'Quick Actions',
      label: 'Open Triage Inbox',
      value: 'open triage inbox planning',
      icon: ListChecks,
      run: () => closeThen(() => router.push('/planning')),
    },
    {
      id: 'create-decision',
      group: 'Quick Actions',
      label: 'Create Decision (Docs)',
      value: 'create decision adr docs',
      icon: Scale,
      run: () => closeThen(() => router.push('/docs')),
    },
    ...routes.map((route) => ({
      id: `route-${route.href}`,
      group: 'Navigate' as const,
      label: route.label,
      value: `${route.label} ${route.keywords}`,
      icon: route.icon,
      run: () => closeThen(() => router.push(route.href)),
    })),
    ...tasks.map((task) => ({
      id: `task-${task._id}`,
      group: 'Issues' as const,
      label: task.title,
      value: `${task.title} ${task.status} ${task.priority} ${task.tags.join(' ')}`,
      icon: Kanban,
      shortcut: task.dueDate,
      run: () => closeThen(() => openTask(task._id)),
    })),
    ...decisionDocs.map((doc) => ({
      id: `decision-${doc._id}`,
      group: 'Decisions' as const,
      label: doc.title,
      value: `${doc.title} ${doc.description ?? ''} ${(doc.tags ?? []).join(' ')}`,
      icon: FileText,
      shortcut: `v${doc.currentVersion}`,
      run: () => closeThen(() => router.push('/decisions')),
    })),
  ];

  const items = publicFeatureFlags.planningHub
    ? baseItems
    : baseItems.filter((item) => item.id !== 'open-triage');

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.value.toLowerCase().includes(needle));
  }, [items, query]);

  const groupedItems = useMemo(() => {
    const groups: Array<{ label: PaletteGroup; items: PaletteItem[] }> = [];
    for (const groupLabel of groupOrder) {
      const groupItems = filteredItems.filter((item) => item.group === groupLabel);
      if (groupItems.length > 0) {
        groups.push({ label: groupLabel, items: groupItems });
      }
    }
    return groups;
  }, [filteredItems]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const normalizedActiveIndex =
    filteredItems.length === 0 ? 0 : Math.min(activeIndex, filteredItems.length - 1);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % filteredItems.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filteredItems.length) % filteredItems.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      filteredItems[normalizedActiveIndex]?.run();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('');
      setActiveIndex(0);
    }
    onOpenChange(nextOpen);
  };

  let itemCursor = 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl border border-[#232323] bg-[#0B0B0B] p-0 text-white"
        >
          <DialogTitle className="sr-only">TeamSync Command Palette</DialogTitle>
          <DialogDescription className="sr-only">
            Jump between routes, open work items, and run quick actions.
          </DialogDescription>

          <div className="border-b border-[#232323] px-4 py-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type a command, route, issue, or decision..."
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {filteredItems.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-gray-500">No matching commands found.</p>
            ) : (
              groupedItems.map((group) => (
                <div key={group.label} className="mb-3 last:mb-0">
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const currentIndex = itemCursor;
                      itemCursor += 1;
                      const isActive = currentIndex === normalizedActiveIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.run}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                            isActive ? 'bg-[#181818] text-[#F0FF7A]' : 'text-gray-200 hover:bg-[#181818]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                            {item.shortcut ? (
                              <span className="text-[10px] text-gray-500">{item.shortcut}</span>
                            ) : (
                              <ArrowRight className="w-3 h-3 text-gray-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        defaultVisibility="team"
      />
    </>
  );
}
