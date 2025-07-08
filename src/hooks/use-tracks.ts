import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../lib/convex";
import { Id } from "../../convex/_generated/dataModel";

// Definindo o tipo Track baseado no schema do Convex
export interface Track {
  _id: Id<"tracks">;
  name: string;
  categoryId: Id<"categories">;
  versions: {
    short: string;
    long: string;
  };
  createdAt: number;
  createdBy: Id<"users">;
  category?: string; // Para exibição
}

export const useTracks = () => {
  const tracks = useQuery(api.tracks.getTracks) || [];
  const addTrackAction = useAction(api.tracks.addTrack);
  const deleteTrackMutation = useMutation(api.tracks.deleteTrack);
  const updateTrackMutation = useMutation(api.tracks.updateTrack);
  
  const addTrack = async (trackData: {
    id: Id<"tracks">;
    name: string;
    categoryId: Id<"categories">;
  }) => {
    try {
      await addTrackAction(trackData);
      return true;
    } catch (error) {
      console.error("Error adding track:", error);
      return false;
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
  
  return {
    tracks,
    loading: tracks === undefined,
    addTrack,
    updateTrack,
    deleteTrack,
  };
}