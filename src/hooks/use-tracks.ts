// ... existing code ...

export const useTracks = () => {
  const tracks = useQuery(api.tracks.getTracks) || [];
  const addTrackAction = useAction(api.tracks.addTrack);
  const deleteTrackMutation = useMutation(api.tracks.deleteTrack);
  const updateTrackMutation = useMutation(api.tracks.updateTrack);
  
  // ... existing addTrack function ...
  
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
  
  // ... existing deleteTrack function ...
  
  return {
    tracks,
    loading: tracks === undefined,
    addTrack,
    updateTrack,
    deleteTrack,
  };
}