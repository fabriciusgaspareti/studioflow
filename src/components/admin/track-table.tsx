"use client";

import { useState } from 'react';
import { useTracks } from '@/hooks/use-tracks';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { UploadTrackDialog } from '@/components/upload-track-dialog';
import { Trash2, Plus } from 'lucide-react';
import type { Track } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function TrackTable() {
    const { tracks, loading, addTrack, deleteTrack: deleteTrackFromHook } = useTracks();
    const { toast } = useToast();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

    const handleAddNewTrack = async (trackData: Omit<Track, 'id' | 'versions'> & { shortVersionFile: File, longVersionFile: File }) => {
        const addedTrack = await addTrack(trackData);
        if (addedTrack) {
            toast({ title: "Sucesso!", description: `Faixa "${addedTrack.name}" adicionada.` });
        }
    };

    const handleDeleteTrack = async () => {
        if (trackToDelete) {
            try {
                await deleteTrackFromHook(trackToDelete);
                toast({ title: "Sucesso!", description: `Faixa "${trackToDelete.name}" excluída.` });
            } catch (error) {
                 toast({ variant: "destructive", title: "Erro!", description: "Não foi possível excluir a faixa."});
            } finally {
                setTrackToDelete(null);
            }
        }
    };
    
    const renderTableContent = () => {
        if (loading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-10" /></TableCell>
                </TableRow>
            ));
        }

        if (tracks.length === 0) {
            return (
                 <TableRow key="empty-state">
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Nenhuma faixa encontrada.
                    </TableCell>
                </TableRow>
            );
        }

        return tracks.map((track) => (
            <TableRow key={track._id}>
                <TableCell className="font-medium">{track.name}</TableCell>
                <TableCell className="hidden md:table-cell">{track.category}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm font-mono truncate max-w-xs">{track.versions.short}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm font-mono truncate max-w-xs">{track.versions.long}</TableCell>
                <TableCell className="text-right">
                    <Button variant="destructive" size="icon" onClick={() => setTrackToDelete(track)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                    </Button>
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
                            <CardTitle>Músicas</CardTitle>
                            <CardDescription>Gerencie sua biblioteca de músicas. Adicione ou remova faixas.</CardDescription>
                        </div>
                        <Button onClick={() => setIsUploadOpen(true)} className="sm:w-auto">
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
                           {renderTableContent()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <UploadTrackDialog
                isOpen={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onTrackUpload={handleAddNewTrack}
            />

            <AlertDialog open={!!trackToDelete} onOpenChange={() => setTrackToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a faixa "{trackToDelete?.name}" e seus arquivos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTrack}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}