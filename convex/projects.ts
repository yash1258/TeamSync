import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";

const projectStatus = v.union(
    v.literal("planned"),
    v.literal("active"),
    v.literal("on-hold"),
    v.literal("done"),
    v.literal("archived")
);

const health = v.union(v.literal("green"), v.literal("yellow"), v.literal("red"));

// List projects.
export const list = query({
    args: {
        status: v.optional(projectStatus),
        initiativeId: v.optional(v.id("initiatives")),
    },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        let projects;
        if (args.initiativeId) {
            projects = await ctx.db
                .query("projects")
                .withIndex("by_initiative", (q) => q.eq("initiativeId", args.initiativeId!))
                .collect();
        } else if (args.status) {
            projects = await ctx.db
                .query("projects")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect();
        } else {
            projects = await ctx.db.query("projects").collect();
        }

        const filtered = args.status
            ? projects.filter((project) => project.status === args.status)
            : projects;

        return await Promise.all(
            filtered
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(async (project) => {
                    const initiative = project.initiativeId
                        ? await ctx.db.get(project.initiativeId)
                        : null;
                    const lead = project.leadId ? await ctx.db.get(project.leadId) : null;
                    return {
                        ...project,
                        initiativeTitle: initiative?.title ?? null,
                        leadName: lead?.name ?? null,
                    };
                })
        );
    },
});

// Get project by ID.
export const getById = query({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return null;

        const project = await ctx.db.get(args.id);
        if (!project) return null;

        const initiative = project.initiativeId
            ? await ctx.db.get(project.initiativeId)
            : null;
        const lead = project.leadId ? await ctx.db.get(project.leadId) : null;

        return {
            ...project,
            initiativeTitle: initiative?.title ?? null,
            leadName: lead?.name ?? null,
        };
    },
});

// Create project.
export const create = mutation({
    args: {
        title: v.string(),
        summary: v.optional(v.string()),
        initiativeId: v.optional(v.id("initiatives")),
        status: v.optional(projectStatus),
        health: v.optional(health),
        leadId: v.optional(v.id("teamMembers")),
        startDate: v.optional(v.string()),
        targetDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const title = args.title.trim();
        if (!title) throw new Error("Title is required.");

        if (args.initiativeId) {
            const initiative = await ctx.db.get(args.initiativeId);
            if (!initiative) throw new Error("Initiative not found");
        }

        const now = Date.now();
        const projectId = await ctx.db.insert("projects", {
            title,
            summary: args.summary?.trim() || undefined,
            initiativeId: args.initiativeId,
            status: args.status ?? "planned",
            health: args.health ?? "green",
            leadId: args.leadId,
            startDate: args.startDate?.trim() || undefined,
            targetDate: args.targetDate?.trim() || undefined,
            createdBy: member._id,
            createdAt: now,
            updatedAt: now,
        });

        await logPlanningActivity(ctx, member._id, "created project", title);
        return projectId;
    },
});

// Update project.
export const update = mutation({
    args: {
        id: v.id("projects"),
        title: v.optional(v.string()),
        summary: v.optional(v.string()),
        initiativeId: v.optional(v.id("initiatives")),
        status: v.optional(projectStatus),
        health: v.optional(health),
        leadId: v.optional(v.id("teamMembers")),
        startDate: v.optional(v.string()),
        targetDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const project = await ctx.db.get(args.id);
        if (!project) throw new Error("Project not found");

        if (args.initiativeId !== undefined && args.initiativeId !== null) {
            const initiative = await ctx.db.get(args.initiativeId);
            if (!initiative) throw new Error("Initiative not found");
        }

        const updates: Partial<typeof project> = {
            updatedAt: Date.now(),
        };

        if (args.title !== undefined) {
            const title = args.title.trim();
            if (!title) throw new Error("Title is required.");
            updates.title = title;
        }
        if (args.summary !== undefined) updates.summary = args.summary.trim() || undefined;
        if (args.initiativeId !== undefined) updates.initiativeId = args.initiativeId;
        if (args.status !== undefined) updates.status = args.status;
        if (args.health !== undefined) updates.health = args.health;
        if (args.leadId !== undefined) updates.leadId = args.leadId;
        if (args.startDate !== undefined) updates.startDate = args.startDate.trim() || undefined;
        if (args.targetDate !== undefined) updates.targetDate = args.targetDate.trim() || undefined;

        await ctx.db.patch(args.id, updates);
        await logPlanningActivity(ctx, member._id, "updated project", updates.title ?? project.title);
        return args.id;
    },
});

// Delete project if no issues or decisions are linked.
export const remove = mutation({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const project = await ctx.db.get(args.id);
        if (!project) throw new Error("Project not found");

        const linkedIssue = await ctx.db
            .query("issues")
            .withIndex("by_project", (q) => q.eq("projectId", args.id))
            .first();
        if (linkedIssue) {
            throw new Error("Cannot delete project with linked issues.");
        }

        const linkedDecision = await ctx.db
            .query("decisions")
            .withIndex("by_project", (q) => q.eq("projectId", args.id))
            .first();
        if (linkedDecision) {
            throw new Error("Cannot delete project with linked decisions.");
        }

        await ctx.db.delete(args.id);
        await logPlanningActivity(ctx, member._id, "deleted project", project.title);
    },
});
