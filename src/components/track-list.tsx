"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Track } from "@/lib/types";
import { ListMusic, Music } from "lucide-react";
import { AudioPlayer } from "./audio-player";
import { useToast } from "@/hooks/use-toast";
import { useTracks } from "@/hooks/use-tracks";
import { Skeleton } from "./ui/skeleton";

export function TrackList() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { tracks, loading } = useTracks();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  const tracksByCategory = tracks.reduce((acc, track) => {
    (acc[track.category] = acc[track.category] || []).push(track);
    return acc;
  }, {} as Record<string, Track[]>);

  const categories = Object.keys(tracksByCategory).sort();
  const tracksForPlayer = selectedCategory ? tracksByCategory[selectedCategory] : [];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="flex-row items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow"></CardContent>
              <CardFooter className="justify-center">
                <Skeleton className="h-10 w-36 rounded-md" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }
    
    if (categories.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map(categoryName => (
            <Card key={categoryName} className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader className="flex-row items-center gap-4">
                <ListMusic className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-xl">{categoryName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {tracksByCategory[categoryName].length} faixas
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex-grow"></CardContent>
              <CardFooter className="justify-center">
                <Button onClick={() => setSelectedCategory(categoryName)} className="bg-accent hover:bg-accent/90">
                  <Music className="mr-2 h-4 w-4" />
                  Ver Músicas
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    return (
       <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Nenhuma categoria de música encontrada.</p>
        </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-center sm:text-left">Suas Categorias de Músicas</h2>
      </div>
      
      {renderContent()}

      {selectedCategory && (
        <AudioPlayer
          categoryName={selectedCategory}
          tracks={tracksForPlayer}
          isOpen={!!selectedCategory}
          onOpenChange={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}