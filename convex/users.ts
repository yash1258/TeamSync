import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

type NotificationPreference = {
    id: string;
    email: boolean;
    push: boolean;
    inApp: boolean;
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationPreference[] = [
    { id: "task_assignments", email: true, push: true, inApp: true },
    { id: "task_due", email: true, push: false, inApp: true },
    { id: "mentions", email: true, push: true, inApp: true },
    { id: "project_updates", email: false, push: false, inApp: true },
    { id: "team_activity", email: false, push: false, inApp: false },
    { id: "budget_alerts", email: true, push: true, inApp: true },
];

const normalizeNotifications = (notifications?: NotificationPreference[]) =>
    notifications?.map((notification) => ({
        id: notification.id,
        email: notification.email,
        push: notification.push,
        inApp: notification.inApp,
    })) ?? DEFAULT_NOTIFICATION_SETTINGS;

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

// Get persisted user settings with sensible defaults.
export const getSettings = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return null;

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        return {
            theme: profile?.settingsTheme ?? "dark",
            language: profile?.settingsLanguage ?? "en",
            twoFactorEnabled: profile?.settingsTwoFactorEnabled ?? false,
            notifications: normalizeNotifications(profile?.settingsNotifications),
        };
    },
});

// Update persisted user settings.
export const updateSettings = mutation({
    args: {
        theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
        language: v.optional(v.string()),
        twoFactorEnabled: v.optional(v.boolean()),
        notifications: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    email: v.boolean(),
                    push: v.boolean(),
                    inApp: v.boolean(),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const existingProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const settingsPayload = {
            settingsTheme: args.theme ?? existingProfile?.settingsTheme ?? "dark",
            settingsLanguage: args.language ?? existingProfile?.settingsLanguage ?? "en",
            settingsTwoFactorEnabled:
                args.twoFactorEnabled ??
                existingProfile?.settingsTwoFactorEnabled ??
                false,
            settingsNotifications: normalizeNotifications(
                args.notifications ?? existingProfile?.settingsNotifications
            ),
        };

        if (existingProfile) {
            await ctx.db.patch(existingProfile._id, settingsPayload);
            return existingProfile._id;
        }

        return await ctx.db.insert("userProfiles", {
            userId,
            ...settingsPayload,
        });
    },
});
