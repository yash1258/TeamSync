import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { auth } from "./auth";

type RequestContext = MutationCtx | QueryCtx;
type TaskStatus = "todo" | "in-progress" | "review" | "done";

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    review: "Review",
    done: "Done",
};

const resolveCurrentMember = async (ctx: RequestContext) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const byUser = await ctx.db
        .query("teamMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (byUser) return byUser;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const email = user.email;
    if (typeof email !== "string" || email.length === 0) return null;

    return await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
};

const requireCurrentMember = async (ctx: MutationCtx) => {
    const member = await resolveCurrentMember(ctx);
    if (!member) {
        throw new Error("You must join the team before modifying tasks.");
    }
    return member;
};

const canAccessTask = (member: Doc<"teamMembers">, task: Doc<"tasks">) => {
    if (task.visibility === "team") return true;
    if (member.accessLevel === "admin") return true;
    return task.ownerId === member._id || task.assigneeId === member._id;
};

const canUpdateTask = (member: Doc<"teamMembers">, task: Doc<"tasks">) => {
    if (task.visibility === "team") return true;
    if (member.accessLevel === "admin") return true;
    return task.ownerId === member._id || task.assigneeId === member._id;
};

const canDeleteTask = (member: Doc<"teamMembers">, task: Doc<"tasks">) =>
    member.accessLevel === "admin" || task.ownerId === member._id;

const logTaskActivity = async (
    ctx: MutationCtx,
    memberId: Id<"teamMembers">,
    action: string,
    task: Doc<"tasks">
) => {
    if (task.visibility !== "team") return;
    await ctx.db.insert("activityLog", {
        userId: memberId,
        action,
        target: task.title,
        createdAt: Date.now(),
    });
};

const hydrateTask = async (ctx: RequestContext, task: Doc<"tasks">) => {
    const assignee = await ctx.db.get(task.assigneeId);
    const owner = await ctx.db.get(task.ownerId);
    const comments = await ctx.db
        .query("comments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

    const sortedComments = comments.sort((a, b) => a.createdAt - b.createdAt);
    const commentsWithAuthors = await Promise.all(
        sortedComments.map(async (comment) => {
            const author = await ctx.db.get(comment.authorId);
            return { ...comment, author };
        })
    );

    return { ...task, assignee, owner, comments: commentsWithAuthors };
};

// Get all team-visible tasks with assignee populated
export const listTeam = query({
    args: {},
    handler: async (ctx) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .collect();

        return await Promise.all(tasks.map((task) => hydrateTask(ctx, task)));
    },
});

// Get personal tasks assigned to a specific team member
export const listPersonal = query({
    args: { ownerId: v.id("teamMembers") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];
        if (member.accessLevel !== "admin" && member._id !== args.ownerId) return [];

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_assignee", (q) => q.eq("assigneeId", args.ownerId))
            .collect();

        const personalTasks = tasks.filter((task) => task.visibility === "personal");
        return await Promise.all(personalTasks.map((task) => hydrateTask(ctx, task)));
    },
});

// Get recent team tasks for dashboard
export const listRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_visibility", (q) => q.eq("visibility", "team"))
            .order("desc")
            .take(args.limit ?? 4);

        return await Promise.all(
            tasks.map(async (task) => {
                const assignee = await ctx.db.get(task.assigneeId);
                return { ...task, assignee };
            })
        );
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
        const member = await requireCurrentMember(ctx);
        if (args.ownerId !== member._id) {
            throw new Error("Task owner must be the current member.");
        }

        const taskId = await ctx.db.insert("tasks", {
            ...args,
            createdAt: Date.now(),
        });

        const task = await ctx.db.get(taskId);
        if (task) {
            await logTaskActivity(ctx, member._id, "created task", task);
        }

        return taskId;
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
        const member = await requireCurrentMember(ctx);
        const task = await ctx.db.get(args.id);
        if (!task) throw new Error("Task not found");
        if (!canUpdateTask(member, task)) throw new Error("Not authorized");

        const previousStatus = task.status;
        await ctx.db.patch(args.id, { status: args.status });

        if (previousStatus !== args.status) {
            await logTaskActivity(
                ctx,
                member._id,
                `moved task to ${TASK_STATUS_LABELS[args.status]}`,
                task
            );
        }

        return args.id;
    },
});

// Add comment to task
export const addComment = mutation({
    args: {
        taskId: v.id("tasks"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Task not found");
        if (!canAccessTask(member, task)) throw new Error("Not authorized");

        const content = args.content.trim();
        if (!content) throw new Error("Comment cannot be empty.");

        const commentId = await ctx.db.insert("comments", {
            taskId: args.taskId,
            authorId: member._id,
            content,
            createdAt: Date.now(),
        });

        await logTaskActivity(ctx, member._id, "commented on", task);
        return commentId;
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
        const member = await requireCurrentMember(ctx);
        const task = await ctx.db.get(args.id);
        if (!task) throw new Error("Task not found");
        if (!canUpdateTask(member, task)) throw new Error("Not authorized");

        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, value]) => value !== undefined)
        ) as Partial<Doc<"tasks">>;

        if (Object.keys(cleanUpdates).length === 0) {
            return id;
        }

        await ctx.db.patch(id, cleanUpdates);
        await logTaskActivity(ctx, member._id, "updated task", task);
        return id;
    },
});

// Delete task and its comments
export const remove = mutation({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        const task = await ctx.db.get(args.id);
        if (!task) throw new Error("Task not found");
        if (!canDeleteTask(member, task)) throw new Error("Only admins or task owners can delete tasks.");

        const comments = await ctx.db
            .query("comments")
            .withIndex("by_task", (q) => q.eq("taskId", args.id))
            .collect();

        for (const comment of comments) {
            await ctx.db.delete(comment._id);
        }

        await ctx.db.delete(args.id);
        await logTaskActivity(ctx, member._id, "deleted task", task);
    },
});

// Get single task by ID with full details
export const getById = query({
    args: { id: v.id("tasks") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        const task = await ctx.db.get(args.id);
        if (!task) return null;
        if (!canAccessTask(member, task)) return null;

        return await hydrateTask(ctx, task);
    },
});
