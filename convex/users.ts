import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Get current authenticated user
export const currentUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return null;
        }
        const user = await ctx.db.get(userId);
        return user;
    },
});

// Get current user with their profile data
export const getProfile = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            return null;
        }

        const user = await ctx.db.get(userId);
        if (!user) {
            return null;
        }

        // Get profile data
        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        return {
            // Auth data (from GitHub)
            _id: user._id,
            name: user.name ?? "User",
            email: user.email ?? "",
            image: user.image ?? "",
            // Profile data (editable)
            phone: profile?.phone ?? "",
            location: profile?.location ?? "",
            timezone: profile?.timezone ?? "",
            bio: profile?.bio ?? "",
            website: profile?.website ?? "",
            role: profile?.role ?? "",
            department: profile?.department ?? "",
            skills: profile?.skills ?? [],
            // Metadata
            hasProfile: !!profile,
        };
    },
});

// Update user profile
export const updateProfile = mutation({
    args: {
        phone: v.optional(v.string()),
        location: v.optional(v.string()),
        timezone: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
        role: v.optional(v.string()),
        department: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // Check if profile exists
        const existingProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (existingProfile) {
            // Update existing profile
            await ctx.db.patch(existingProfile._id, args);
            return existingProfile._id;
        } else {
            // Create new profile
            return await ctx.db.insert("userProfiles", {
                userId,
                ...args,
            });
        }
    },
});
