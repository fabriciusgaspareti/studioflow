import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const getTracks = query({
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    
    const tracksWithCategories = await Promise.all(
      tracks.map(async (track) => {
        const category = await ctx.db.get(track.categoryId);
        return {
          ...track,
          category: category?.name || "Categoria não encontrada"
        };
      })
    );
    
    return tracksWithCategories;
  },
});

// ✅ Mutation para inserir tracks
export const insertTrack = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    createdBy: v.id("users"),
    shortVersionUrl: v.string(),
    longVersionUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tracks", {
      name: args.name,
      categoryId: args.categoryId,
      versions: {
        short: args.shortVersionUrl,
        long: args.longVersionUrl,
      },
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });
  },
});

export const addTrack = action({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    createdBy: v.id("users"),
    shortVersionFile: v.object({
      name: v.string(),
      type: v.string(),
      data: v.bytes(),
    }),
    longVersionFile: v.object({
      name: v.string(),
      type: v.string(),
      data: v.bytes(),
    }),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Starting addTrack action...");
      
      const shortBlob = new Blob([args.shortVersionFile.data], { 
        type: args.shortVersionFile.type 
      });
      const longBlob = new Blob([args.longVersionFile.data], { 
        type: args.longVersionFile.type 
      });
      
      console.log("Uploading files to storage...");
      const shortVersionId = await ctx.storage.store(shortBlob);
      const longVersionId = await ctx.storage.store(longBlob);
      
      console.log("Getting URLs...");
      const shortVersionUrl = await ctx.storage.getUrl(shortVersionId);
      const longVersionUrl = await ctx.storage.getUrl(longVersionId);
      
      if (!shortVersionUrl || !longVersionUrl) {
        throw new Error("Failed to get file URLs");
      }
      
      console.log("Inserting track into database...");
      // ✅ Usar runMutation para chamar a mutation insertTrack
      const trackId = await ctx.runMutation(api.tracks.insertTrack, {
        name: args.name,
        categoryId: args.categoryId,
        createdBy: args.createdBy,
        shortVersionUrl,
        longVersionUrl,
      });
      
      console.log("Track created successfully with ID:", trackId);
      return { success: true, id: trackId };
    } catch (error) {
      console.error("Error in addTrack:", error);
      throw new Error(`Failed to add track: ${error}`);
    }
  },
});

export const deleteTrack = mutation({
  args: { id: v.id("tracks") },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.id);
    if (!track) throw new Error("Track not found");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});