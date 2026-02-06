# TeamSync - Next.js 16 Project Documentation

> **For AI Coding Agents:** This document provides a comprehensive overview of the TeamSync codebase structure, conventions, and architecture to help you understand and work with this project effectively.

## Project Overview

**TeamSync** is a project collaboration and management platform built with:
- **Next.js 16.1.6** (App Router with Turbopack)
- **React 19.2.3**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** for UI components

### Key Features
- Dashboard with task overview and team activity
- Kanban-style task board with drag-and-drop
- Budget tracking and financial reports
- Team member management
- Calendar with milestones and events
- User profile and settings

---

## Project Structure

```
teamsync-nextjs/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (ConvexAuthNextjsServerProvider)
│   ├── globals.css         # Global styles + Tailwind CSS
│   ├── ConvexClientProvider.tsx  # Convex client with auth
│   ├── login/
│   │   └── page.tsx        # Public login page
│   └── (dashboard)/        # Protected route group
│       ├── layout.tsx      # Dashboard layout (AuthGuard, Sidebar, Header)
│       ├── page.tsx        # Dashboard (/)
│       ├── tasks/page.tsx  # Task Board (/tasks)
│       ├── budget/page.tsx # Budget View (/budget)
│       ├── team/page.tsx   # Team View (/team)
│       ├── calendar/page.tsx # Calendar View (/calendar)
│       ├── profile/page.tsx  # Profile View (/profile)
│       └── settings/page.tsx # Settings View (/settings)
│
├── convex/                 # Convex backend
│   ├── _generated/         # Auto-generated Convex code
│   ├── schema.ts           # Database schema (9 tables + auth)
│   ├── auth.ts             # Auth configuration (GitHub OAuth)
│   ├── auth.config.ts      # Auth config (auto-generated)
│   ├── http.ts             # HTTP routes for auth callbacks
│   ├── users.ts            # User queries (currentUser)
│   ├── teamMembers.ts      # Team member CRUD + access levels
│   ├── invites.ts          # Invite link system (create/validate/redeem)
│   ├── tasks.ts            # Task queries and mutations
│   ├── budget.ts           # Budget/expense queries
│   ├── calendar.ts         # Milestones/events queries
│   ├── dashboard.ts        # Dashboard stats & activity
│   └── seed.ts             # Seed/clear data utilities
│
├── components/             # Reusable components
│   ├── ui/                 # shadcn/ui components (53 files)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (50 more)
│   ├── Sidebar.tsx         # Navigation sidebar (with logout)
│   ├── Header.tsx          # Top header bar (shows user info)
│   ├── TaskModal.tsx       # Task detail modal with edit/delete
│   ├── AddTaskModal.tsx    # Create new task modal
│   ├── AppLayout.tsx       # Main layout wrapper + onboarding check
│   ├── SidebarContext.tsx  # Sidebar state context
│   ├── TaskModalContext.tsx # Task modal state context
│   ├── AuthGuard.tsx       # Route protection component
│   ├── SignIn.tsx          # GitHub sign-in button
│   ├── SignOut.tsx         # Sign-out button
│   ├── InviteMemberModal.tsx # Generate team invite links (admin)
│   └── OnboardingModal.tsx # New member profile setup
│
├── sections/               # Page content components
│   ├── Dashboard.tsx       # Dashboard content
│   ├── TaskBoard.tsx       # Kanban task board
│   ├── BudgetView.tsx      # Budget overview
│   ├── TeamView.tsx        # Team members grid
│   ├── CalendarView.tsx    # Calendar with milestones
│   ├── ProfileView.tsx     # User profile
│   └── SettingsView.tsx    # Application settings
│
├── types/
│   └── index.ts            # TypeScript interfaces
│
├── lib/
│   └── utils.ts            # Utility functions (cn)
│
├── middleware.ts           # Route protection middleware
├── .env.local              # Environment variables (Convex URLs)
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```


---

## Type System

All TypeScript interfaces are defined in `types/index.ts`:

```typescript
interface Task {
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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  department: string;
  status: 'online' | 'away' | 'offline';
  accessLevel: 'admin' | 'member' | 'viewer';  // Access control
  skills?: string[];                            // Optional skills
  userId?: string;                              // Link to auth user
}

interface Comment {
  id: string;
  author: TeamMember;
  content: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  progress: number;
  members: TeamMember[];
  startDate: string;
  endDate: string;
}

interface BudgetItem {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  progress: number;
}

interface Notification {
  id: string;
  type: 'task' | 'comment' | 'mention' | 'system';
  message: string;
  read: boolean;
  createdAt: string;
}
```

---

## Routing

This project uses **Next.js App Router** with file-based routing:

| Route | Page File | Component |
|-------|-----------|-----------|
| `/` | `app/page.tsx` | Dashboard |
| `/tasks` | `app/tasks/page.tsx` | TaskBoard |
| `/budget` | `app/budget/page.tsx` | BudgetView |
| `/team` | `app/team/page.tsx` | TeamView |
| `/calendar` | `app/calendar/page.tsx` | CalendarView |
| `/profile` | `app/profile/page.tsx` | ProfileView |
| `/settings` | `app/settings/page.tsx` | SettingsView |

