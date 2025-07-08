import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Buscar todas as tracks
export const getTracks = query({
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    
    // Popular o nome da categoria para cada track
    const tracksWithCategories = await Promise.all(
      tracks.map(async (track) => {
        const category = await ctx.db.get(track.categoryId);
        return {
          ...track,
          category: category?.name || "Sem categoria"
        };
      })
    );
    
    return tracksWithCategories;
  },
});

// Adicionar nova track
export const addTrack = action({
  args: {
    id: v.id("tracks"),
    name: v.string(),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const userId = await ctx.runMutation(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      if (!user) throw new Error("User not found");
      return user._id;
    });
    
    const trackId = await ctx.runMutation(async (ctx) => {
      return await ctx.db.insert("tracks", {
        name: args.name,
        categoryId: args.categoryId,
        versions: {
          short: "",
          long: "",
        },
        createdAt: Date.now(),
        createdBy: userId,
      });
    });
    
    return trackId;
  },
});

// Deletar track existente
export const deleteTrack = mutation({
  args: {
    id: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.id);
    if (!track) throw new Error("Track not found");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Atualizar track existente
export const updateTrack = mutation({
  args: {
    id: v.id("tracks"),
    name: v.string(),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.id);
    if (!track) throw new Error("Track not found");
    
    await ctx.db.patch(args.id, {
      name: args.name,
      categoryId: args.categoryId,
    });
    
    return { success: true };
  },
});