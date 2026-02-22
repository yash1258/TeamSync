import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const issueStatus = v.union(
    v.literal("backlog"),
    v.literal("todo"),
    v.literal("in-progress"),
    v.literal("review"),
    v.literal("done"),
    v.literal("canceled")
);

const priority = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

const hydrateIssue = async (ctx: QueryCtx, issue: Doc<"issues">) => {
    const project = issue.projectId ? await ctx.db.get(issue.projectId) : null;
    const cycle = issue.cycleId ? await ctx.db.get(issue.cycleId) : null;
    const owner = await ctx.db.get(issue.ownerId);
    const assignee = issue.assigneeId ? await ctx.db.get(issue.assigneeId) : null;

    return {
        ...issue,
        projectTitle: project?.title ?? null,
        cycleName: cycle?.name ?? null,
        ownerName: owner?.name ?? "Unknown",
        assigneeName: assignee?.name ?? null,
    };
};

// List issues.
export const list = query({
    args: {
        status: v.optional(issueStatus),
        projectId: v.optional(v.id("projects")),
        cycleId: v.optional(v.id("cycles")),
        assigneeId: v.optional(v.id("teamMembers")),
    },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const issues = args.status
            ? await ctx.db
                .query("issues")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect()
            : await ctx.db.query("issues").collect();

        const filtered = issues.filter((issue) => {
            if (args.projectId && issue.projectId !== args.projectId) return false;
            if (args.cycleId && issue.cycleId !== args.cycleId) return false;
            if (args.assigneeId && issue.assigneeId !== args.assigneeId) return false;
            return true;
        });

        return await Promise.all(
            filtered
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((issue) => hydrateIssue(ctx, issue))
        );
    },
});

// Get issue by ID.
export const getById = query({
    args: { id: v.id("issues") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        const issue = await ctx.db.get(args.id);
        if (!issue) return null;

        return await hydrateIssue(ctx, issue);
    },
});

// Create issue.
export const create = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        cycleId: v.optional(v.id("cycles")),
        status: v.optional(issueStatus),
        priority: v.optional(priority),
        estimate: v.optional(v.number()),
        ownerId: v.optional(v.id("teamMembers")),
        assigneeId: v.optional(v.id("teamMembers")),
        labels: v.optional(v.array(v.string())),
        dueDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const title = args.title.trim();
        if (!title) throw new Error("Title is required.");

        if (args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (!project) throw new Error("Project not found");
        }
        if (args.cycleId) {
            const cycle = await ctx.db.get(args.cycleId);
            if (!cycle) throw new Error("Cycle not found");
        }
        if (args.assigneeId) {
            const assignee = await ctx.db.get(args.assigneeId);
            if (!assignee) throw new Error("Assignee not found");
        }

        const ownerId = args.ownerId ?? member._id;
        if (ownerId !== member._id && member.accessLevel !== "admin") {
            throw new Error("Only admins can set issue owner to another member.");
        }

        const now = Date.now();
        const issueId = await ctx.db.insert("issues", {
            title,
            description: args.description?.trim() || undefined,
            projectId: args.projectId,
            cycleId: args.cycleId,
            status: args.status ?? "backlog",
            priority: args.priority ?? "medium",
            estimate: args.estimate,
            ownerId,
            assigneeId: args.assigneeId,
            labels: args.labels?.map((label) => label.trim()).filter(Boolean) ?? [],
            dueDate: args.dueDate?.trim() || undefined,
            createdAt: now,
            updatedAt: now,
        });

        await logPlanningActivity(ctx, member._id, "created issue", title);
        return issueId;
    },
});

// Update issue.
export const update = mutation({
    args: {
        id: v.id("issues"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        cycleId: v.optional(v.id("cycles")),
        status: v.optional(issueStatus),
        priority: v.optional(priority),
        estimate: v.optional(v.number()),
        ownerId: v.optional(v.id("teamMembers")),
        assigneeId: v.optional(v.id("teamMembers")),
        labels: v.optional(v.array(v.string())),
        dueDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const issue = await ctx.db.get(args.id);
        if (!issue) throw new Error("Issue not found");

        if (args.projectId !== undefined && args.projectId !== null) {
            const project = await ctx.db.get(args.projectId);
            if (!project) throw new Error("Project not found");
        }
        if (args.cycleId !== undefined && args.cycleId !== null) {
            const cycle = await ctx.db.get(args.cycleId);
            if (!cycle) throw new Error("Cycle not found");
        }
        if (args.assigneeId !== undefined && args.assigneeId !== null) {
            const assignee = await ctx.db.get(args.assigneeId);
            if (!assignee) throw new Error("Assignee not found");
        }
        if (args.ownerId !== undefined && args.ownerId !== member._id && member.accessLevel !== "admin") {
            throw new Error("Only admins can reassign issue owner.");
        }

        const updates: Partial<Doc<"issues">> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) {
            const title = args.title.trim();
            if (!title) throw new Error("Title is required.");
            updates.title = title;
        }
        if (args.description !== undefined) updates.description = args.description.trim() || undefined;
        if (args.projectId !== undefined) updates.projectId = args.projectId;
        if (args.cycleId !== undefined) updates.cycleId = args.cycleId;
        if (args.status !== undefined) updates.status = args.status;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.estimate !== undefined) updates.estimate = args.estimate;
        if (args.ownerId !== undefined) updates.ownerId = args.ownerId;
        if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
        if (args.labels !== undefined) {
            updates.labels = args.labels.map((label) => label.trim()).filter(Boolean);
        }
        if (args.dueDate !== undefined) updates.dueDate = args.dueDate.trim() || undefined;

        await ctx.db.patch(args.id, updates);
        await logPlanningActivity(ctx, member._id, "updated issue", updates.title ?? issue.title);
        return args.id;
    },
});

// Delete issue and linked relations.
export const remove = mutation({
    args: { id: v.id("issues") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const issue = await ctx.db.get(args.id);
        if (!issue) throw new Error("Issue not found");

        const outgoing = await ctx.db
            .query("issueRelations")
            .withIndex("by_fromIssue", (q) => q.eq("fromIssueId", args.id))
            .collect();
        const incoming = await ctx.db
            .query("issueRelations")
            .withIndex("by_toIssue", (q) => q.eq("toIssueId", args.id))
            .collect();

        for (const relation of [...outgoing, ...incoming]) {
            await ctx.db.delete(relation._id);
        }

        await ctx.db.delete(args.id);
        await logPlanningActivity(ctx, member._id, "deleted issue", issue.title);
    },
});
