import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    passwordHash: v.optional(v.string()),
  }).index("by_email", ["email"]),
  
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["token"]).index("by_user", ["userId"]),
  
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_name", ["name"]),
  
  tracks: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    versions: v.object({
      short: v.optional(v.string()),
      long: v.optional(v.string()),
    }),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_category", ["categoryId"]),
});