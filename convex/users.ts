import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

type NotificationPreference = {
    id: string;
    email: boolean;
    push: boolean;
    inApp: boolean;
};

type AccentColor =
    | "#F0FF7A"
    | "#60A5FA"
    | "#A78BFA"
    | "#F472B6"
    | "#34D399";

type InterfaceDensity = "compact" | "comfortable" | "spacious";
type TaskPriorityFilter = "all" | "low" | "medium" | "high";
type TaskViewMode = "team" | "personal";
type TaskSavedView = {
    id: string;
    label: string;
    query?: string;
    priority: TaskPriorityFilter;
    viewMode: TaskViewMode;
    createdAt: number;
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationPreference[] = [
    { id: "task_assignments", email: true, push: true, inApp: true },
    { id: "task_due", email: true, push: false, inApp: true },
    { id: "mentions", email: true, push: true, inApp: true },
    { id: "project_updates", email: false, push: false, inApp: true },
    { id: "team_activity", email: false, push: false, inApp: false },
    { id: "budget_alerts", email: true, push: true, inApp: true },
];

const DEFAULT_ACCENT_COLOR: AccentColor = "#F0FF7A";
const DEFAULT_INTERFACE_DENSITY: InterfaceDensity = "comfortable";

const normalizeNotifications = (notifications?: NotificationPreference[]) =>
    notifications?.map((notification) => ({
        id: notification.id,
        email: notification.email,
        push: notification.push,
        inApp: notification.inApp,
    })) ?? DEFAULT_NOTIFICATION_SETTINGS;

const normalizeTaskViews = (views?: TaskSavedView[]) =>
    views?.map((view) => ({
        id: view.id,
        label: view.label,
        query: view.query,
        priority: view.priority,
        viewMode: view.viewMode,
        createdAt: view.createdAt,
    })) ?? [];

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
            accentColor: profile?.settingsAccentColor ?? DEFAULT_ACCENT_COLOR,
            interfaceDensity:
                profile?.settingsInterfaceDensity ?? DEFAULT_INTERFACE_DENSITY,
            notifications: normalizeNotifications(profile?.settingsNotifications),
        };
    },
});

// Get task board saved views for the current user.
export const getTaskViews = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) return [];

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        return normalizeTaskViews(profile?.taskSavedViews).sort(
            (a, b) => b.createdAt - a.createdAt
        );
    },
});

// Save the current task board view for quick reuse.
export const saveTaskView = mutation({
    args: {
        label: v.string(),
        query: v.optional(v.string()),
        priority: v.union(
            v.literal("all"),
            v.literal("low"),
            v.literal("medium"),
            v.literal("high")
        ),
        viewMode: v.union(v.literal("team"), v.literal("personal")),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const label = args.label.trim();
        if (!label) {
            throw new Error("View name is required.");
        }

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const existingViews = normalizeTaskViews(profile?.taskSavedViews);
        const now = Date.now();
        const newView: TaskSavedView = {
            id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
            label,
            query: args.query?.trim() || undefined,
            priority: args.priority,
            viewMode: args.viewMode,
            createdAt: now,
        };

        const deduplicatedViews = existingViews.filter(
            (view) => view.label.toLowerCase() !== label.toLowerCase()
        );
        const nextViews = [newView, ...deduplicatedViews].slice(0, 8);

        if (profile) {
            await ctx.db.patch(profile._id, { taskSavedViews: nextViews });
            return newView;
        }

        await ctx.db.insert("userProfiles", {
            userId,
            taskSavedViews: nextViews,
        });

        return newView;
    },
});

// Delete a saved task board view.
export const deleteTaskView = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await auth.getUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
        if (!profile) return [];

        const nextViews = normalizeTaskViews(profile.taskSavedViews).filter(
            (view) => view.id !== args.id
        );
        await ctx.db.patch(profile._id, { taskSavedViews: nextViews });
        return nextViews;
    },
});

// Update persisted user settings.
export const updateSettings = mutation({
    args: {
        theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
        language: v.optional(v.string()),
        twoFactorEnabled: v.optional(v.boolean()),
        accentColor: v.optional(
            v.union(
                v.literal("#F0FF7A"),
                v.literal("#60A5FA"),
                v.literal("#A78BFA"),
                v.literal("#F472B6"),
                v.literal("#34D399")
            )
        ),
        interfaceDensity: v.optional(
            v.union(
                v.literal("compact"),
                v.literal("comfortable"),
                v.literal("spacious")
            )
        ),
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
            settingsAccentColor:
                args.accentColor ??
                existingProfile?.settingsAccentColor ??
                DEFAULT_ACCENT_COLOR,
            settingsInterfaceDensity:
                args.interfaceDensity ??
                existingProfile?.settingsInterfaceDensity ??
                DEFAULT_INTERFACE_DENSITY,
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