### Navigation
- Use `<Link>` from `next/link` for navigation
- Use `useRouter()` from `next/navigation` for programmatic navigation
- Use `usePathname()` from `next/navigation` for active link detection

---

## State Management

### Context Providers

Two React Context providers manage global state:

#### SidebarContext (`components/SidebarContext.tsx`)
```typescript
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}
```
Usage: `const { isOpen, toggle } = useSidebar();`

#### TaskModalContext (`components/TaskModalContext.tsx`)
```typescript
interface TaskModalContextType {
  selectedTask: Task | null;
  openTask: (task: Task) => void;
  closeTask: () => void;
}
```
Usage: `const { openTask, closeTask, selectedTask } = useTaskModal();`

### Provider Hierarchy
```tsx
// app/layout.tsx
<SidebarProvider>
  <TaskModalProvider>
    <AppLayout>
      {children}
    </AppLayout>
  </TaskModalProvider>
</SidebarProvider>
```

---

## Component Architecture

### Client vs Server Components

- **Server Components** (default): Page files that just render section components
- **Client Components** (marked with `'use client'`):
  - All section components in `/sections/`
  - All layout components (`Sidebar`, `Header`, `AppLayout`)
  - Context providers
  - Any component with hooks or interactivity

### Key Components

#### AppLayout (`components/AppLayout.tsx`)
The main layout wrapper that:
- Renders the Sidebar and Header
- Handles scroll state for header styling
- Renders the TaskModal when a task is selected
- Adjusts layout based on sidebar open/close state

#### Sidebar (`components/Sidebar.tsx`)
Navigation sidebar with:
- Logo and branding
- Navigation items (Dashboard, Tasks, Budget, Team, Calendar)
- Bottom section (Settings, Help, Logout)
- Collapsible functionality

#### Header (`components/Header.tsx`)
Top header bar with:
- Search input
- "New Task" button
- Message and notification icons
- User profile dropdown

---

## Styling System

### Tailwind CSS v4
- Configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Uses `@theme inline` for CSS variable mappings

### Color Palette
```css
--color-bg: #010101;           /* Main background */
--color-bg-secondary: #181818; /* Secondary background */
--color-text: #FFFFFF;         /* Primary text */
--color-accent: #F0FF7A;       /* Accent/primary color (lime yellow) */
--color-border: #232323;       /* Border color */
--color-card: #0B0B0B;         /* Card background */
```

### Custom Animations
Defined in `globals.css`:
- `animate-fade-in` - Fade in
- `animate-fade-slide-up` - Fade and slide up
- `animate-scale-fade` - Scale and fade (for modals)
- `animate-pulse-dot` - Pulsing dot animation

### Utility Function
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## shadcn/ui Components

All 53 shadcn/ui components are in `components/ui/`. Key ones include:
- `button.tsx` - Button variants
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Dropdown menus
- `input.tsx` - Form inputs
- `select.tsx` - Select dropdowns
- `tabs.tsx` - Tab navigation
- `avatar.tsx` - User avatars
- `badge.tsx` - Status badges
- `progress.tsx` - Progress bars
- `tooltip.tsx` - Tooltips

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

---

## Dependencies

### Core
- `next`: ^16.1.6
- `react`: ^19.2.3
- `react-dom`: ^19.2.3
- `typescript`: ^5

### UI & Styling
- `tailwindcss`: ^4
- `lucide-react`: ^0.474.0
- `class-variance-authority`: ^0.7.1
- `clsx`: ^2.1.1
- `tailwind-merge`: ^3.0.1

### Radix UI (for shadcn/ui)
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-select`
- `@radix-ui/react-tabs`
- ... (and many more)

### Charts & Data
- `recharts`: ^2.15.1
- `date-fns`: ^4.1.0

---

## Important Conventions

1. **File naming**: Use PascalCase for components, camelCase for utilities
2. **Imports**: Use `@/` path alias for absolute imports
3. **Client components**: Always add `'use client'` at the top if using hooks or browser APIs
4. **Types**: Import types from `@/types`
5. **Styling**: Prefer Tailwind utilities; use `cn()` for conditional classes

---

## Common Patterns

### Opening a task modal
```tsx
import { useTaskModal } from '@/components/TaskModalContext';

function MyComponent() {
  const { openTask } = useTaskModal();
  
  return (
    <button onClick={() => openTask(task)}>
      View Task
    </button>
  );
}
```

### Navigation with active state
```tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavItem({ href, label }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link 
      href={href}
      className={isActive ? 'bg-accent' : 'bg-transparent'}
    >
      {label}
    </Link>
  );
}
```

### Responsive sidebar margin
```tsx
const { isOpen } = useSidebar();

