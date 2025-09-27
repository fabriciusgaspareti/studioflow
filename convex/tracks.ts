import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
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
export const addTrack = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Unauthorized - Invalid session");
    }

    // Verificar se a sessão não expirou
    if (session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      throw new Error("Unauthorized - Session expired");
    }

    // Buscar dados do usuário
    const user = await ctx.db.get(session.userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const trackId = await ctx.db.insert("tracks", {
      name: args.name,
      categoryId: args.categoryId,
      versions: {
        short: undefined,
        long: undefined,
      },
      createdAt: Date.now(),
      createdBy: user._id,
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

// Nova função para gerar a URL de upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// A função uploadTrackFile será removida, pois o upload será feito no cliente.
// A função updateTrackFile será modificada para ser chamada pelo cliente.

export const updateTrackFile = mutation({
  args: {
    trackId: v.id("tracks"),
    short: v.optional(v.string()), // Receberá o storageId
    long: v.optional(v.string()),  // Receberá o storageId
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Autenticação
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Sessão inválida ou expirada");
    }

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Faixa não encontrada");

    // Obter URLs a partir dos storageIds
    const shortUrl = args.short ? await ctx.storage.getUrl(args.short) : undefined;
    const longUrl = args.long ? await ctx.storage.getUrl(args.long) : undefined;

    const updatedVersions = {
      ...track.versions,
      ...(shortUrl && { short: shortUrl }),
      ...(longUrl && { long: longUrl }),
    };

    await ctx.db.patch(args.trackId, {
      versions: updatedVersions,
    });
  },
});