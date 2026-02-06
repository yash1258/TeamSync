import { mutation } from "./_generated/server";

// Clear all data from all tables
export const clearAll = mutation({
    args: {},
    handler: async (ctx) => {
        const tables = ["activityLog", "comments", "events", "milestones", "expenses", "budgetItems", "tasks", "teamMembers"] as const;

        for (const table of tables) {
            const docs = await ctx.db.query(table).collect();
            for (const doc of docs) {
                await ctx.db.delete(doc._id);
            }
        }

        return { message: "All data cleared!" };
    },
});

// Seed function to populate initial data
export const seedAll = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if already seeded
        const existingMembers = await ctx.db.query("teamMembers").first();
        if (existingMembers) {
            return { message: "Already seeded!" };
        }

        // Seed Team Members
        const teamMemberIds: Record<string, any> = {};

        const teamData = [
            { name: "Alex Chen", email: "alex@team.com", role: "Product Lead", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", department: "product" as const, status: "online" as const, accessLevel: "admin" as const },
            { name: "Sarah Miller", email: "sarah@team.com", role: "Senior Designer", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", department: "design" as const, status: "online" as const, accessLevel: "member" as const },
            { name: "James Wilson", email: "james@team.com", role: "Backend Engineer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", department: "engineering" as const, status: "online" as const, accessLevel: "member" as const },
            { name: "Emma Davis", email: "emma@team.com", role: "Product Designer", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", department: "design" as const, status: "away" as const, accessLevel: "member" as const },
            { name: "Michael Chen", email: "michael@team.com", role: "Finance Manager", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", department: "finance" as const, status: "online" as const, accessLevel: "member" as const },
            { name: "Lisa Wong", email: "lisa@team.com", role: "Marketing Lead", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", department: "marketing" as const, status: "online" as const, accessLevel: "member" as const },
            { name: "David Park", email: "david@team.com", role: "Frontend Engineer", avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face", department: "engineering" as const, status: "offline" as const, accessLevel: "member" as const },
            { name: "Rachel Kim", email: "rachel@team.com", role: "DevOps Engineer", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face", department: "engineering" as const, status: "online" as const, accessLevel: "viewer" as const },
        ];

        for (const member of teamData) {
            const id = await ctx.db.insert("teamMembers", member);
            teamMemberIds[member.email] = id;
        }

        // Seed Tasks
        const tasksData = [
            { title: "Design system documentation", description: "Create comprehensive documentation for the new design system including components, tokens, and usage guidelines.", status: "in-progress" as const, priority: "high" as const, visibility: "team" as const, ownerEmail: "sarah@team.com", assigneeEmail: "sarah@team.com", dueDate: "2024-02-10", tags: ["design", "docs"] },
            { title: "API integration for payments", description: "Integrate Stripe API for payment processing including webhooks and error handling.", status: "todo" as const, priority: "high" as const, visibility: "team" as const, ownerEmail: "james@team.com", assigneeEmail: "james@team.com", dueDate: "2024-02-15", tags: ["backend", "api", "stripe"] },
            { title: "User onboarding flow", description: "Redesign the user onboarding experience to improve activation rates.", status: "review" as const, priority: "medium" as const, visibility: "team" as const, ownerEmail: "emma@team.com", assigneeEmail: "emma@team.com", dueDate: "2024-02-08", tags: ["ux", "design"] },
            { title: "Q1 Budget Review", description: "Review and approve Q1 budget allocation across all departments.", status: "todo" as const, priority: "high" as const, visibility: "team" as const, ownerEmail: "michael@team.com", assigneeEmail: "michael@team.com", dueDate: "2024-02-12", tags: ["finance", "budget"] },
            { title: "Mobile app performance", description: "Optimize mobile app loading times and reduce bundle size.", status: "in-progress" as const, priority: "medium" as const, visibility: "team" as const, ownerEmail: "david@team.com", assigneeEmail: "david@team.com", dueDate: "2024-02-20", tags: ["mobile", "performance"] },
            { title: "Marketing landing page", description: "Create landing page for upcoming product launch campaign.", status: "done" as const, priority: "low" as const, visibility: "team" as const, ownerEmail: "lisa@team.com", assigneeEmail: "lisa@team.com", dueDate: "2024-02-05", tags: ["marketing", "web"] },
            { title: "Database migration", description: "Migrate user data to new database schema with zero downtime.", status: "review" as const, priority: "high" as const, visibility: "team" as const, ownerEmail: "james@team.com", assigneeEmail: "james@team.com", dueDate: "2024-02-18", tags: ["backend", "database"] },
            { title: "Security audit", description: "Conduct security audit and fix identified vulnerabilities.", status: "todo" as const, priority: "high" as const, visibility: "team" as const, ownerEmail: "rachel@team.com", assigneeEmail: "rachel@team.com", dueDate: "2024-02-25", tags: ["security", "audit"] },
        ];

        for (const task of tasksData) {
            await ctx.db.insert("tasks", {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                visibility: task.visibility,
                ownerId: teamMemberIds[task.ownerEmail],
                assigneeId: teamMemberIds[task.assigneeEmail],
                dueDate: task.dueDate,
                tags: task.tags,
                createdAt: Date.now(),
            });
        }

        // Seed Budget Items
        const budgetData = [
            { category: "Engineering", allocated: 50000, spent: 42000 },
            { category: "Design", allocated: 25000, spent: 18000 },
            { category: "Marketing", allocated: 30000, spent: 28000 },
            { category: "Operations", allocated: 20000, spent: 15000 },
            { category: "Infrastructure", allocated: 15000, spent: 12000 },
            { category: "Legal & Compliance", allocated: 10000, spent: 5000 },
        ];

        for (const item of budgetData) {
            await ctx.db.insert("budgetItems", item);
        }

        // Seed Expenses
        const expensesData = [
            { description: "AWS Infrastructure", amount: 4500, category: "Infrastructure", date: "2024-02-01", status: "approved" as const },
            { description: "Design tools subscription", amount: 1200, category: "Design", date: "2024-02-02", status: "approved" as const },
            { description: "Marketing campaign", amount: 8000, category: "Marketing", date: "2024-02-03", status: "pending" as const },
            { description: "Team offsite", amount: 3500, category: "Operations", date: "2024-02-04", status: "approved" as const },
            { description: "Software licenses", amount: 2800, category: "Engineering", date: "2024-02-05", status: "approved" as const },
        ];

        for (const expense of expensesData) {
            await ctx.db.insert("expenses", { ...expense, createdAt: Date.now() });
        }

        // Seed Milestones
        const milestonesData = [
            { title: "Project Kickoff", description: "Initial team meeting and project setup", dueDate: "2024-02-05", status: "completed" as const, progress: 100 },
            { title: "Design Phase Complete", description: "All design mockups and prototypes finalized", dueDate: "2024-02-15", status: "in-progress" as const, progress: 75 },
            { title: "MVP Development", description: "Core features development and testing", dueDate: "2024-03-01", status: "in-progress" as const, progress: 40 },
            { title: "Beta Launch", description: "Release beta version to select users", dueDate: "2024-03-15", status: "upcoming" as const, progress: 0 },
            { title: "Public Launch", description: "Official product launch", dueDate: "2024-04-01", status: "upcoming" as const, progress: 0 },
        ];

        for (const milestone of milestonesData) {
            await ctx.db.insert("milestones", milestone);
        }

        // Seed Events
        const eventsData = [
            { title: "Sprint Planning", date: "2024-02-05", time: "10:00 AM", type: "meeting" as const, attendees: 5 },
            { title: "Design Review", date: "2024-02-07", time: "2:00 PM", type: "review" as const, attendees: 3 },
            { title: "Team Standup", date: "2024-02-08", time: "9:30 AM", type: "meeting" as const, attendees: 8 },
            { title: "Budget Review", date: "2024-02-12", time: "11:00 AM", type: "review" as const, attendees: 4 },
            { title: "Client Presentation", date: "2024-02-14", time: "3:00 PM", type: "presentation" as const, attendees: 6 },
        ];

        for (const event of eventsData) {
            await ctx.db.insert("events", event);
        }

        // Seed Activity Log
        const activitiesData = [
            { userEmail: "sarah@team.com", action: "completed task", target: "Homepage redesign" },
            { userEmail: "james@team.com", action: "commented on", target: "API integration" },
            { userEmail: "emma@team.com", action: "started", target: "User research" },
            { userEmail: "michael@team.com", action: "approved", target: "Q1 budget" },
        ];

        for (let i = 0; i < activitiesData.length; i++) {
            const activity = activitiesData[i];
            await ctx.db.insert("activityLog", {
                userId: teamMemberIds[activity.userEmail],
                action: activity.action,
                target: activity.target,
                createdAt: Date.now() - i * 60000 * 15,
            });
        }

        return { message: "Seed completed successfully!" };
    },
});
