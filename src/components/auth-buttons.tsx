"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from 'lucide-react';
import { LoginDialog } from "./login-dialog";

export function AuthButtons() {
  const { isLoggedIn, username, role, signOut } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ SOLUÇÃO: Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ SOLUÇÃO: Função de logout com feedback
  const handleLogout = async () => {
    try {
      await signOut();
      // Forçar reload da página no mobile para garantir logout
      if (isMobile) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (isLoggedIn) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{username}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="cursor-pointer focus:bg-destructive focus:text-destructive-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => setLoginDialogOpen(true)}>Entrar</Button>
      </div>
      <LoginDialog 
        open={loginDialogOpen} 
        onOpenChange={setLoginDialogOpen} 
      />
    </>
  );
}
