'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';

interface UseGlobalIssueShortcutsArgs {
  currentMemberId: Id<'teamMembers'> | null;
  selectedTask: Doc<'tasks'> | null | undefined;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const replaceCycleTag = (tags: string[], nextCycle: 'current' | 'next') => {
  const filtered = tags.filter((tag) => !tag.toLowerCase().startsWith('cycle:'));
  return [...filtered, `cycle:${nextCycle}`];
};

export function useGlobalIssueShortcuts({
  currentMemberId,
  selectedTask,
}: UseGlobalIssueShortcutsArgs) {
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const updateTask = useMutation(api.tasks.update);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;
      if (!event.altKey || !event.shiftKey) return;
      if (!selectedTask) return;

      const key = event.key.toLowerCase();

      if (key === 's') {
        if (selectedTask.status === 'in-progress') return;
        event.preventDefault();
        void updateTaskStatus({
          id: selectedTask._id,
          status: 'in-progress',
        });
        return;
      }

      if (key === 'd') {
        if (selectedTask.status === 'done') return;
        event.preventDefault();
        void updateTaskStatus({
          id: selectedTask._id,
          status: 'done',
        });
        return;
      }

      if (key === 'h') {
        if (selectedTask.priority === 'high') return;
        event.preventDefault();
        void updateTask({
          id: selectedTask._id,
          priority: 'high',
        });
        return;
      }

      if (key === 'a') {
        if (!currentMemberId || selectedTask.assigneeId === currentMemberId) return;
        event.preventDefault();
        void updateTask({
          id: selectedTask._id,
          assigneeId: currentMemberId,
        });
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        void updateTask({
          id: selectedTask._id,
          tags: replaceCycleTag(selectedTask.tags, 'current'),
        });
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        void updateTask({
          id: selectedTask._id,
          tags: replaceCycleTag(selectedTask.tags, 'next'),
        });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [currentMemberId, selectedTask, updateTask, updateTaskStatus]);
}
