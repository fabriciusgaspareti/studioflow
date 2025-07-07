"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserTable } from "@/components/admin/user-table";
import { TrackTable } from "@/components/admin/track-table";
import { Users, Music, Loader2, FolderOpen } from "lucide-react";
import { CategoryManager } from "@/components/admin/category-manager";

export default function AdminPage() {
    const { role, isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!isLoggedIn || role !== 'admin')) {
            router.push('/login');
        }
    }, [role, isLoggedIn, loading, router]);

    if (loading) {
         return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4">Carregando...</p>
            </div>
        );
    }
    
    if (!isLoggedIn || role !== 'admin') {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center">
                <p>Redirecionando...</p>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex-1 p-4 md:py-12 md:px-8">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold">Painel Administrativo</h2>
                    </div>
                    <Tabs defaultValue="tracks">
                        <TabsList className="grid w-full grid-cols-3 sm:max-w-lg">
                            <TabsTrigger value="tracks"><Music className="mr-2 h-4 w-4" /> Músicas</TabsTrigger>
                            <TabsTrigger value="categories"><FolderOpen className="mr-2 h-4 w-4" /> Categorias</TabsTrigger>
                            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Usuários</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tracks" key="tracks-tab">
                           <TrackTable />
                        </TabsContent>
                        <TabsContent value="categories" key="categories-tab">
                           <CategoryManager />
                        </TabsContent>
                        <TabsContent value="users" key="users-tab">
                           <UserTable />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}