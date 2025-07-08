import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
  args: { categoryId: v.id("categories"), createdBy: v.id("users") },
  handler: async (ctx, args) => {
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
          createdBy: args.createdBy,
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