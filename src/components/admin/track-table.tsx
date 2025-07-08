"use client";

import { useState } from "react";
import { useTracks, Track } from "@/hooks/use-tracks";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadTrackDialog } from "@/components/upload-track-dialog";
import { EditTrackDialog } from "@/components/edit-track-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

export function TrackTable() {
  const { tracks, deleteTrack, addTrack } = useTracks();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<{ id: Id<"tracks">, name: string } | null>(null);

  const openDeleteDialog = (trackId: Id<"tracks">, trackName: string) => {
    setTrackToDelete({ id: trackId, name: trackName });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTrack = async () => {
    if (!trackToDelete) return;

    try {
      const success = await deleteTrack(trackToDelete.id);
      if (success) {
        toast({
          title: "Sucesso!",
          description: `Faixa "${trackToDelete.name}" excluída com sucesso.`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir faixa.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao excluir faixa:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir faixa.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTrackToDelete(null);
    }
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
    setIsEditDialogOpen(true);
  };

  const handleAddNewTrack = async (trackData: { name: string; categoryId: Id<"categories"> }) => {
    try {
      await addTrack(trackData);
      toast({
        title: "Sucesso!",
        description: "Faixa adicionada com sucesso.",
      });
      setIsUploadOpen(false);
    } catch (error: any) {
      console.error('Erro ao adicionar faixa:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar faixa.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="px-10 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Faixas</CardTitle>
              <CardDescription>Gerencie as faixas musicais do seu aplicativo. Adicione, edite ou remova faixas.</CardDescription>
            </div>
            <Button onClick={() => setIsUploadOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Faixa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Faixa</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">URL Curta</TableHead>
                <TableHead className="hidden lg:table-cell">URL Longa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track._id}>
                  <TableCell className="font-medium">{track.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{track.category || "Sem categoria"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {track.versions?.short ? (
                      <span className="text-muted-foreground truncate block max-w-[200px]">
                        {track.versions.short.substring(0, 30)}...
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {track.versions?.long ? (
                      <span className="text-muted-foreground truncate block max-w-[200px]">
                        {track.versions.long.substring(0, 30)}...
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditTrack(track)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => openDeleteDialog(track._id, track.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tracks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma faixa encontrada. Adicione a primeira faixa para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadTrackDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onTrackUpload={handleAddNewTrack}
      />
      
      <EditTrackDialog
        track={editingTrack}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Track Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a faixa "{trackToDelete?.name}"? 
              Esta ação não pode ser desfeita e todos os arquivos associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTrack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Faixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}