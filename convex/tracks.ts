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

## 🔄 **Como funciona o Deploy Automático no Vercel:**

1. **Git Push** → **Vercel detecta mudanças** → **Build automático** → **Deploy**
2. O processo pode levar alguns minutos para completar
3. Se houver erros no código, o build pode falhar ou gerar erros em runtime

## ✅ **Checklist de correções necessárias:**

### **1. Arquivos Convex (Backend):**
```typescript
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
```