export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: TeamMember;
  dueDate: string;
  tags: string[];
  comments: Comment[];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  department: 'engineering' | 'design' | 'finance' | 'product' | 'marketing';
  status: 'online' | 'offline' | 'away';
}

export interface Comment {
  id: string;
  author: TeamMember;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'active' | 'paused' | 'completed';
  dueDate: string;
  members: TeamMember[];
  tasks: Task[];
}

export interface BudgetItem {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface Budget {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  items: BudgetItem[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  progress: number;
}

export interface Notification {
  id: string;
  type: 'task' | 'mention' | 'project' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
