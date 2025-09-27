"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Home } from "lucide-react";

export function AdminDashboardButton() {
    const { role } = useAuth();
    const pathname = usePathname();

    if (role !== 'admin') {
        return null;
    }
    
    const isAdminPage = pathname === '/admin';

    return (
        <Button variant="ghost" size="icon" asChild>
            <Link href={isAdminPage ? "/" : "/admin"}>
                {isAdminPage ? <Home /> : <LayoutDashboard />}
                <span className="sr-only">{isAdminPage ? "Ir para o Início" : "Painel Administrativo"}</span>
            </Link>
        </Button>
    );
}
