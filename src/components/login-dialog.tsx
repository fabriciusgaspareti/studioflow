"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Music4 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Por favor, preencha todos os campos." 
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await signIn(email, password);
      if (success) {
        toast({ 
          title: "Sucesso", 
          description: "Login realizado com sucesso!" 
        });
        onOpenChange(false);
        setEmail("");
        setPassword("");
        
        // Redirecionar para a página de categorias
        router.push("/categories");
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erro de Login", 
          description: "Email ou senha incorretos." 
        });
      }
    } catch (error: any) {
      console.error("Erro de Login:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro de Login", 
        description: "Ocorreu um erro. Tente novamente." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Music4 className="h-8 w-8 text-primary mr-2" />
            <span className="text-2xl font-bold">StudioFlow</span>
          </div>
          <DialogTitle>Entrar</DialogTitle>
          <DialogDescription>
            Digite suas credenciais para acessar sua conta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="nome@exemplo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}