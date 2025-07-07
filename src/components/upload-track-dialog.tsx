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
  const { addTrack } = useTracks();
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

    if (!formData.shortVersionFile) {
      newErrors.shortVersionFile = "Arquivo da versão curta é obrigatório";
    }

    if (!formData.longVersionFile) {
      newErrors.longVersionFile = "Arquivo da versão longa é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    try {
      const trackData = {
        name: formData.name.trim(),
        categoryId: formData.categoryId as Id<"categories">,
        createdBy: user._id,
        shortVersionFile: formData.shortVersionFile!,
        longVersionFile: formData.longVersionFile!,
      };

      if (onTrackUpload) {
        await onTrackUpload(trackData);
      } else {
        await addTrack(trackData);
      }

      toast({
        title: "Faixa adicionada",
        description: "A faixa foi adicionada com sucesso.",
      });

      // Reset form
      setFormData({
        name: "",
        categoryId: "",
        shortVersionFile: null,
        longVersionFile: null,
      });
      setErrors({});
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar faixa. Tente novamente.",
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
              Versão Curta
            </label>
            <Input
              id="short-version"
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileChange("shortVersionFile", e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
            {errors.shortVersionFile && (
              <p className="text-sm text-red-500">{errors.shortVersionFile}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="long-version" className="text-sm font-medium">
              Versão Longa
            </label>
            <Input
              id="long-version"
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileChange("longVersionFile", e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
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