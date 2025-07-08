"use client";

import { useState } from "react";
import { useTracks } from "@/hooks/use-tracks";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface UploadTrackDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTrackUpload?: (trackData: any) => Promise<void>;
}

export function UploadTrackDialog({ isOpen: externalIsOpen, onOpenChange: externalOnOpenChange, onTrackUpload }: UploadTrackDialogProps = {}) {
  const { addTrack, generateUploadUrl, updateTrackFileMutation } = useTracks();
  const { categories } = useCategories();
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "" as Id<"categories"> | "",
    shortVersionFile: null as File | null,
    longVersionFile: null as File | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome da faixa é obrigatório";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Categoria é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      categoryId: "",
      shortVersionFile: null,
      longVersionFile: null,
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sessionToken = localStorage.getItem('session_token');

    if (!sessionToken) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa fazer login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newTrackId = await addTrack({
        name: formData.name,
        categoryId: formData.categoryId as Id<"categories">,
      });

      if (!newTrackId) {
        throw new Error("Falha ao obter o ID da nova faixa.");
      }

      const handleUpload = async (file: File, version: 'short' | 'long') => {
        if (!file) return null;

        const postUrl = await generateUploadUrl();

        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const { storageId } = await result.json();
        return storageId;
      };

      const shortStorageId = await handleUpload(formData.shortVersionFile!, 'short');
      const longStorageId = await handleUpload(formData.longVersionFile!, 'long');

      if (shortStorageId || longStorageId) {
        await updateTrackFileMutation({
          trackId: newTrackId,
          short: shortStorageId || undefined,
          long: longStorageId || undefined,
          sessionToken: sessionToken, // Adicionado para autenticação
        });
      }

      toast({
        title: "Sucesso",
        description: "Faixa adicionada com sucesso!",
      });
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Erro ao adicionar faixa:', error);
      toast({
        title: "Erro",
        description: `Erro ao adicionar faixa: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (field: "shortVersionFile" | "longVersionFile", file: File | null) => {
    setFormData({ ...formData, [field]: file });
    if (file && errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render DialogTrigger if not controlled externally */}
      {externalIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Adicionar Faixa
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Adicionar Nova Faixa</DialogTitle>
          <DialogDescription>
            Faça o upload de uma nova faixa musical com suas versões curta e longa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome da Faixa
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder="Digite o nome da faixa"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Categoria
            </label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => {
                setFormData({ ...formData, categoryId: value as Id<"categories"> });
                if (errors.categoryId) setErrors({ ...errors, categoryId: "" });
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
            {categories.length === 0 && (
              <p className="text-sm text-amber-600">
                Nenhuma categoria disponível. Crie uma categoria primeiro.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="short-version" className="text-sm font-medium">
              Versão Curta (MP3)
            </label>
            <Input
              id="short-version"
              type="file"
              accept="audio/mp3,audio/mpeg,.mp3"
              onChange={(e) => handleFileChange("shortVersionFile", e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
            {formData.shortVersionFile && (
              <p className="text-xs text-green-600">
                Arquivo selecionado: {formData.shortVersionFile.name}
              </p>
            )}
            {errors.shortVersionFile && (
              <p className="text-sm text-red-500">{errors.shortVersionFile}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="long-version" className="text-sm font-medium">
              Versão Longa (MP3)
            </label>
            <Input
              id="long-version"
              type="file"
              accept="audio/mp3,audio/mpeg,.mp3"
              onChange={(e) => handleFileChange("longVersionFile", e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
            {formData.longVersionFile && (
              <p className="text-xs text-green-600">
                Arquivo selecionado: {formData.longVersionFile.name}
              </p>
            )}
            {errors.longVersionFile && (
              <p className="text-sm text-red-500">{errors.longVersionFile}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || categories.length === 0}
          >
            {isSubmitting ? "Adicionando..." : "Adicionar Faixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}