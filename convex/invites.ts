import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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

// Create an invite link (admin only)
export const create = mutation({
    args: {
        expiresInDays: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Get current user's team member record
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const member = await ctx.db
            .query("teamMembers")
            .withIndex("by_email", (q) => q.eq("email", user.email ?? ""))
            .first();

        if (!member || member.accessLevel !== "admin") {
            throw new Error("Only admins can create invite links");
        }

        const code = generateInviteCode();
        const expiresInDays = args.expiresInDays ?? 7;
        const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);

        const inviteId = await ctx.db.insert("invites", {
            code,
            createdBy: member._id,
            expiresAt,
        });

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

        return memberId;
    },
});

// List all invites (admin only)
export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const user = await ctx.db.get(userId);
        if (!user) return [];

        const member = await ctx.db
            .query("teamMembers")
            .withIndex("by_email", (q) => q.eq("email", user.email ?? ""))
            .first();

        if (!member || member.accessLevel !== "admin") {
            return [];
        }

        return await ctx.db.query("invites").order("desc").collect();
    },
});
