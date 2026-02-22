export interface ShortcutDefinition {
  id: string;
  key: string;
  combo: string;
  label: string;
  description: string;
}

export const issueShortcutDefinitions: ShortcutDefinition[] = [
  {
    id: 'start',
    key: 's',
    combo: 'Alt+Shift+S',
    label: 'Start',
    description: 'Move issue to in-progress',
  },
  {
    id: 'done',
    key: 'd',
    combo: 'Alt+Shift+D',
    label: 'Done',
    description: 'Mark issue as done',
  },
  {
    id: 'priority',
    key: 'h',
    combo: 'Alt+Shift+H',
    label: 'High Priority',
    description: 'Set issue priority to high',
  },
  {
    id: 'assignMe',
    key: 'a',
    combo: 'Alt+Shift+A',
    label: 'Assign To Me',
    description: 'Assign issue to current member',
  },
  {
    id: 'cycleCurrent',
    key: 'c',
    combo: 'Alt+Shift+C',
    label: 'Current Cycle',
    description: 'Set cycle tag to cycle:current',
  },
  {
    id: 'cycleNext',
    key: 'n',
    combo: 'Alt+Shift+N',
    label: 'Next Cycle',
    description: 'Set cycle tag to cycle:next',
  },
];

export const issueShortcutKeys = {
  start: 's',
  done: 'd',
  priority: 'h',
  assignMe: 'a',
  cycleCurrent: 'c',
  cycleNext: 'n',
} as const;

export const paletteShortcutDefinitions: Omit<ShortcutDefinition, 'key'>[] = [
  {
    id: 'toggle',
    combo: 'Cmd/Ctrl+K',
    label: 'Toggle Palette',
    description: 'Open or close command palette',
  },
  {
    id: 'createIssue',
    combo: 'Type create issue',
    label: 'Create Issue',
    description: 'Run the create issue command',
  },
  {
    id: 'createProject',
    combo: 'Type create project',
    label: 'Create Project',
    description: 'Open the new project flow',
  },
  {
    id: 'createNativeIssue',
    combo: 'Type create native issue',
    label: 'Create Native Issue',
    description: 'Open native issue creation in planning',
  },
  {
    id: 'navigate',
    combo: 'Arrow Keys',
    label: 'Navigate',
    description: 'Move through command results',
  },
  {
    id: 'run',
    combo: 'Enter',
    label: 'Run',
    description: 'Execute selected command',
  },
];
