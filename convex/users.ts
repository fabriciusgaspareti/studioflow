import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Função simples de hash
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Gerar token de sessão
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Query para buscar usuário atual por token de sessão
export const getCurrentUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      return null;
    }

    // Verificar se a sessão não expirou
    if (session.expiresAt < Date.now()) {
      // Remover sessão expirada
      await ctx.db.delete(session._id);
      return null;
    }

    // Buscar dados do usuário
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

// Query para buscar usuário por email
export const getUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Query para buscar todos os usuários (admin)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    // Hash da senha
    const hashedPassword = simpleHash(args.password);
    
    // Verificar se email já existe
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (existingUser) {
      throw new Error("Email já está em uso");
    }
    
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: hashedPassword,
      role: args.role,
    });
    
    return {
      id: userId,
      name: args.name,
      email: args.email,
      role: args.role,
    };
  },
});

// Mutation para excluir usuário
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Verificar se o usuário existe
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Se o usuário é admin, verificar se existe outro admin
    if (user.role === "admin") {
      const allAdmins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      
      // Se este é o único admin, não permitir exclusão
      if (allAdmins.length <= 1) {
        throw new Error("Não é possível excluir o último administrador do sistema. Crie outro administrador antes de excluir este usuário.");
      }
    }

    // Remover todas as sessões do usuário
    const userSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const session of userSessions) {
      await ctx.db.delete(session._id);
    }

    // Excluir o usuário
    await ctx.db.delete(args.userId);
    
    return { success: true, deletedUser: user.name };
  },
});

// Mutation para fazer login
export const signIn = mutation({
  args: { 
    email: v.string(), 
    password: v.string() 
  },
  handler: async (ctx, args) => {
    // Buscar usuário por email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }

    // Verificar se o usuário tem senha configurada
    if (!user.passwordHash) {
      return { success: false, error: "Usuário precisa configurar senha" };
    }

    // Verificar senha
    const passwordHash = simpleHash(args.password);
    if (user.passwordHash !== passwordHash) {
      return { success: false, error: "Senha incorreta" };
    }

    // Remover sessões antigas do usuário
    const oldSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    // Criar nova sessão
    const sessionToken = generateSessionToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dias
    
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt,
      createdAt: Date.now(),
    });

    return { 
      success: true, 
      sessionToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  },
});

// Mutation para fazer logout
export const signOut = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Buscar e remover a sessão
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Mutation para adicionar usuário
export const addUser = mutation({
  args: { 
    name: v.string(), 
    email: v.string(), 
    role: v.union(v.literal("user"), v.literal("admin")),
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Verificar se o email já existe
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("Email já está em uso");
    }

    // Criar hash da senha
    const passwordHash = simpleHash(args.password);

    // Inserir novo usuário
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      passwordHash,
    });

    return {
      id: userId,
      name: args.name,
      email: args.email,
      role: args.role,
    };
  },
});

// Adicionar esta função interna para verificar sessão
export const getSessionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Buscar sessão pelo token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Verificar se a sessão não expirou
    if (session.expiresAt < Date.now()) {
      // Remover sessão expirada
      await ctx.db.delete(session._id);
      return null;
    }

    return session;
  },
});