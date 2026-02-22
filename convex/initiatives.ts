import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";

const initiativeStatus = v.union(
    v.literal("planned"),
    v.literal("active"),
    v.literal("paused"),
    v.literal("done"),
    v.literal("archived")
);

const priority = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

// List initiatives.
export const list = query({
    args: { status: v.optional(initiativeStatus) },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const initiatives = args.status
            ? await ctx.db
                .query("initiatives")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect()
            : await ctx.db.query("initiatives").collect();

        return await Promise.all(
            initiatives
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(async (initiative) => {
                    const owner = initiative.ownerId
                        ? await ctx.db.get(initiative.ownerId)
                        : null;
                    const creator = await ctx.db.get(initiative.createdBy);
                    return {
                        ...initiative,
                        ownerName: owner?.name ?? null,
                        creatorName: creator?.name ?? "Unknown",
                    };
                })
        );
    },
});

// Get initiative details by ID.
export const getById = query({
    args: { id: v.id("initiatives") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        const initiative = await ctx.db.get(args.id);
        if (!initiative) return null;

        const owner = initiative.ownerId ? await ctx.db.get(initiative.ownerId) : null;
        const creator = await ctx.db.get(initiative.createdBy);

        return {
            ...initiative,
            ownerName: owner?.name ?? null,
            creatorName: creator?.name ?? "Unknown",
        };
    },
});

// Create an initiative.
export const create = mutation({
    args: {
        title: v.string(),
        objective: v.optional(v.string()),
        status: v.optional(initiativeStatus),
        priority: v.optional(priority),
        ownerId: v.optional(v.id("teamMembers")),
        targetDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const now = Date.now();
        const title = args.title.trim();
        if (!title) throw new Error("Title is required.");

        const initiativeId = await ctx.db.insert("initiatives", {
            title,
            objective: args.objective?.trim() || undefined,
            status: args.status ?? "planned",
            priority: args.priority ?? "medium",
            ownerId: args.ownerId,
            targetDate: args.targetDate?.trim() || undefined,
            createdBy: member._id,
            createdAt: now,
            updatedAt: now,
        });

        await logPlanningActivity(ctx, member._id, "created initiative", title);
        return initiativeId;
    },
});

// Update an initiative.
export const update = mutation({
    args: {
        id: v.id("initiatives"),
        title: v.optional(v.string()),
        objective: v.optional(v.string()),
        status: v.optional(initiativeStatus),
        priority: v.optional(priority),
        ownerId: v.optional(v.id("teamMembers")),
        targetDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const initiative = await ctx.db.get(args.id);
        if (!initiative) throw new Error("Initiative not found");

        const updates: Partial<typeof initiative> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) {
            const title = args.title.trim();
            if (!title) throw new Error("Title is required.");
            updates.title = title;
        }
        if (args.objective !== undefined) updates.objective = args.objective.trim() || undefined;
        if (args.status !== undefined) updates.status = args.status;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.ownerId !== undefined) updates.ownerId = args.ownerId;
        if (args.targetDate !== undefined) updates.targetDate = args.targetDate.trim() || undefined;

        await ctx.db.patch(args.id, updates);
        await logPlanningActivity(ctx, member._id, "updated initiative", updates.title ?? initiative.title);
        return args.id;
    },
});

// Delete an initiative if it has no linked projects.
export const remove = mutation({
    args: { id: v.id("initiatives") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const initiative = await ctx.db.get(args.id);
        if (!initiative) throw new Error("Initiative not found");

        const linkedProject = await ctx.db
            .query("projects")
            .withIndex("by_initiative", (q) => q.eq("initiativeId", args.id))
            .first();
        if (linkedProject) {
            throw new Error("Cannot delete initiative with linked projects.");
        }

        await ctx.db.delete(args.id);
        await logPlanningActivity(ctx, member._id, "deleted initiative", initiative.title);
    },
});
