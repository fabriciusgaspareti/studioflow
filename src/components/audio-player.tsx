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
import { Music, Pause, Play, Volume2, VolumeX, ListMusic, Loader2 } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Estados básicos
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState<Version>("short");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [preloadProgress, setPreloadProgress] = useState<{ [key: string]: number }>({});
  
  // Verificar quais versões estão disponíveis na categoria
  const getAvailableVersions = () => {
    const hasShort = tracks.some(track => track.versions.short);
    const hasLong = tracks.some(track => track.versions.long);
    return { hasShort, hasLong };
  };
  
  const { hasShort, hasLong } = getAvailableVersions();
  
  // Função para preload das faixas
  const preloadTracks = () => {
    if (!isOpen || tracks.length === 0) return;
    
    tracks.forEach((track, index) => {
      // Verificar se a faixa tem pelo menos uma versão disponível
      if (!track.versions.short && !track.versions.long) {
        return; // Pular faixas sem versões
      }
      
      // Usar a versão disponível da faixa
      const availableVersion = track.versions[version] ? version : 
                              (track.versions.short ? 'short' : 'long');
      const trackKey = `${track._id}_${availableVersion}`;
      const audioUrl = track.versions[availableVersion];
      
      if (audioUrl && !preloadRefs.current[trackKey]) {
        const preloadAudio = new Audio();
        preloadAudio.preload = 'metadata';
        preloadAudio.src = audioUrl;
        
        // Event listeners para acompanhar o progresso
        preloadAudio.addEventListener('loadstart', () => {
          setPreloadProgress(prev => ({ ...prev, [trackKey]: 0 }));
        });
        
        preloadAudio.addEventListener('progress', () => {
          if (preloadAudio.buffered.length > 0) {
            const loaded = preloadAudio.buffered.end(0);
            const total = preloadAudio.duration || 1;
            const progress = (loaded / total) * 100;
            setPreloadProgress(prev => ({ ...prev, [trackKey]: progress }));
          }
        });
        
        preloadAudio.addEventListener('canplaythrough', () => {
          setPreloadProgress(prev => ({ ...prev, [trackKey]: 100 }));
        });
        
        preloadRefs.current[trackKey] = preloadAudio;
      }
    });
  };
  
  // Limpar preloads
  const clearPreloads = () => {
    Object.values(preloadRefs.current).forEach(audio => {
      audio.src = '';
      audio.load();
    });
    preloadRefs.current = {};
    setPreloadProgress({});
  };
  
  // Ajustar versão inicial baseada na disponibilidade
  useEffect(() => {
    if (!hasShort && hasLong) {
      setVersion("long");
    } else if (hasShort && !hasLong) {
      setVersion("short");
    }
  }, [hasShort, hasLong]);
  
  // Preload quando abrir o diálogo ou mudar versão
  useEffect(() => {
    if (isOpen) {
      // Delay pequeno para não interferir com o carregamento da faixa ativa
      const timer = setTimeout(() => {
        preloadTracks();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      clearPreloads();
    }
  }, [isOpen, version, tracks]);
  
  // Reset ao abrir/fechar diálogo
  useEffect(() => {
    if (isOpen && tracks.length > 0) {
      if (!activeTrack) {
        setActiveTrack(tracks[0]);
      }
    } else if (!isOpen) {
      // Cleanup simples ao fechar
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
      setActiveTrack(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      clearPreloads();
    }
  }, [isOpen, tracks]);

  // Configurar áudio quando track/version muda
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack || !isOpen) return;

    // Pausar e resetar
    audio.pause();
    setIsPlaying(false);
    setIsLoading(true);
    
    // Configurar novo áudio
    audio.src = activeTrack.versions[version];
    audio.preload = 'auto';
    audio.currentTime = 0;
    setCurrentTime(0);
    
    // Event listeners básicos
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleWaiting = () => {
      setIsLoading(true);
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
    };
    
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const errorInfo = {
        error: target.error,
        networkState: target.networkState,
        readyState: target.readyState,
        src: target.src
      };
      console.error('Audio error:', errorInfo);
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Adicionar listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Carregar áudio
    audio.load();

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [activeTrack, version, isOpen]);

  // Funções de controle simplificadas
  const togglePlayPause = async () => {
    if (!activeTrack || !audioRef.current || !isOpen) return;
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
    } else {
      try {
        setIsLoading(true);
        await audio.play();
      } catch (error) {
        console.error('Erro ao reproduzir:', error);
        setIsLoading(false);
      }
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const handleTimeSeek = (value: number[]) => {
    if (!audioRef.current || !activeTrack) return;
    
    const audio = audioRef.current;
    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    if (audio.volume > 0) {
      audio.volume = 0;
      setVolume(0);
    } else {
      audio.volume = 1;
      setVolume(1);
    }
  };

  const changeVersion = (newVersion: Version) => {
    if (version === newVersion || !activeTrack) return;
    setVersion(newVersion);
  };

  const handleSelectTrack = (track: Track) => {
    if (activeTrack?._id !== track._id) {
      setActiveTrack(track);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Music className="h-4 w-4" />
            {categoryName}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Reproduzir faixas da categoria {categoryName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Player Principal */}
          {activeTrack && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border flex-shrink-0">
              {/* Informações da Faixa */}
              <div className="text-center mb-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-1 truncate">{activeTrack.name}</h3>
                <p className="text-muted-foreground text-xs truncate">{activeTrack.artist}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTrack.key}
                </p>
              </div>

              {/* Controles de Versão */}
              {(hasShort && hasLong) && (
                <div className="flex justify-center gap-2 mb-3">
                  <Button
                    variant={version === "short" ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeVersion("short")}
                    className="h-7 px-3 text-xs"
                    disabled={!hasShort}
                  >
                    Curta
                  </Button>
                  <Button
                    variant={version === "long" ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeVersion("long")}
                    className="h-7 px-3 text-xs"
                    disabled={!hasLong}
                  >
                    Longa
                  </Button>
                </div>
              )}
              
              {/* Indicador de versão única (quando há apenas uma) */}
              {(!hasShort || !hasLong) && (
                <div className="flex justify-center mb-3">
                  <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-medium">
                    {hasShort ? 'Versão Curta' : 'Versão Longa'}
                  </div>
                </div>
              )}
              {/* Barra de Progresso */}
              <div className="space-y-1.5 mb-3">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={handleTimeSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controles de Reprodução */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  <div className="w-2 h-2 bg-current rounded-sm" />
                </Button>
                <Button
                  onClick={togglePlayPause}
                  disabled={isLoading}
                  size="sm"
                  className="w-10 h-10 rounded-full p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </div>

              {/* Controle de Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-7 w-7 p-0 shrink-0"
                >
                  {volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Lista de Tracks */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <ListMusic className="h-3 w-3" />
              <span className="text-xs font-medium">Faixas ({tracks.length})</span>
            </div>
            <ScrollArea className="h-[140px]">
              <div className="space-y-1">
                {tracks.map((track) => {
                  // Verificar se a faixa tem pelo menos uma versão disponível
                  if (!track.versions.short && !track.versions.long) {
                    // Renderizar faixa sem indicador de preload
                    return (
                      <div
                        key={track._id}
                        className={cn(
                          "p-2.5 rounded-md border cursor-pointer transition-all duration-200 hover:shadow-sm relative overflow-hidden opacity-50",
                          "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{track.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {track.artist} • Sem áudio disponível
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Usar a versão disponível da faixa
                  const availableVersion = track.versions[version] ? version : 
                                          (track.versions.short ? 'short' : 'long');
                  const trackKey = `${track._id}_${availableVersion}`;
                  const preloadPercent = preloadProgress[trackKey] || 0;
                  
                  return (
                    <div
                      key={track._id}
                      className={cn(
                        "p-2.5 rounded-md border cursor-pointer transition-all duration-200 hover:shadow-sm relative overflow-hidden",
                        activeTrack?._id === track._id
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleSelectTrack(track)}
                    >
                      {/* Barra de preload discreta */}
                      {preloadPercent > 0 && preloadPercent < 100 && (
                        <div className="absolute bottom-0 left-0 h-0.5 bg-primary/30 transition-all duration-300" 
                             style={{ width: `${preloadPercent}%` }} />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          activeTrack?._id === track._id
                            ? "bg-primary"
                            : preloadPercent === 100
                            ? "bg-green-500/50"
                            : "bg-muted-foreground/30"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">{track.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {track.artist}
                          </div>
                        </div>
                        {activeTrack?._id === track._id && isPlaying && (
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" />
                            <div className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                            <div className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full h-8 text-xs">
            Fechar Player
          </Button>
        </DialogFooter>

        <audio ref={audioRef} />
      </DialogContent>
    </Dialog>
  );
}