return (
  <main className={`transition-all ${isOpen ? 'ml-64' : 'ml-16'}`}>
    {children}
  </main>
);
```

## Authentication (Convex Auth)

This project uses **Convex** as the backend database and **Convex Auth** for authentication.

### Tech Stack
- **Convex**: Real-time backend database
- **Convex Auth**: Authentication library (built on Auth.js)
- **GitHub OAuth**: Primary authentication provider

### Key Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Database schema with auth tables |
| `convex/auth.ts` | Auth configuration with GitHub provider |
| `convex/auth.config.ts` | Auth config (auto-generated) |
| `convex/http.ts` | HTTP routes for auth callbacks |
| `app/ConvexClientProvider.tsx` | Client-side Convex provider |
| `app/login/page.tsx` | Login page |
| `middleware.ts` | Route protection (server-side) |
| `components/SignIn.tsx` | Sign-in button |
| `components/SignOut.tsx` | Sign-out button |
| `components/AuthGuard.tsx` | Route protection (client-side) |

### Provider Hierarchy
```tsx
// app/layout.tsx
<ConvexAuthNextjsServerProvider>
  <html>
    <body>
      <ConvexClientProvider>
        {children}
      </ConvexClientProvider>
    </body>
  </html>
</ConvexAuthNextjsServerProvider>
```

### Route Structure

Protected routes are in the `(dashboard)` route group:
```
app/
├── layout.tsx           # Root layout (ConvexClientProvider)
├── login/page.tsx       # Public login page
└── (dashboard)/         # Protected route group
    ├── layout.tsx       # Dashboard layout (AuthGuard, Sidebar, Header)
    ├── page.tsx         # Dashboard (/)
    ├── tasks/page.tsx   # Task Board (/tasks)
    ├── budget/page.tsx  # Budget View (/budget)
    └── ...
```

### Authentication Hooks
```tsx
// Check auth state
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// Sign in/out actions
import { useAuthActions } from "@convex-dev/auth/react";
const { signIn, signOut } = useAuthActions();
```

### Convex Queries
```tsx
// Get current authenticated user
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const user = useQuery(api.users.currentUser);
// Returns: { _id, name, email, image } or null if not authenticated
```

### Environment Variables

**Local (`.env.local`):**
- `CONVEX_DEPLOYMENT` - Convex deployment name
- `NEXT_PUBLIC_CONVEX_URL` - Convex cloud URL
- `NEXT_PUBLIC_CONVEX_SITE_URL` - Convex HTTP Actions URL

**Convex Dashboard:**
- `SITE_URL` - Application URL (http://localhost:3000)
- `JWT_PRIVATE_KEY` - Auto-generated
- `JWKS` - Auto-generated
- `AUTH_GITHUB_ID` - GitHub OAuth client ID
- `AUTH_GITHUB_SECRET` - GitHub OAuth client secret

---

## Notes for AI Agents

1. **This is a Next.js 16 App Router project** - not Pages Router
2. **Authentication**: Uses Convex Auth with GitHub OAuth
3. **Database**: Convex (real-time backend)
4. **Real-time data**: All sections fetch from Convex using `useQuery` hooks
5. **Personal Tasks**: TaskBoard has Team/Personal toggle (`visibility` field)
6. **Dark theme only** - the design is built around a dark color scheme
7. **Mobile responsive** - but primarily designed for desktop
8. **Run two servers**: `npm run dev` (Next.js) and `npx convex dev` (Convex)

---

## Convex Database Schema

| Table | Fields |
|-------|--------|
| `teamMembers` | name, email, role, avatar, department, status, **accessLevel**, skills?, userId? |
| `invites` | code, createdBy, expiresAt, usedBy?, usedAt? |
| `tasks` | title, description, status, priority, **visibility**, ownerId, assigneeId, dueDate, tags |
| `comments` | taskId, authorId, content, createdAt |
| `budgetItems` | category, allocated, spent |
| `expenses` | description, amount, category, date, status |
| `milestones` | title, description, dueDate, status, progress |
| `events` | title, date, time, type, attendees |
| `activityLog` | userId, action, target, createdAt |

---

## Team Member Management

### Access Levels
| Level | Permissions |
|-------|-------------|
| `admin` | Invite/remove members, change access levels, full access |
| `member` | Create/edit tasks, normal work |
| `viewer` | Read-only access |

### Invite Flow
1. Admin clicks "Invite" on Team page → `InviteMemberModal` generates link
2. Invitee clicks link → `/join` page → GitHub OAuth
3. After login → `OnboardingModal` for role/department/skills
4. Submit → team member created → redirected to dashboard

**First user automatically becomes admin.**

### Key Backend Functions

**teamMembers.ts:**
- `addCurrentUserAsTeamMember` - Self-add (first user = admin)
- `getCurrentMember` - Get current user's team member record
- `update` - Edit member (admin or self)
- `remove` - Delete member (admin only)

**invites.ts:**
- `create` - Generate invite code (admin only)
- `validate` - Check if code is valid
- `redeem` - Use code to join team

### Frontend Components
| Component | Purpose |
|-----------|---------|
| `InviteMemberModal` | Admin generates shareable invite links |
| `OnboardingModal` | New member profile setup (role, dept, skills) |
| `/join` page | Handles invite link redirects, enforces auth |

### Utility Commands
```bash
# Clear all data
npx convex run seed:clearAll

# Seed sample data
npx convex run seed:seedAll
```
