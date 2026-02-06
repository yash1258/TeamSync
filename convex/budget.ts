import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all budget categories with remaining calculated
export const listCategories = query({
    args: {},
    handler: async (ctx) => {
        const items = await ctx.db.query("budgetItems").collect();
        return items.map((item) => ({
            ...item,
            remaining: item.allocated - item.spent,
        }));
    },
});

// Get budget totals for dashboard
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const items = await ctx.db.query("budgetItems").collect();
        const totalAllocated = items.reduce((sum, item) => sum + item.allocated, 0);
        const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
        return {
            totalAllocated,
            totalSpent,
            totalRemaining: totalAllocated - totalSpent,
            spentPercentage: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
        };
    },
});

// List recent expenses
export const listExpenses = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("expenses")
            .order("desc")
            .take(args.limit ?? 10);
    },
});

// Create expense
export const createExpense = mutation({
    args: {
        description: v.string(),
        amount: v.number(),
        category: v.string(),
        date: v.string(),
        status: v.union(
            v.literal("approved"),
            v.literal("pending"),
            v.literal("rejected")
        ),
    },
    handler: async (ctx, args) => {
        // Insert expense
        const expenseId = await ctx.db.insert("expenses", {
            ...args,
            createdAt: Date.now(),
        });

        // Update budget category spent amount
        const budgetItem = await ctx.db
            .query("budgetItems")
            .filter((q) => q.eq(q.field("category"), args.category))
            .first();

        if (budgetItem && args.status === "approved") {
            await ctx.db.patch(budgetItem._id, {
                spent: budgetItem.spent + args.amount,
            });
        }

        return expenseId;
    },
});

// Create budget category
export const createCategory = mutation({
    args: {
        category: v.string(),
        allocated: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("budgetItems", {
            category: args.category,
            allocated: args.allocated,
            spent: 0,
        });
    },
});
