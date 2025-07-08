import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

// ... existing code ...