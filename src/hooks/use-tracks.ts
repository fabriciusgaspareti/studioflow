"use client";

import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface Track {
  _id: Id<"tracks">;
  name: string;
  categoryId: Id<"categories">;
  category?: string;
  versions: {
    short: string;
    long: string;
  };
  createdAt: number;
  createdBy: Id<"users">;
}

export const useTracks = () => {
  const tracks = useQuery(api.tracks.getTracks) || [];
  const addTrackAction = useAction(api.tracks.addTrack);
  const deleteTrackMutation = useMutation(api.tracks.deleteTrack);
  
  const addTrack = async (trackData: {
    name: string;
    categoryId: Id<"categories">;
    createdBy: Id<"users">;
    shortVersionFile: File;
    longVersionFile: File;
  }) => {
    try {
      // ✅ Converter arquivos para ArrayBuffer corretamente
      const shortVersionBuffer = await trackData.shortVersionFile.arrayBuffer();
      const longVersionBuffer = await trackData.longVersionFile.arrayBuffer();
      
      const result = await addTrackAction({
        name: trackData.name,
        categoryId: trackData.categoryId,
        createdBy: trackData.createdBy,
        shortVersionFile: {
          name: trackData.shortVersionFile.name,
          type: trackData.shortVersionFile.type,
          data: shortVersionBuffer, // ✅ ArrayBuffer, não Uint8Array
        },
        longVersionFile: {
          name: trackData.longVersionFile.name,
          type: trackData.longVersionFile.type,
          data: longVersionBuffer, // ✅ ArrayBuffer, não Uint8Array
        },
      });
      
      return result;
    } catch (error) {
      console.error('Error adding track:', error);
      throw error;
    }
  };
  
  const deleteTrack = async (track: Track | string) => {
    try {
      const trackId = typeof track === 'string' ? track : track._id;
      await deleteTrackMutation({ id: trackId });
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
    deleteTrack,
  };
}