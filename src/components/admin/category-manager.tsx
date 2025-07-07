"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

export function CategoryManager() {
  const { categories, loading, createCategory, deleteCategory } = useCategories();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleCreateCategory = async () => {
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        createdBy: user._id,
      });
      
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso.",
      });
      
      setFormData({ name: "", description: "" });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar categoria",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    try {
      await deleteCategory(categoryId);
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir categoria",
        variant: "destructive",
      });
    }
  };

  const renderTableContent = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-10 w-10" /></TableCell>
        </TableRow>
      ));
    }

    if (categories.length === 0) {
      return (
        <TableRow key="empty-state">
          <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
            Nenhuma categoria encontrada. Crie a primeira categoria.
          </TableCell>
        </TableRow>
      );
    }

    return categories.map((category) => (
      <TableRow key={category._id}>
        <TableCell className="font-medium">{category.name}</TableCell>
        <TableCell className="hidden md:table-cell">{category.description || "-"}</TableCell>
        <TableCell className="hidden lg:table-cell">
          {new Date(category.createdAt).toLocaleDateString("pt-BR")}
        </TableCell>
        <TableCell className="text-right">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria "{category.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteCategory(category._id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <>
      <Card>
        <CardHeader className="px-10 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Categorias</CardTitle>
              <CardDescription>Gerencie as categorias de músicas. Adicione ou remova categorias.</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="hidden lg:table-cell">Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableContent()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Categoria</DialogTitle>
            <DialogDescription>
              Adicione uma nova categoria para organizar as faixas musicais.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome da Categoria *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Rock, Pop, Jazz..."
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descrição (opcional)
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da categoria..."
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Criando..." : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}