import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
    ...authTables,

    // teamMembers: Team roster (separate from auth users)
    teamMembers: defineTable({
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
        accessLevel: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
        skills: v.optional(v.array(v.string())),
        userId: v.optional(v.id("users")), // Link to auth user
    })
        .index("by_department", ["department"])
        .index("by_email", ["email"])
        .index("by_user", ["userId"]),

    // invites: Team invite links
    invites: defineTable({
        code: v.string(),
        createdBy: v.id("teamMembers"),
        expiresAt: v.number(),
        usedBy: v.optional(v.id("teamMembers")),
        usedAt: v.optional(v.number()),
    })
        .index("by_code", ["code"]),

    // tasks: Core task management (supports team + personal tasks)
    tasks: defineTable({
        title: v.string(),
        description: v.string(),
        status: v.union(
            v.literal("todo"),
            v.literal("in-progress"),
            v.literal("review"),
            v.literal("done")
        ),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        visibility: v.union(v.literal("team"), v.literal("personal")),
        ownerId: v.id("teamMembers"),
        assigneeId: v.id("teamMembers"),
        dueDate: v.string(),
        tags: v.array(v.string()),
        createdAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_assignee", ["assigneeId"])
        .index("by_visibility", ["visibility"])
        .index("by_owner", ["ownerId"]),

    // comments: Task comments
    comments: defineTable({
        taskId: v.id("tasks"),
        authorId: v.id("teamMembers"),
        content: v.string(),
        createdAt: v.number(),
    }).index("by_task", ["taskId"]),

    // budgetItems: Budget categories
    budgetItems: defineTable({
        category: v.string(),
        allocated: v.number(),
        spent: v.number(),
    }),

    // expenses: Individual expenses
    expenses: defineTable({
        description: v.string(),
        amount: v.number(),
        category: v.string(),
        date: v.string(),
        status: v.union(
            v.literal("approved"),
            v.literal("pending"),
            v.literal("rejected")
        ),
        createdAt: v.number(),
    }),

    // milestones: Project milestones
    milestones: defineTable({
        title: v.string(),
        description: v.string(),
        dueDate: v.string(),
        status: v.union(
            v.literal("upcoming"),
            v.literal("in-progress"),
            v.literal("completed")
        ),
        progress: v.number(),
    }),

    // events: Calendar events
    events: defineTable({
        title: v.string(),
        date: v.string(),
        time: v.string(),
        type: v.union(
            v.literal("meeting"),
            v.literal("review"),
            v.literal("presentation")
        ),
        attendees: v.number(),
    }),

    // activityLog: Team activity for dashboard
    activityLog: defineTable({
        userId: v.id("teamMembers"),
        action: v.string(),
        target: v.string(),
        createdAt: v.number(),
    }).index("by_time", ["createdAt"]),

    // userProfiles: Extended profile data for auth users
    userProfiles: defineTable({
        userId: v.id("users"),
        phone: v.optional(v.string()),
        location: v.optional(v.string()),
        timezone: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
        role: v.optional(v.string()),
        department: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
    }).index("by_user", ["userId"]),
});

export default schema;
