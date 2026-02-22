import { query } from "./_generated/server";
import { v } from "convex/values";

const DAY_MS = 24 * 60 * 60 * 1000;

const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return Math.round(((current - previous) / previous) * 100);
};

// Get dashboard stats (computed from tasks and budget)
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * DAY_MS);
        const fourteenDaysAgo = now - (14 * DAY_MS);

        // Get task counts
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .collect();

        const totalTasks = tasks.length;
        const inProgress = tasks.filter((t) => t.status === "in-progress").length;
        const done = tasks.filter((t) => t.status === "done").length;
        const review = tasks.filter((t) => t.status === "review").length;
        const todo = tasks.filter((t) => t.status === "todo").length;

        const createdLast7Days = tasks.filter((t) => t.createdAt >= sevenDaysAgo).length;
        const createdPrevious7Days = tasks.filter(
            (t) => t.createdAt >= fourteenDaysAgo && t.createdAt < sevenDaysAgo
        ).length;
        const taskCreationChangePercent = calculatePercentChange(
            createdLast7Days,
            createdPrevious7Days
        );

        // Calculate overdue (tasks past due date and not done)
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(now + (7 * DAY_MS)).toISOString().split("T")[0];
        const overdue = tasks.filter(
            (t) => t.dueDate < today && t.status !== "done"
        ).length;
        const dueSoon = tasks.filter(
            (t) => t.dueDate >= today && t.dueDate <= nextWeek && t.status !== "done"
        ).length;

        // Get budget percentage
        const budgetItems = await ctx.db.query("budgetItems").collect();
        const totalAllocated = budgetItems.reduce((sum, item) => sum + item.allocated, 0);
        const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent, 0);
        const budgetUsedPercent = totalAllocated > 0
            ? Math.round((totalSpent / totalAllocated) * 100)
            : 0;

        const teamMembers = await ctx.db.query("teamMembers").collect();
        const onlineMembers = teamMembers.filter((member) => member.status === "online").length;

        return {
            totalTasks,
            inProgress,
            done,
            review,
            todo,
            overdue,
            dueSoon,
            budgetUsedPercent,
            budgetAllocated: totalAllocated,
            budgetSpent: totalSpent,
            createdLast7Days,
            createdPrevious7Days,
            taskCreationChangePercent,
            onlineMembers,
        };
    },
});

// Get recent activity
export const getActivity = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const activities = await ctx.db
            .query("activityLog")
            .withIndex("by_time")
            .order("desc")
            .take(args.limit ?? 5);

        // Populate user info
        const activitiesWithUsers = await Promise.all(
            activities.map(async (activity) => {
                const user = await ctx.db.get(activity.userId);
                return {
                    ...activity,
                    userName: user?.name ?? "Unknown",
                };
            })
        );

        return activitiesWithUsers;
    },
});

// Get due and overdue tasks for header notifications
export const getDueTasks = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const now = Date.now();
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(now + (7 * DAY_MS)).toISOString().split("T")[0];

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .collect();

        const dueTasks = tasks
            .filter((task) => task.status !== "done" && task.dueDate <= nextWeek)
            .sort((a, b) => {
                const aOverdue = a.dueDate < today;
                const bOverdue = b.dueDate < today;
                if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
                return a.dueDate.localeCompare(b.dueDate);
            })
            .slice(0, args.limit ?? 5);

        const dueTasksWithAssignee = await Promise.all(
            dueTasks.map(async (task) => {
                const assignee = await ctx.db.get(task.assigneeId);
                return {
                    _id: task._id,
                    title: task.title,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    status: task.status,
                    isOverdue: task.dueDate < today,
                    assigneeName: assignee?.name ?? "Unassigned",
                };
            })
        );

        return dueTasksWithAssignee;
    },
});

// Get planning-level snapshot (projects/issues/decisions)
export const getPlanningSnapshot = query({
    args: {},
    handler: async (ctx) => {
        const [projects, issues, decisions] = await Promise.all([
            ctx.db.query("projects").collect(),
            ctx.db.query("issues").collect(),
            ctx.db.query("decisions").collect(),
        ]);

        const activeProjects = projects.filter(
            (project) => project.status === "active" || project.status === "planned"
        ).length;
        const doneProjects = projects.filter((project) => project.status === "done").length;

        const openIssues = issues.filter(
            (issue) => issue.status !== "done" && issue.status !== "canceled"
        ).length;
        const inProgressIssues = issues.filter((issue) => issue.status === "in-progress").length;
        const doneIssues = issues.filter((issue) => issue.status === "done").length;

        const proposedDecisions = decisions.filter((decision) => decision.status === "proposed").length;
        const acceptedDecisions = decisions.filter((decision) => decision.status === "accepted").length;

        return {
            totalProjects: projects.length,
            activeProjects,
            doneProjects,
            totalIssues: issues.length,
            openIssues,
            inProgressIssues,
            doneIssues,
            totalDecisions: decisions.length,
            proposedDecisions,
            acceptedDecisions,
        };
    },
});
