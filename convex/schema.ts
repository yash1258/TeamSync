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

    // initiatives: High-level product goals that group projects.
    initiatives: defineTable({
        title: v.string(),
        objective: v.optional(v.string()),
        status: v.union(
            v.literal("planned"),
            v.literal("active"),
            v.literal("paused"),
            v.literal("done"),
            v.literal("archived")
        ),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        ownerId: v.optional(v.id("teamMembers")),
        targetDate: v.optional(v.string()),
        createdBy: v.id("teamMembers"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_owner", ["ownerId"])
        .index("by_targetDate", ["targetDate"]),

    // projects: Workstreams under initiatives.
    projects: defineTable({
        title: v.string(),
        summary: v.optional(v.string()),
        initiativeId: v.optional(v.id("initiatives")),
        status: v.union(
            v.literal("planned"),
            v.literal("active"),
            v.literal("on-hold"),
            v.literal("done"),
            v.literal("archived")
        ),
        health: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
        leadId: v.optional(v.id("teamMembers")),
        startDate: v.optional(v.string()),
        targetDate: v.optional(v.string()),
        createdBy: v.id("teamMembers"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_initiative", ["initiativeId"])
        .index("by_lead", ["leadId"])
        .index("by_targetDate", ["targetDate"]),

    // cycles: Timeboxed planning windows.
    cycles: defineTable({
        name: v.string(),
        goal: v.optional(v.string()),
        startsAt: v.number(),
        endsAt: v.number(),
        status: v.union(
            v.literal("planned"),
            v.literal("active"),
            v.literal("closed")
        ),
        createdBy: v.id("teamMembers"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_startsAt", ["startsAt"]),

    // issues: Planning-native issue records (coexists with legacy tasks during migration).
    issues: defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        cycleId: v.optional(v.id("cycles")),
        status: v.union(
            v.literal("backlog"),
            v.literal("todo"),
            v.literal("in-progress"),
            v.literal("review"),
            v.literal("done"),
            v.literal("canceled")
        ),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        estimate: v.optional(v.number()),
        ownerId: v.id("teamMembers"),
        assigneeId: v.optional(v.id("teamMembers")),
        labels: v.array(v.string()),
        dueDate: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_project", ["projectId"])
        .index("by_cycle", ["cycleId"])
        .index("by_assignee", ["assigneeId"])
        .index("by_owner", ["ownerId"])
        .index("by_dueDate", ["dueDate"]),

    // issueRelations: Directed links between issues.
    issueRelations: defineTable({
        fromIssueId: v.id("issues"),
        toIssueId: v.id("issues"),
        relationType: v.union(
            v.literal("blocks"),
            v.literal("depends_on"),
            v.literal("related_to"),
            v.literal("duplicate_of")
        ),
        createdBy: v.id("teamMembers"),
        createdAt: v.number(),
    })
        .index("by_fromIssue", ["fromIssueId"])
        .index("by_toIssue", ["toIssueId"])
        .index("by_from_to_type", ["fromIssueId", "toIssueId", "relationType"]),

    // decisions: ADR-style product decisions.
    decisions: defineTable({
        title: v.string(),
        context: v.string(),
        decision: v.string(),
        consequences: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        status: v.union(
            v.literal("proposed"),
            v.literal("accepted"),
            v.literal("rejected"),
            v.literal("superseded")
        ),
        decidedBy: v.optional(v.id("teamMembers")),
        decidedAt: v.optional(v.number()),
        createdBy: v.id("teamMembers"),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_project", ["projectId"])
        .index("by_status", ["status"])
        .index("by_createdBy", ["createdBy"])
        .index("by_decidedAt", ["decidedAt"]),

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

    // documents: Shared project/team documents
    documents: defineTable({
        title: v.string(),
        fileName: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        fileType: v.union(
            v.literal("pdf"),
            v.literal("markdown"),
            v.literal("jsonl"),
            v.literal("other")
        ),
        mimeType: v.string(),
        size: v.number(),
        storageId: v.id("_storage"),
        createdBy: v.id("teamMembers"),
        currentVersion: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_createdBy", ["createdBy"])
        .index("by_updatedAt", ["updatedAt"]),

    // documentVersions: Immutable history of uploaded versions
    documentVersions: defineTable({
        documentId: v.id("documents"),
        version: v.number(),
        storageId: v.id("_storage"),
        fileName: v.string(),
        mimeType: v.string(),
        size: v.number(),
        uploadedBy: v.id("teamMembers"),
        changeNote: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_document", ["documentId"])
        .index("by_document_version", ["documentId", "version"]),

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
        settingsTheme: v.optional(
            v.union(v.literal("dark"), v.literal("light"), v.literal("system"))
        ),
        settingsLanguage: v.optional(v.string()),
        settingsTwoFactorEnabled: v.optional(v.boolean()),
        settingsAccentColor: v.optional(
            v.union(
                v.literal("#F0FF7A"),
                v.literal("#60A5FA"),
                v.literal("#A78BFA"),
                v.literal("#F472B6"),
                v.literal("#34D399")
            )
        ),
        settingsInterfaceDensity: v.optional(
            v.union(
                v.literal("compact"),
                v.literal("comfortable"),
                v.literal("spacious")
            )
        ),
        settingsNotifications: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    email: v.boolean(),
                    push: v.boolean(),
                    inApp: v.boolean(),
                })
            )
        ),
        taskSavedViews: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    label: v.string(),
                    query: v.optional(v.string()),
                    priority: v.union(
                        v.literal("all"),
                        v.literal("low"),
                        v.literal("medium"),
                        v.literal("high")
                    ),
                    viewMode: v.union(v.literal("team"), v.literal("personal")),
                    createdAt: v.number(),
                })
            )
        ),
    }).index("by_user", ["userId"]),
});

export default schema;
