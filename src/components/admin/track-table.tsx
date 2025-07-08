// ... existing code ...
import { EditTrackDialog } from "@/components/edit-track-dialog";
import { Pencil } from "lucide-react";

export function TrackTable() {
    const { tracks, deleteTrack } = useTracks();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // ... existing functions ...

    const handleEditTrack = (track: Track) => {
        setEditingTrack(track);
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* ... existing header code ... */}
            
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome da Faixa</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>URL Curta</TableHead>
                            <TableHead>URL Longa</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tracks.map((track) => (
                            <TableRow key={track._id}>
                                <TableCell className="font-medium">{track.name}</TableCell>
                                <TableCell>{track.category}</TableCell>
                                <TableCell>
                                    <a href={track.versions.short} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {track.versions.short.substring(0, 50)}...
                                    </a>
                                </TableCell>
                                <TableCell>
                                    <a href={track.versions.long} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {track.versions.long.substring(0, 50)}...
                                    </a>
                                </TableCell>
                                <TableCell>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditTrack(track)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteTrack(track)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

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
        </div>
    );
}