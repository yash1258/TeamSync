import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";

const cycleStatus = v.union(
    v.literal("planned"),
    v.literal("active"),
    v.literal("closed")
);

// List cycles.
export const list = query({
    args: { status: v.optional(cycleStatus) },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const cycles = args.status
            ? await ctx.db
                .query("cycles")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect()
            : await ctx.db.query("cycles").collect();

        return cycles.sort((a, b) => b.startsAt - a.startsAt);
    },
});

// Get cycle by ID.
export const getById = query({
    args: { id: v.id("cycles") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        return await ctx.db.get(args.id);
    },
});

// Create cycle.
export const create = mutation({
    args: {
        name: v.string(),
        goal: v.optional(v.string()),
        startsAt: v.number(),
        endsAt: v.number(),
        status: v.optional(cycleStatus),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const name = args.name.trim();
        if (!name) throw new Error("Cycle name is required.");
        if (args.endsAt <= args.startsAt) {
            throw new Error("Cycle end date must be after start date.");
        }

        const now = Date.now();
        const cycleId = await ctx.db.insert("cycles", {
            name,
            goal: args.goal?.trim() || undefined,
            startsAt: args.startsAt,
            endsAt: args.endsAt,
            status: args.status ?? "planned",
            createdBy: member._id,
            createdAt: now,
            updatedAt: now,
        });

        await logPlanningActivity(ctx, member._id, "created cycle", name);
        return cycleId;
    },
});

// Update cycle.
export const update = mutation({
    args: {
        id: v.id("cycles"),
        name: v.optional(v.string()),
        goal: v.optional(v.string()),
        startsAt: v.optional(v.number()),
        endsAt: v.optional(v.number()),
        status: v.optional(cycleStatus),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const cycle = await ctx.db.get(args.id);
        if (!cycle) throw new Error("Cycle not found");

        const nextStartsAt = args.startsAt ?? cycle.startsAt;
        const nextEndsAt = args.endsAt ?? cycle.endsAt;
        if (nextEndsAt <= nextStartsAt) {
            throw new Error("Cycle end date must be after start date.");
        }

        const updates: Partial<typeof cycle> = {
            updatedAt: Date.now(),
        };

        if (args.name !== undefined) {
            const name = args.name.trim();
            if (!name) throw new Error("Cycle name is required.");
            updates.name = name;
        }
        if (args.goal !== undefined) updates.goal = args.goal.trim() || undefined;
        if (args.startsAt !== undefined) updates.startsAt = args.startsAt;
        if (args.endsAt !== undefined) updates.endsAt = args.endsAt;
        if (args.status !== undefined) updates.status = args.status;

        await ctx.db.patch(args.id, updates);
        await logPlanningActivity(ctx, member._id, "updated cycle", updates.name ?? cycle.name);
        return args.id;
    },
});

// Delete cycle if no issues are linked.
export const remove = mutation({
    args: { id: v.id("cycles") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const cycle = await ctx.db.get(args.id);
        if (!cycle) throw new Error("Cycle not found");

        const linkedIssue = await ctx.db
            .query("issues")
            .withIndex("by_cycle", (q) => q.eq("cycleId", args.id))
            .first();
        if (linkedIssue) {
            throw new Error("Cannot delete cycle with linked issues.");
        }

        await ctx.db.delete(args.id);
        await logPlanningActivity(ctx, member._id, "deleted cycle", cycle.name);
    },
});
