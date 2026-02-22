import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertCanEditPlanning, logPlanningActivity, requireCurrentMember, resolveCurrentMember } from "./planningAuth";

const relationType = v.union(
    v.literal("blocks"),
    v.literal("depends_on"),
    v.literal("related_to"),
    v.literal("duplicate_of")
);

// List relations for a given issue.
export const listForIssue = query({
    args: { issueId: v.id("issues") },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const [outgoing, incoming] = await Promise.all([
            ctx.db
                .query("issueRelations")
                .withIndex("by_fromIssue", (q) => q.eq("fromIssueId", args.issueId))
                .collect(),
            ctx.db
                .query("issueRelations")
                .withIndex("by_toIssue", (q) => q.eq("toIssueId", args.issueId))
                .collect(),
        ]);

        const all = [...outgoing, ...incoming];
        return await Promise.all(
            all.map(async (relation) => {
                const fromIssue = await ctx.db.get(relation.fromIssueId);
                const toIssue = await ctx.db.get(relation.toIssueId);
                return {
                    ...relation,
                    fromIssueTitle: fromIssue?.title ?? "Unknown issue",
                    toIssueTitle: toIssue?.title ?? "Unknown issue",
                };
            })
        );
    },
});

// Create a relation between two issues.
export const create = mutation({
    args: {
        fromIssueId: v.id("issues"),
        toIssueId: v.id("issues"),
        relationType,
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        if (args.fromIssueId === args.toIssueId) {
            throw new Error("An issue cannot be related to itself.");
        }

        const fromIssue = await ctx.db.get(args.fromIssueId);
        if (!fromIssue) throw new Error("Source issue not found");
        const toIssue = await ctx.db.get(args.toIssueId);
        if (!toIssue) throw new Error("Target issue not found");

        const existing = await ctx.db
            .query("issueRelations")
            .withIndex("by_from_to_type", (q) =>
                q
                    .eq("fromIssueId", args.fromIssueId)
                    .eq("toIssueId", args.toIssueId)
                    .eq("relationType", args.relationType)
            )
            .first();
        if (existing) {
            throw new Error("This issue relation already exists.");
        }

        const relationId = await ctx.db.insert("issueRelations", {
            fromIssueId: args.fromIssueId,
            toIssueId: args.toIssueId,
            relationType: args.relationType,
            createdBy: member._id,
            createdAt: Date.now(),
        });

        await logPlanningActivity(
            ctx,
            member._id,
            `linked issues (${args.relationType})`,
            `${fromIssue.title} -> ${toIssue.title}`
        );

        return relationId;
    },
});

// Remove an issue relation.
export const remove = mutation({
    args: { id: v.id("issueRelations") },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEditPlanning(member);

        const relation = await ctx.db.get(args.id);
        if (!relation) throw new Error("Issue relation not found");

        const fromIssue = await ctx.db.get(relation.fromIssueId);
        const toIssue = await ctx.db.get(relation.toIssueId);

        await ctx.db.delete(args.id);
        await logPlanningActivity(
            ctx,
            member._id,
            "removed issue relation",
            `${fromIssue?.title ?? "Unknown"} -> ${toIssue?.title ?? "Unknown"}`
        );
    },
});
