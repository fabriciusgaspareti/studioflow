import { useMutation, useQuery } from "convex/react";
import { api } from "../lib/convex";
import { Id } from "../../convex/_generated/dataModel";

// Definindo o tipo Track baseado no schema do Convex
export interface Track {
  _id: Id<"tracks">;
  name: string;
  categoryId: Id<"categories">;
  versions: {
    short?: string;
    long?: string;
  };
  createdAt: number;
  createdBy: Id<"users">;
  category?: string; // Para exibição
}

export const useTracks = () => {
  const tracks = useQuery(api.tracks.getTracks) || [];
  const addTrackMutation = useMutation(api.tracks.addTrack);
  const deleteTrackMutation = useMutation(api.tracks.deleteTrack);
  const updateTrackMutation = useMutation(api.tracks.updateTrack);
  const generateUploadUrl = useMutation(api.tracks.generateUploadUrl);
  const updateTrackFileMutation = useMutation(api.tracks.updateTrackFile);

  const addTrack = async (trackData: {
    name: string;
    categoryId: Id<"categories">;
  }) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      if (!sessionToken) {
        throw new Error('No session token found');
      }

      const result = await addTrackMutation({
        name: trackData.name,
        categoryId: trackData.categoryId,
        sessionToken: sessionToken,
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao adicionar faixa:', error);
      throw error;
    }
  };
  
  const updateTrack = async (trackData: {
    id: Id<"tracks">;
    name: string;
    categoryId: Id<"categories">;
  }) => {
    try {
      await updateTrackMutation(trackData);
      return true;
    } catch (error) {
      console.error("Error updating track:", error);
      return false;
    }
  };
  
  const deleteTrack = async (id: Id<"tracks">) => {
    try {
      await deleteTrackMutation({ id });
      return true;
    } catch (error) {
      console.error("Error deleting track:", error);
      return false;
    }
  };
  
  // A função uploadFile foi removida, pois a lógica será movida para o componente

  return {
    tracks,
    loading: tracks === undefined,
    addTrack,
    updateTrack,
    deleteTrack,
    generateUploadUrl, // Expondo a nova mutação
    updateTrackFileMutation, // Expondo a mutação de atualização com o nome correto
  };
};