"use client";

import { useState, useEffect } from "react";
import { useTracks, Track } from "@/hooks/use-tracks";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Id } from "../../convex/_generated/dataModel";

interface EditTrackDialogProps {
  track: Track | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTrackDialog({ track, isOpen, onOpenChange }: EditTrackDialogProps) {
  const { updateTrack } = useTracks();
  const { categories } = useCategories();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "" as Id<"categories"> | "",
  });

  useEffect(() => {
    if (track) {
      setFormData({
        name: track.name,
        categoryId: track.categoryId,
      });
    }
  }, [track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track || !formData.name.trim() || !formData.categoryId) return;

    setIsSubmitting(true);
    try {
      const success = await updateTrack({
        id: track._id,
        name: formData.name.trim(),
        categoryId: formData.categoryId,
      });

      if (success) {
        toast({
          title: "Sucesso!",
          description: `Faixa "${formData.name}" atualizada.`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar faixa.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Faixa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Faixa</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome da faixa"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value as Id<"categories"> })}
              required
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
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}