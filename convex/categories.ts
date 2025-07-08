import { mutation, query } from "./_generated/server";
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
    category: v.string(),
    sessionToken: v.string()
  },
  handler: async (ctx, args) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    // Verificar se a sessão não expirou
    if (session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      throw new Error("Session expired");
    }

    // Buscar dados do usuário
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Verificar se a categoria já existe
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.category))
      .first();
    
    if (existingCategory) {
      throw new Error("Category already exists");
    }
    
    const categoryId = await ctx.db.insert("categories", {
      name: args.category,
      description: `Categoria: ${args.category}`,
      createdAt: Date.now(),
      createdBy: user._id,
    });
    
    return await ctx.db.get(categoryId);
  },
});

// Buscar ou criar categoria "Uncategorized"
export const getOrCreateUncategorized = mutation({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    // Verificar se já existe categoria "Uncategorized"
    let uncategorized = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", "Uncategorized"))
      .first();
    
    if (!uncategorized) {
      // Criar categoria "Uncategorized" se não existir
      const categoryId = await ctx.db.insert("categories", {
        name: "Uncategorized",
        description: "Categoria padrão para faixas sem categoria",
        createdAt: Date.now(),
        createdBy: args.createdBy,
      });
      
      uncategorized = await ctx.db.get(categoryId);
    }
    
    return uncategorized;
  },
});

// Modificar deleteCategory para mover tracks para "Uncategorized"
export const deleteCategory = mutation({
  args: { 
    categoryId: v.id("categories"), 
    sessionToken: v.string()
  },
  handler: async (ctx, args) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    // Verificar se a sessão não expirou
    if (session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      throw new Error("Session expired");
    }

    // Buscar dados do usuário
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Buscar faixas usando esta categoria
    const tracksUsingCategory = await ctx.db
      .query("tracks")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    
    if (tracksUsingCategory.length > 0) {
      // Buscar ou criar categoria "Uncategorized"
      let uncategorized = await ctx.db
        .query("categories")
        .withIndex("by_name", (q) => q.eq("name", "Uncategorized"))
        .first();
      
      if (!uncategorized) {
        const categoryId = await ctx.db.insert("categories", {
          name: "Uncategorized",
          description: "Categoria padrão para faixas sem categoria",
          createdAt: Date.now(),
          createdBy: user._id,
        });
        uncategorized = await ctx.db.get(categoryId);
      }
      
      // Mover todas as faixas para "Uncategorized"
      for (const track of tracksUsingCategory) {
        await ctx.db.patch(track._id, {
          categoryId: uncategorized!._id,
        });
      }
    }
    
    await ctx.db.delete(args.categoryId);
    return { success: true };
  },
});