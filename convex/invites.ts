import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

// Generate random invite code
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const resolveCurrentMember = async (
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

const requireAdminMember = async (ctx: MutationCtx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await resolveCurrentMember(ctx, userId);
    if (!member || member.accessLevel !== "admin") {
        throw new Error("Only admins can manage invite links");
    }

    return member;
};

const logInviteActivity = async (
    ctx: MutationCtx,
    memberId: Id<"teamMembers">,
    action: string,
    target: string
) => {
    await ctx.db.insert("activityLog", {
        userId: memberId,
        action,
        target,
        createdAt: Date.now(),
    });
};

// Create an invite link (admin only)
export const create = mutation({
    args: {
        expiresInDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const member = await requireAdminMember(ctx);
        const expiresInDays = args.expiresInDays ?? 7;
        if (expiresInDays <= 0) {
            throw new Error("Expiration must be at least 1 day.");
        }

        const code = generateInviteCode();
        const expiresAt = Date.now() + (expiresInDays * DAY_MS);

        const inviteId = await ctx.db.insert("invites", {
            code,
            createdBy: member._id,
            expiresAt,
        });

        await logInviteActivity(ctx, member._id, "created invite", code);
        return { code, inviteId, expiresAt };
    },
});

// Validate an invite code
export const validate = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .first();

        if (!invite) {
            return { valid: false, reason: "Invalid invite code" };
        }

        if (invite.usedBy) {
            return { valid: false, reason: "Invite already used" };
        }

        if (invite.expiresAt < Date.now()) {
            return { valid: false, reason: "Invite expired" };
        }

        return { valid: true, invite };
    },
});

// Redeem an invite code (creates team member)
export const redeem = mutation({
    args: {
        code: v.string(),
        role: v.string(),
        department: v.union(
            v.literal("engineering"),
            v.literal("design"),
            v.literal("finance"),
            v.literal("product"),
            v.literal("marketing")
        ),
        skills: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Check if already a team member
        const existingMember = await ctx.db
            .query("teamMembers")
            .withIndex("by_email", (q) => q.eq("email", user.email ?? ""))
            .first();

        if (existingMember) {
            throw new Error("Already a team member");
        }

        // Validate invite
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .first();

        if (!invite) throw new Error("Invalid invite code");
        if (invite.usedBy) throw new Error("Invite already used");
        if (invite.expiresAt < Date.now()) throw new Error("Invite expired");

        // Create team member
        const memberId = await ctx.db.insert("teamMembers", {
            name: user.name ?? "User",
            email: user.email ?? "",
            role: args.role,
            avatar: user.image ?? "",
            department: args.department,
            status: "online",
            accessLevel: "member",
            userId: userId,
            skills: args.skills,
        });

        // Mark invite as used
        await ctx.db.patch(invite._id, {
            usedBy: memberId,
            usedAt: Date.now(),
        });

        await logInviteActivity(ctx, memberId, "joined team via invite", invite.code);
        return memberId;
    },
});

// List all invites (admin only)
export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const member = await resolveCurrentMember(ctx, userId);

        if (!member || member.accessLevel !== "admin") {
            return [];
        }

        const now = Date.now();
        const invites = await ctx.db.query("invites").order("desc").collect();

        return await Promise.all(
            invites.map(async (invite) => {
                const creator = await ctx.db.get(invite.createdBy);
                return {
                    ...invite,
                    creatorName: creator?.name ?? "Unknown",
                    creatorEmail: creator?.email ?? "",
                    isExpired: invite.expiresAt < now,
                    isUsed: !!invite.usedBy,
                };
            })
        );
    },
});

// Revoke an invite link (admin only, unused invites only)
export const revoke = mutation({
    args: { id: v.id("invites") },
    handler: async (ctx, args) => {
        const member = await requireAdminMember(ctx);

        const invite = await ctx.db.get(args.id);
        if (!invite) throw new Error("Invite not found");
        if (invite.usedBy) throw new Error("Used invites cannot be revoked");

        await ctx.db.delete(args.id);
        await logInviteActivity(ctx, member._id, "revoked invite", invite.code);
        return { id: args.id };
    },
});

// Extend expiry for an invite link (admin only, unused invites only)
export const extend = mutation({
    args: {
        id: v.id("invites"),
        expiresInDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const member = await requireAdminMember(ctx);

        const invite = await ctx.db.get(args.id);
        if (!invite) throw new Error("Invite not found");
        if (invite.usedBy) throw new Error("Used invites cannot be extended");

        const extensionDays = args.expiresInDays ?? 7;
        if (extensionDays <= 0) {
            throw new Error("Extension must be at least 1 day.");
        }

        const baseTime = Math.max(invite.expiresAt, Date.now());
        const expiresAt = baseTime + (extensionDays * DAY_MS);
        await ctx.db.patch(invite._id, { expiresAt });
        await logInviteActivity(
            ctx,
            member._id,
            `extended invite by ${extensionDays}d`,
            invite.code
        );

        return { id: invite._id, expiresAt };
    },
});
