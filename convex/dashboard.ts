import { query } from "./_generated/server";
import { v } from "convex/values";

// Get dashboard stats (computed from tasks and budget)
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        // Get task counts
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .collect();

        const totalTasks = tasks.length;
        const inProgress = tasks.filter((t) => t.status === "in-progress").length;

        // Calculate overdue (tasks past due date and not done)
        const today = new Date().toISOString().split("T")[0];
        const overdue = tasks.filter(
            (t) => t.dueDate < today && t.status !== "done"
        ).length;

        // Get budget percentage
        const budgetItems = await ctx.db.query("budgetItems").collect();
        const totalAllocated = budgetItems.reduce((sum, item) => sum + item.allocated, 0);
        const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent, 0);
        const budgetUsedPercent = totalAllocated > 0
            ? Math.round((totalSpent / totalAllocated) * 100)
            : 0;

        return {
            totalTasks,
            inProgress,
            overdue,
            budgetUsedPercent,
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

