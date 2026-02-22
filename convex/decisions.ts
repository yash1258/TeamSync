import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const decisionStatus = v.union(
    v.literal("proposed"),
    v.literal("accepted"),
    v.literal("rejected"),
    v.literal("superseded")
);

const hydrateDecision = async (
    ctx: QueryCtx,
    decision: Doc<"decisions">
) => {
    const project = decision.projectId ? await ctx.db.get(decision.projectId) : null;
    const creator = await ctx.db.get(decision.createdBy);
    const decidedByMember = decision.decidedBy
        ? await ctx.db.get(decision.decidedBy)
        : null;

    return {
        ...decision,
        projectTitle: project?.title ?? null,
        creatorName: creator?.name ?? "Unknown",
        decidedByName: decidedByMember?.name ?? null,
    };
};

// List decisions.
export const list = query({
    args: {
        status: v.optional(decisionStatus),
        projectId: v.optional(v.id("projects")),
    },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const decisions = args.status
            ? await ctx.db
                .query("decisions")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect()
            : await ctx.db.query("decisions").collect();

        const filtered = decisions.filter((decision) =>
            args.projectId ? decision.projectId === args.projectId : true
        );

        return await Promise.all(
            filtered
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((decision) => hydrateDecision(ctx, decision))
        );
    },
});

// Get decision by ID.
export const getById = query({
    args: { id: v.id("decisions") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        const decision = await ctx.db.get(args.id);
        if (!decision) return null;
        return await hydrateDecision(ctx, decision);
    },
});

// Create decision.
export const create = mutation({
    args: {
        title: v.string(),
        context: v.string(),
        decision: v.string(),
        consequences: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        status: v.optional(decisionStatus),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const title = args.title.trim();
        if (!title) throw new Error("Decision title is required.");

        const contextText = args.context.trim();
        const decisionText = args.decision.trim();
        if (!contextText || !decisionText) {
            throw new Error("Decision context and decision are required.");
        }

        if (args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (!project) throw new Error("Project not found");
        }

        const now = Date.now();
        const status = args.status ?? "proposed";
        const decisionId = await ctx.db.insert("decisions", {
            title,
            context: contextText,
            decision: decisionText,
            consequences: args.consequences?.trim() || undefined,
            projectId: args.projectId,
            status,
            decidedBy: status === "accepted" ? member._id : undefined,
            decidedAt: status === "accepted" ? now : undefined,
            createdBy: member._id,
            createdAt: now,
            updatedAt: now,
        });

        await logPlanningActivity(ctx, member._id, "created decision", title);
        return decisionId;
    },
});

// Update decision.
export const update = mutation({
    args: {
        id: v.id("decisions"),
        title: v.optional(v.string()),
        context: v.optional(v.string()),
        decision: v.optional(v.string()),
        consequences: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        status: v.optional(decisionStatus),
        decidedBy: v.optional(v.id("teamMembers")),
        decidedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const current = await ctx.db.get(args.id);
        if (!current) throw new Error("Decision not found");

        if (args.projectId !== undefined && args.projectId !== null) {
            const project = await ctx.db.get(args.projectId);
            if (!project) throw new Error("Project not found");
        }
        if (args.decidedBy !== undefined && args.decidedBy !== null) {
            const decider = await ctx.db.get(args.decidedBy);
            if (!decider) throw new Error("Decider not found");
        }

        const updates: Partial<Doc<"decisions">> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) {
            const title = args.title.trim();
            if (!title) throw new Error("Decision title is required.");
            updates.title = title;
        }
        if (args.context !== undefined) {
            const contextText = args.context.trim();
            if (!contextText) throw new Error("Decision context is required.");
            updates.context = contextText;
        }
        if (args.decision !== undefined) {
            const decisionText = args.decision.trim();
            if (!decisionText) throw new Error("Decision text is required.");
            updates.decision = decisionText;
        }
        if (args.consequences !== undefined) updates.consequences = args.consequences.trim() || undefined;
        if (args.projectId !== undefined) updates.projectId = args.projectId;
        if (args.status !== undefined) updates.status = args.status;
        if (args.decidedBy !== undefined) updates.decidedBy = args.decidedBy;
        if (args.decidedAt !== undefined) updates.decidedAt = args.decidedAt;

        if (args.status === "accepted" && args.decidedBy === undefined) {
            updates.decidedBy = current.decidedBy ?? member._id;
        }
        if (args.status === "accepted" && args.decidedAt === undefined) {
            updates.decidedAt = current.decidedAt ?? Date.now();
        }

        await ctx.db.patch(args.id, updates);
        await logPlanningActivity(ctx, member._id, "updated decision", updates.title ?? current.title);
        return args.id;
    },
});

// Delete decision.
export const remove = mutation({
    args: { id: v.id("decisions") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const decision = await ctx.db.get(args.id);
        if (!decision) throw new Error("Decision not found");

        await ctx.db.delete(args.id);
        await logPlanningActivity(ctx, member._id, "deleted decision", decision.title);
    },
});
