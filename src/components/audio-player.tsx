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
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaSessionRef = useRef<boolean>(false); // ← Mover para aqui
  
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState<Version>("short");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  
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
    setIsLoading(true);
    audio.load();

    // Reset time states
    setCurrentTime(0);
    setDuration(0);
  }, [activeTrack, version]);

  // ← MOVER PARA CÁ: useEffect separado para aplicar volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      audio.volume = volume;
    };

    audio.addEventListener('canplay', handleCanPlay);
    return () => audio.removeEventListener('canplay', handleCanPlay);
  }, [volume, activeTrack]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      console.log('🎵 [DEBUG] Audio metadata loaded:', {
        duration: audio.duration,
        track: activeTrack?.name,
        version,
        timestamp: new Date().toISOString()
      });
      setDuration(audio.duration || 0);
    };
    
    const handleCanPlay = () => {
      console.log('🎵 [DEBUG] Audio can play:', {
        track: activeTrack?.name,
        version,
        readyState: audio.readyState,
        timestamp: new Date().toISOString()
      });
      setIsLoading(false);
      setRetryCount(0); // 🆕 Reset contador em sucesso
      setIsRetrying(false); // 🆕 Reset estado de retry
    };

    const handlePlay = () => {
      console.log('🎵 [DEBUG] Audio started playing:', {
        track: activeTrack?.name,
        version,
        currentTime: audio.currentTime,
        timestamp: new Date().toISOString()
      });
      setIsPlaying(true);
      setRetryCount(0); // 🆕 Reset contador quando reprodução inicia com sucesso
      setIsRetrying(false); // 🆕 Reset estado de retry
    };
    
    const handleEnded = () => {
      console.log('🎵 [DEBUG] Audio ended normally:', {
        track: activeTrack?.name,
        version,
        currentTime: audio.currentTime,
        duration: audio.duration,
        timestamp: new Date().toISOString()
      });
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handlePause = () => {
      console.log('🎵 [DEBUG] Audio paused:', {
        track: activeTrack?.name,
        version,
        currentTime: audio.currentTime,
        wasPlaying: isPlaying,
        timestamp: new Date().toISOString()
      });
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      console.log('🎵 [DEBUG] Audio waiting (buffering):', {
        track: activeTrack?.name,
        version,
        currentTime: audio.currentTime,
        networkState: audio.networkState,
        timestamp: new Date().toISOString()
      });
      setIsLoading(true);
    };

    const handleLoadStart = () => {
      console.log('🎵 [DEBUG] Audio load started:', {
        track: activeTrack?.name,
        version,
        src: audio.src,
        timestamp: new Date().toISOString()
      });
      setCurrentTime(0);
      setDuration(0);
    };

    // 🆕 NOVO: Handler crítico para erros
    // 🆕 MELHORADO: Handler com retry automático
    const handleError = () => {
      const error = audio.error;
      const errorInfo = {
        track: activeTrack?.name,
        version,
        errorCode: error?.code,
        errorMessage: error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src,
        currentTime: audio.currentTime,
        retryAttempt: retryCount + 1,
        timestamp: new Date().toISOString()
      };
      
      console.error('🚨 [ERROR] Audio playback error:', errorInfo);
      setLastError(`Erro ${error?.code}: ${error?.message}`);
      
      // 🆕 UX: Definir qualidade da conexão baseada no erro
      if (error?.code === 2 || error?.code === 4) {
        setConnectionQuality('poor');
        setStatusMessage('Problemas de conexão detectados');
      }
      
      // Retry automático para erros de rede (códigos 2 e 4)
      if ((error?.code === 2 || error?.code === 4) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        const currentPosition = audio.currentTime;
        
        // 🆕 UX: Mensagem de status durante retry
        setStatusMessage(`Reconectando... (${retryCount + 1}/3)`);
        
        console.log(`🔄 [RETRY] Iniciando tentativa ${retryCount + 1}/3 em ${delay}ms`, {
          track: activeTrack?.name,
          position: currentPosition,
          errorCode: error?.code
        });
        
        setIsRetrying(true);
        setIsPlaying(false);
        
        setTimeout(() => {
          if (!activeTrack) {
            setIsRetrying(false);
            return;
          }
          
          console.log(`🔄 [RETRY] Executando tentativa ${retryCount + 1}/3`);
          
          // Recarregar áudio mantendo a posição
          audio.src = activeTrack.versions[version];
          audio.load();
          
          // Aguardar carregamento antes de definir posição
          const handleLoadedData = () => {
            audio.currentTime = currentPosition;
            audio.play().then(() => {
              console.log('✅ [RETRY] Sucesso na tentativa', retryCount + 1);
              setIsRetrying(false);
              setRetryCount(prev => prev + 1);
              setStatusMessage(null); // 🆕 Limpar mensagem de sucesso
              setConnectionQuality('good'); // 🆕 Conexão recuperada
            }).catch((playError) => {
              console.error('❌ [RETRY] Falha ao reproduzir após reload:', playError);
              setIsRetrying(false);
              setRetryCount(prev => prev + 1);
            });
            audio.removeEventListener('loadeddata', handleLoadedData);
          };
          
          audio.addEventListener('loadeddata', handleLoadedData);
        }, delay);
      } else {
        // 🆕 UX: Falha definitiva - mostrar botão de retry manual
        console.error('💀 [FINAL ERROR] Falha definitiva após tentativas ou erro crítico');
        setIsPlaying(false);
        setIsLoading(false);
        setIsRetrying(false);
        setRetryCount(0);
        setShowRetryButton(true); // 🆕 Mostrar botão de retry manual
        setStatusMessage('Falha na reprodução. Tente novamente.');
      }
    };

    // 🆕 NOVO: Handler para detectar quando download para
    const handleStalled = () => {
      console.warn('⚠️ [WARNING] Audio download stalled:', {
        track: activeTrack?.name,
        version,
        currentTime: audio.currentTime,
        networkState: audio.networkState,
        timestamp: new Date().toISOString()
      });
    };

    // 🆕 ETAPA 3: Novos handlers para buffering otimizado
    // 🎯 **Melhorias Solicitadas**
    //
    // 1. **Mensagens Mais Inteligentes** 
    // - Remover mensagens desnecessárias que preocupam o usuário
    // - Mostrar apenas quando há problemas reais de conectividade
    //
    // 2. **Barra de Progresso com Buffer Visual**
    // - Adicionar sombra/indicador do buffer carregado
    // - Melhor controle visual para o usuário
    //
    // 🔧 **Implementação**
    // 🆕 MELHORADO: Mensagens mais inteligentes - apenas problemas reais
    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
        
        // 🆕 OTIMIZADO: Só mostrar mensagem em problemas críticos (buffer < 5%)
        if (bufferPercent < 5 && isPlaying && currentTime > 10) {
          setConnectionQuality('poor');
          setStatusMessage('Conexão instável - carregando...');
        } else if (bufferPercent > 20) {
          setConnectionQuality('good');
          setStatusMessage(null); // Limpar mensagem quando buffer OK
        }
        
        // 🆕 NOVO: Armazenar dados do buffer para a barra de progresso
        setBufferProgress(bufferPercent);
      }
    };
    
    const handleSuspend = () => {
      // 🆕 OTIMIZADO: Não mostrar mensagem para suspend normal
      console.log('⏸️ [DEBUG] Audio loading suspended:', {
        track: activeTrack?.name,
        currentTime: audio.currentTime,
        timestamp: new Date().toISOString()
      });
      // Removido: setStatusMessage - não preocupar usuário
    };
    
    const handleAbort = () => {
      console.log('❌ [DEBUG] Audio loading aborted:', {
        track: activeTrack?.name,
        timestamp: new Date().toISOString()
      });
      
      // 🆕 OTIMIZADO: Só mostrar se for abort durante reprodução ativa
      if (isPlaying) {
        setConnectionQuality('poor');
        setStatusMessage('Falha no carregamento - reconectando...');
      }
    };

    // Event listeners existentes
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    // ← REMOVER: o useEffect que estava aqui dentro
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", handleStalled);
    
    // 🆕 ADICIONADOS: Listeners de buffering que estavam faltando
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("suspend", handleSuspend);
    audio.addEventListener("abort", handleAbort);

    return () => {
      // Cleanup existente
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("stalled", handleStalled);
      
      // 🆕 ADICIONADOS: Cleanup dos listeners de buffering
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("suspend", handleSuspend);
      audio.removeEventListener("abort", handleAbort);
    };
  }, [activeTrack, version, isPlaying]);
  
  const handleSelectTrack = (track: Track) => {
    if (activeTrack?._id !== track._id) {
        setActiveTrack(track);
    }
  };

  const togglePlayPause = () => {
    if (!activeTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    
    // 🆕 SOLUÇÃO: Verificar estado antes de alternar
    if (isPlaying) {
      // 🆕 SOLUÇÃO: Fade out suave antes de pausar
      const originalVolume = audio.volume;
      const fadeSteps = 5;
      const fadeTime = 100; // 100ms total
      
      for (let i = fadeSteps; i >= 0; i--) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.volume = (originalVolume * i) / fadeSteps;
            if (i === 0) {
              audioRef.current.pause();
              audioRef.current.volume = originalVolume; // Restaurar volume
            }
          }
        }, (fadeSteps - i) * (fadeTime / fadeSteps));
      }
    } else {
      // 🆕 SOLUÇÃO: Verificar se áudio está pronto antes de tocar
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
        audio.play().catch(e => {
          console.error("Error playing audio:", e);
          setIsPlaying(false);
        });
      } else {
        // Aguardar carregamento
        const handleCanPlay = () => {
          audio.play().catch(e => {
            console.error("Error playing audio:", e);
            setIsPlaying(false);
          });
          audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
      }
    }
  };
  
  const changeVersion = (newVersion: Version) => {
    if (version === newVersion || !activeTrack) return;
    setVersion(newVersion);
  };

  const handleTimeSeek = (value: number[]) => {
    if (audioRef.current && activeTrack && duration > 0) {
      const audio = audioRef.current;
      const newTime = value[0];
      const wasPlaying = !audio.paused;
      
      // 🆕 SOLUÇÃO: Pausar temporariamente para evitar estalos
      if (wasPlaying) {
        audio.pause();
      }
      
      // 🆕 SOLUÇÃO: Aguardar um frame antes de mudar o tempo
      requestAnimationFrame(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
          
          // 🆕 SOLUÇÃO: Retomar reprodução após pequeno delay
          if (wasPlaying) {
            setTimeout(() => {
              if (audioRef.current && !audioRef.current.paused) {
                return; // Já está tocando
              }
              audioRef.current?.play().catch(console.warn);
            }, 50); // 50ms de delay para estabilizar
          }
        }
      });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    
    // Atualizar estado imediatamente para feedback visual
    setVolume(newVolume);
    
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // 🆕 SOLUÇÃO: Transição suave de volume para evitar estalos
      const currentVol = audio.volume;
      const volumeDiff = Math.abs(newVolume - currentVol);
      
      if (volumeDiff > 0.1) {
        // Para mudanças grandes: transição suave em 3 passos
        const steps = 3;
        const stepSize = (newVolume - currentVol) / steps;
        
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.volume = currentVol + (stepSize * i);
            }
          }, i * 15); // 15ms entre cada passo = 45ms total
        }
      } else {
        // Para mudanças pequenas: aplicar diretamente
        audio.volume = newVolume;
      }
    }
  };

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
        <audio
          ref={audioRef}
          preload="metadata" // ← Mudança: de "auto" para "metadata"
          crossOrigin="anonymous"
          // 🆕 ADICIONADO: Configurações para reduzir estalos
          style={{
            // Forçar aceleração de hardware quando disponível
            transform: 'translateZ(0)',
            willChange: 'auto'
          }}
        />
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
              <Button 
                variant={version === 'short' ? 'default' : 'outline'} 
                onClick={() => changeVersion('short')}
                disabled={!activeTrack.versions.short}
              >
                Versão Curta
              </Button>
              <Button 
                variant={version === 'long' ? 'default' : 'outline'} 
                onClick={() => changeVersion('long')}
                disabled={!activeTrack.versions.long}
              >
                Versão Longa
              </Button>
            </div>
            
            {/* 🆕 NOVO: Barra de progresso com indicador de buffer */}
            <div className="relative">
              {/* Slider original com buffer como background */}
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={0.1} // ← Mudança: de 1 para 0.1 (mais suave)
                onValueChange={handleTimeSeekDebounced} // ← Mudança: versão com debounce
                disabled={!duration}
                aria-label="Progresso da faixa"
                className="relative z-10"
              />
              
              {/* CSS customizado para mostrar o buffer */}
              <style jsx>{`
                .relative :global([data-radix-slider-track]) {
                  background: linear-gradient(
                    to right,
                    hsl(var(--muted)) 0%,
                    hsl(var(--muted)) var(--buffer-width, 0%),
                    hsl(var(--secondary)) var(--buffer-width, 0%),
                    hsl(var(--secondary)) 100%
                  ) !important;
                }
              `}</style>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">Selecione uma faixa para começar.</div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center w-full pt-4 gap-4">
            {/* 🆕 ETAPA 4: Indicador de status */}
            {statusMessage && (
              <div className="w-full text-center text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <div className="flex items-center justify-center gap-2">
                  {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{statusMessage}</span>
                  {connectionQuality === 'poor' && (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Conexão instável" />
                  )}
                  {connectionQuality === 'good' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Conexão estável" />
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button onClick={toggleMute} variant="ghost" size="icon" disabled={!activeTrack}>
                    {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-destructive" />}
                    <span className="sr-only">Mudo</span>
                </Button>
                <Slider
                    value={[volume]}
                    max={1}
                    step={0.005}
                    onValueChange={handleVolumeChange}
                    className="w-16 sm:w-24" // ← Alterado: menor no mobile (w-16) e normal no desktop (sm:w-24)
                    aria-label="Controle de volume"
                    disabled={!activeTrack}
                />
            </div>
            
            <div className="flex items-center justify-center gap-2">
                {/* 🆕 ETAPA 4: Botão de retry manual */}
                {showRetryButton && (
                  <Button onClick={handleManualRetry} variant="outline" size="sm">
                    Tentar Novamente
                  </Button>
                )}
                
                <Button onClick={togglePlayPause} size="lg" className="h-16 w-16 rounded-full bg-accent hover:bg-accent/90" disabled={!activeTrack || isLoading || isRetrying}>
                    {isLoading || isRetrying ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="h-8 w-8" />
                    ) : (
                        <Play className="h-8 w-8 ml-1" />
                    )}
                    <span className="sr-only">
                        {isRetrying ? "Reconectando..." : isPlaying ? "Pausar" : "Tocar"}
                    </span>
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

  // 🆕 ADICIONADO: Refs para debounce
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🆕 VERSÃO MELHORADA: handleTimeSeek com debounce
  const handleTimeSeekDebounced = (value: number[]) => {
    const newTime = value[0];
    
    // Atualizar UI imediatamente
    setCurrentTime(newTime);
    
    // Debounce da mudança real de tempo
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = setTimeout(() => {
      handleTimeSeek(value);
    }, 100); // 100ms de debounce
  };
