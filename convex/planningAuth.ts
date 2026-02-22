import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { auth } from "./auth";

type RequestCtx = MutationCtx | QueryCtx;

export const resolveCurrentMember = async (ctx: RequestCtx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

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

export const requireCurrentMember = async (ctx: MutationCtx) => {
    const member = await resolveCurrentMember(ctx);
    if (!member) {
        throw new Error("You must join the team before managing planning data.");
    }
    return member;
};

export const assertCanEditPlanning = (member: Doc<"teamMembers">) => {
    if (member.accessLevel === "viewer") {
        throw new Error("Read-only access. Ask an admin for edit permissions.");
    }
};

export const logPlanningActivity = async (
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
