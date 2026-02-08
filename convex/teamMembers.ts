import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

const resolveMemberByUser = async (
    ctx: MutationCtx | QueryCtx,
    userId: Id<"users">
) => {
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
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentMember = await resolveMemberByUser(ctx, userId);
    if (!currentMember) throw new Error("Team membership required");

    return { userId, currentMember };
};

const countOtherAdmins = async (ctx: MutationCtx, memberId: Id<"teamMembers">) => {
    const adminMembers = await ctx.db
        .query("teamMembers")
        .filter((q) => q.eq(q.field("accessLevel"), "admin"))
        .collect();

    return adminMembers.filter((member) => member._id !== memberId).length;
};

// Get all team members
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("teamMembers").collect();
    },
});

// Get team member by ID
export const getById = query({
    args: { id: v.id("teamMembers") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Get team member by email
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("teamMembers")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

// Add current logged-in user as team member
export const addCurrentUserAsTeamMember = mutation({
    args: {
        role: v.optional(v.string()),
        department: v.optional(v.union(
            v.literal("engineering"),
            v.literal("design"),
            v.literal("product"),
            v.literal("marketing"),
            v.literal("finance")
        )),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if already a team member
        const existing = await resolveMemberByUser(ctx, userId);

        if (existing) {
            return existing._id;
        }
        // Check if this is the first team member
        const existingMembers = await ctx.db.query("teamMembers").collect();
        const isFirstMember = existingMembers.length === 0;

        // Create team member
        return await ctx.db.insert("teamMembers", {
            name: user.name ?? "User",
            email: user.email ?? "",
            role: args.role ?? "Developer",
            avatar: user.image ?? "",
            department: args.department ?? "engineering",
            status: "online",
            accessLevel: isFirstMember ? "admin" : "member",
            userId: userId,
        });
    },
});

// Create a new team member (admin only)
export const create = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        role: v.string(),
        avatar: v.string(),
        department: v.union(
            v.literal("engineering"),
            v.literal("design"),
            v.literal("finance"),
            v.literal("product"),
            v.literal("marketing")
        ),
        status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
        accessLevel: v.optional(v.union(v.literal("admin"), v.literal("member"), v.literal("viewer"))),
    },
    handler: async (ctx, args) => {
        const { currentMember } = await requireCurrentMember(ctx);
        if (currentMember.accessLevel !== "admin") {
            throw new Error("Only admins can create team members");
        }

        return await ctx.db.insert("teamMembers", {
            ...args,
            accessLevel: args.accessLevel ?? "member",
        });
    },
});

// Update team member status
export const updateStatus = mutation({
    args: {
        id: v.id("teamMembers"),
        status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.id, { status: args.status });
    },
});

// Update team member (admin or self)
export const update = mutation({
    args: {
        id: v.id("teamMembers"),
        role: v.optional(v.string()),
        department: v.optional(v.union(
            v.literal("engineering"),
            v.literal("design"),
            v.literal("finance"),
            v.literal("product"),
            v.literal("marketing")
        )),
        skills: v.optional(v.array(v.string())),
        accessLevel: v.optional(v.union(v.literal("admin"), v.literal("member"), v.literal("viewer"))),
    },
    handler: async (ctx, args) => {
        const { currentMember } = await requireCurrentMember(ctx);

        const targetMember = await ctx.db.get(args.id);
        if (!targetMember) throw new Error("Member not found");

        // Only admin or self can update
        const isSelf = currentMember?._id === args.id;
        const isAdmin = currentMember?.accessLevel === "admin";

        if (!isSelf && !isAdmin) {
            throw new Error("Not authorized");
        }

        // Only admin can change accessLevel
        if (args.accessLevel && !isAdmin) {
            throw new Error("Only admin can change access level");
        }
        if (
            args.accessLevel &&
            targetMember.accessLevel === "admin" &&
            args.accessLevel !== "admin"
        ) {
            const otherAdminCount = await countOtherAdmins(ctx, targetMember._id);
            if (otherAdminCount === 0) {
                throw new Error("Cannot remove the last admin.");
            }
        }

        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        return await ctx.db.patch(id, cleanUpdates);
    },
});

// Remove team member (admin only)
export const remove = mutation({
    args: { id: v.id("teamMembers") },
    handler: async (ctx, args) => {
        const { currentMember } = await requireCurrentMember(ctx);

        if (!currentMember || currentMember.accessLevel !== "admin") {
            throw new Error("Only admins can remove members");
        }

        // Don't allow removing yourself
        if (currentMember._id === args.id) {
            throw new Error("Cannot remove yourself");
        }

        const targetMember = await ctx.db.get(args.id);
        if (!targetMember) throw new Error("Member not found");

        if (targetMember.accessLevel === "admin") {
            const otherAdminCount = await countOtherAdmins(ctx, targetMember._id);
            if (otherAdminCount === 0) {
                throw new Error("Cannot remove the last admin.");
            }
        }

        await ctx.db.delete(args.id);
    },
});

// Get current user's team member info
export const getCurrentMember = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;
        return await resolveMemberByUser(ctx, userId);
    },
});
