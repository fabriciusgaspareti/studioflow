import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Carregar variáveis de ambiente
config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function seedUsers() {
  try {
    console.log("Criando usuários...");
    
    // Adicionar usuário admin
    await client.mutation(api.users.addUser, {
      name: "Administrador",
      email: "admin@studioflow.com",
      role: "admin",
      password: "admin123"
    });
    console.log("✅ Usuário admin criado");

    // Adicionar usuário comum
    await client.mutation(api.users.addUser, {
      name: "Usuário Teste",
      email: "user@studioflow.com",
      role: "user",
      password: "user123"
    });
    console.log("✅ Usuário comum criado");

    console.log("\n🎉 Usuários criados com sucesso!");
    console.log("📧 Admin: admin@studioflow.com / admin123");
    console.log("📧 User: user@studioflow.com / user123");
  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
  }
}

seedUsers();