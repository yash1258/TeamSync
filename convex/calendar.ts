import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all milestones
export const listMilestones = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("milestones").collect();
    },
});

// List events (optionally filter by month/year)
export const listEvents = query({
    args: {
        year: v.optional(v.number()),
        month: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const events = await ctx.db.query("events").collect();

        if (args.year && args.month) {
            const monthStr = String(args.month).padStart(2, "0");
            const prefix = `${args.year}-${monthStr}`;
            return events.filter((e) => e.date.startsWith(prefix));
        }

        return events;
    },
});

// Create milestone
export const createMilestone = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        dueDate: v.string(),
        status: v.union(
            v.literal("upcoming"),
            v.literal("in-progress"),
            v.literal("completed")
        ),
        progress: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("milestones", args);
    },
});

// Update milestone progress
export const updateMilestoneProgress = mutation({
    args: {
        id: v.id("milestones"),
        progress: v.number(),
        status: v.optional(
            v.union(
                v.literal("upcoming"),
                v.literal("in-progress"),
                v.literal("completed")
            )
        ),
    },
    handler: async (ctx, args) => {
        if (args.status) {
            return await ctx.db.patch(args.id, { progress: args.progress, status: args.status });
        }
        return await ctx.db.patch(args.id, { progress: args.progress });
    },
});

// Create event
export const createEvent = mutation({
    args: {
        title: v.string(),
        date: v.string(),
        time: v.string(),
        type: v.union(
            v.literal("meeting"),
            v.literal("review"),
            v.literal("presentation")
        ),
        attendees: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("events", args);
    },
});
