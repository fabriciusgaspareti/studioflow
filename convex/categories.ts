import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Buscar todas as categorias
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

// Criar nova categoria
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verificar se categoria já existe
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (existingCategory) {
      throw new Error("Categoria já existe");
    }
    
    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });
    
    return categoryId;
  },
});

// Excluir categoria
export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    // Verificar se existem faixas usando esta categoria
    const tracksUsingCategory = await ctx.db
      .query("tracks")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    
    if (tracksUsingCategory.length > 0) {
      throw new Error("Não é possível excluir categoria que possui faixas associadas");
    }
    
    await ctx.db.delete(args.categoryId);
    return { success: true };
  },
});