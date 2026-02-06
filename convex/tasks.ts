import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all team-visible tasks with assignee populated
export const listTeam = query({
    args: {},
    handler: async (ctx) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .collect();

        // Populate assignee and owner for each task
        const tasksWithDetails = await Promise.all(
            tasks.map(async (task) => {
                const assignee = await ctx.db.get(task.assigneeId);
                const owner = await ctx.db.get(task.ownerId);
                const comments = await ctx.db
                    .query("comments")
                    .withIndex("by_task", (q) => q.eq("taskId", task._id))
                    .collect();

                // Populate comment authors
                const commentsWithAuthors = await Promise.all(
                    comments.map(async (comment) => {
                        const author = await ctx.db.get(comment.authorId);
                        return { ...comment, author };
                    })
                );

                return { ...task, assignee, owner, comments: commentsWithAuthors };
            })
        );

        return tasksWithDetails;
    },
});

// Get personal tasks for a specific team member
export const listPersonal = query({
    args: { ownerId: v.id("teamMembers") },
    handler: async (ctx, args) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
            .collect();

        // Filter to only personal tasks
        const personalTasks = tasks.filter((t) => t.visibility === "personal");

        // Populate assignee for each task
        const tasksWithDetails = await Promise.all(
            personalTasks.map(async (task) => {
                const assignee = await ctx.db.get(task.assigneeId);
                const comments = await ctx.db
                    .query("comments")
                    .withIndex("by_task", (q) => q.eq("taskId", task._id))
                    .collect();

                const commentsWithAuthors = await Promise.all(
                    comments.map(async (comment) => {
                        const author = await ctx.db.get(comment.authorId);
                        return { ...comment, author };
                    })
                );

                return { ...task, assignee, comments: commentsWithAuthors };
            })
        );

        return tasksWithDetails;
    },
});

// Get recent team tasks for dashboard
export const listRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .order("desc")
            .take(args.limit ?? 4);

        const tasksWithAssignees = await Promise.all(
            tasks.map(async (task) => {
                const assignee = await ctx.db.get(task.assigneeId);
                return { ...task, assignee };
            })
        );

        return tasksWithAssignees;
    },
});

// Create a new task
export const create = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        status: v.union(
            v.literal("todo"),
            v.literal("in-progress"),
            v.literal("review"),
            v.literal("done")
        ),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        visibility: v.union(v.literal("team"), v.literal("personal")),
        ownerId: v.id("teamMembers"),
        assigneeId: v.id("teamMembers"),
        dueDate: v.string(),
        tags: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("tasks", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Update task status (for drag and drop)
export const updateStatus = mutation({
    args: {
        id: v.id("tasks"),
        status: v.union(
            v.literal("todo"),
            v.literal("in-progress"),
            v.literal("review"),
            v.literal("done")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.id, { status: args.status });
    },
});

// Add comment to task
export const addComment = mutation({
    args: {
        taskId: v.id("tasks"),
        authorId: v.id("teamMembers"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("comments", {
            taskId: args.taskId,
            authorId: args.authorId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});

// Update task (full edit)
export const update = mutation({
    args: {
        id: v.id("tasks"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("todo"),
            v.literal("in-progress"),
            v.literal("review"),
            v.literal("done")
        )),
        priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
        visibility: v.optional(v.union(v.literal("team"), v.literal("personal"))),
        assigneeId: v.optional(v.id("teamMembers")),
        dueDate: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        // Filter out undefined values
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        return await ctx.db.patch(id, cleanUpdates);
    },
});

// Delete task and its comments
export const remove = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        // Delete all comments for this task
        const comments = await ctx.db
            .query("comments")
            .withIndex("by_task", (q) => q.eq("taskId", args.id))
            .collect();

        for (const comment of comments) {
            await ctx.db.delete(comment._id);
        }

        // Delete the task
        await ctx.db.delete(args.id);
    },
});

// Get single task by ID with full details
export const getById = query({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.id);
        if (!task) return null;

        const assignee = await ctx.db.get(task.assigneeId);
        const owner = await ctx.db.get(task.ownerId);
        const comments = await ctx.db
            .query("comments")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();

        const commentsWithAuthors = await Promise.all(
            comments.map(async (comment) => {
                const author = await ctx.db.get(comment.authorId);
                return { ...comment, author };
            })
        );

        return { ...task, assignee, owner, comments: commentsWithAuthors };
    },
});
