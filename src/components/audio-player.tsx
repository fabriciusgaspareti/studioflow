"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import type { Track } from "@/lib/types";
import { Music, Pause, Play, Volume2, VolumeX, ListMusic } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

type Version = "short" | "long";

interface AudioPlayerProps {
  categoryName: string;
  tracks: Track[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AudioPlayer({ categoryName, tracks, isOpen, onOpenChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [version, setVersion] = useState<Version>("short");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen && tracks.length > 0) {
      setActiveTrack(tracks[0]);
      setIsPlaying(false);
      setVersion('short');
      setCurrentTime(0);
      setDuration(0);
    } else if (!isOpen) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setActiveTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [isOpen, tracks]);

  // Handle track/version changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    // Pause current audio
    audio.pause();
    setIsPlaying(false);
    
    // Set new source
    audio.src = activeTrack.versions[version];
    audio.load();
    
    // Reset time states
    setCurrentTime(0);
    setDuration(0);
  }, [activeTrack, version]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setCurrentTime(0);
      setDuration(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadstart", handleLoadStart);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadstart", handleLoadStart);
    };
  }, [activeTrack, version]);
  
  const handleSelectTrack = (track: Track) => {
    if (activeTrack?._id !== track._id) {
        setActiveTrack(track);
    }
  };

  const togglePlayPause = () => {
    if (!activeTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => {
        console.error("Error playing audio:", e);
        setIsPlaying(false);
      });
    }
  };
  
  const changeVersion = (newVersion: Version) => {
    if (version === newVersion || !activeTrack) return;
    setVersion(newVersion);
  };

  const handleTimeSeek = (value: number[]) => {
    if (audioRef.current && activeTrack && duration > 0) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVolumeChange = (value: number[]) => {
      if (audioRef.current) {
          audioRef.current.volume = value[0];
          setVolume(value[0]);
      }
  }

  const toggleMute = () => {
      const newVolume = volume > 0 ? 0 : 1;
      if (audioRef.current) {
          audioRef.current.volume = newVolume;
          setVolume(newVolume);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-lg rounded-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <audio ref={audioRef} preload="metadata"></audio>
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 mb-2">
            <div className="bg-primary/10 p-3 rounded-full">
              <ListMusic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl">{categoryName}</DialogTitle>
              <DialogDescription>
                Selecione uma faixa da lista para tocar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-48 w-full rounded-md border">
            <div className="p-2">
            {tracks.map((track) => (
                <div
                    key={track._id}
                    onClick={() => handleSelectTrack(track)}
                    className={cn("flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted",
                        activeTrack?._id === track._id && "bg-muted font-semibold"
                    )}
                >
                    <div className="flex items-center gap-2">
                        {activeTrack?._id === track._id && isPlaying && (
                            <Music className="h-4 w-4 text-primary animate-pulse" />
                        )}
                        <span>{track.name}</span>
                    </div>
                </div>
            ))}
            </div>
        </ScrollArea>

        {activeTrack ? (
            <div className="space-y-4 pt-4">
                 <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                    <Button variant={version === 'short' ? 'default' : 'outline'} onClick={() => changeVersion('short')}>Versão Curta</Button>
                    <Button variant={version === 'long' ? 'default' : 'outline'} onClick={() => changeVersion('long')}>Versão Longa</Button>
                </div>
                <Slider
                    value={[currentTime]}
                    max={duration || 1}
                    step={1}
                    onValueChange={handleTimeSeek}
                    disabled={!duration}
                    aria-label="Progresso da faixa"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-8">Selecione uma faixa para começar.</div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center w-full pt-4 gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button onClick={toggleMute} variant="ghost" size="icon" disabled={!activeTrack}>
                    {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-destructive" />}
                    <span className="sr-only">Mudo</span>
                </Button>
                <Slider
                    value={[volume]}
                    max={1}
                    step={0.05}
                    onValueChange={handleVolumeChange}
                    className="flex-1 sm:flex-none sm:w-24"
                    aria-label="Controle de volume"
                    disabled={!activeTrack}
                />
            </div>
            <div className="flex items-center justify-center">
                <Button onClick={togglePlayPause} size="lg" className="h-16 w-16 rounded-full bg-accent hover:bg-accent/90" disabled={!activeTrack}>
                    {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                    <span className="sr-only">{isPlaying ? "Pausar" : "Tocar"}</span>
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
