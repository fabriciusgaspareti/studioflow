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
import { Music, Pause, Play, Volume2, VolumeX, ListMusic, Loader2, Wifi, WifiOff } from "lucide-react";
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
  const mediaSessionRef = useRef<boolean>(false);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastBufferTime, setLastBufferTime] = useState(0);
  
  // 🆕 OTIMIZAÇÃO: Reset quando dialog abre/fecha
  useEffect(() => {
    if (isOpen && tracks.length > 0) {
      setActiveTrack(tracks[0]);
      setIsPlaying(false);
      setVersion('short');
      setCurrentTime(0);
      setDuration(0);
      setConnectionQuality('unknown');
      setStatusMessage(null);
      setRetryCount(0);
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
      // Limpar timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    }
  }, [isOpen, tracks]);

  // 🆕 OTIMIZAÇÃO: Handle track/version changes com preload inteligente
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    // Pausar current audio
    audio.pause();
    setIsPlaying(false);
    
    // Configurações otimizadas para mobile/4G
    audio.preload = 'metadata'; // Economizar dados
    audio.crossOrigin = 'anonymous';
    
    // 🆕 NOVO: Configurações para conexões instáveis
    if ('serviceWorker' in navigator) {
      // Habilitar cache agressivo para áudio
      audio.setAttribute('data-cache-audio', 'true');
    }
    
    // Set new source
    audio.src = activeTrack.versions[version];
    setIsLoading(true);
    setBufferProgress(0);
    audio.load();

    // Reset time states
    setCurrentTime(0);
    setDuration(0);
    setShowRetryButton(false);
  }, [activeTrack, version]);

  // 🆕 OTIMIZAÇÃO: Volume control separado
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      audio.volume = volume;
    };

    audio.addEventListener('canplay', handleCanPlay);
    return () => audio.removeEventListener('canplay', handleCanPlay);
  }, [volume, activeTrack]);

  // 🆕 MELHORADO: Event listeners com otimizações para 4G
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 🔧 CORRIGIDO: Remover a primeira definição de handleTimeUpdate (linha 129)
    // e manter apenas a versão otimizada
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
      setRetryCount(0);
      setIsRetrying(false);
      setShowRetryButton(false);
      if (connectionQuality === 'poor') {
        setConnectionQuality('good');
        setStatusMessage(null);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setRetryCount(0);
      setIsRetrying(false);
      setIsBuffering(false);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0); // Só aqui resetamos para o início
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      // Não resetar currentTime - manter posição atual
    };

    const handleWaiting = () => {
      setIsBuffering(true);
      // 🆕 OTIMIZAÇÃO: Só mostrar mensagem após 2 segundos
      setTimeout(() => {
        if (isBuffering) {
          setStatusMessage('Carregando...');
        }
      }, 2000);
    };

    // 🔧 CORRIGIDO: Não resetar posição durante problemas de conexão
    const handleLoadStart = () => {
      // NUNCA resetar currentTime durante retry ou buffering
      // Só resetar quando for uma nova faixa (não durante reconexão)
      if (!isRetrying && !isBuffering && !showRetryButton) {
        setCurrentTime(0);
        setDuration(0);
        setBufferProgress(0);
      }
      // Durante reconexão, manter todos os valores atuais
    };
    
    // 🔧 MELHORADO: Error handler que preserva posição SEMPRE
    const handleError = () => {
      const error = audio.error;
      console.error('🚨 Audio error:', {
        code: error?.code,
        message: error?.message,
        networkState: audio.networkState,
        retryCount
      });
      
      setLastError(`Erro ${error?.code}: ${error?.message}`);
      
      // 🔧 PRESERVAR posição atual SEMPRE
      const savedPosition = currentTime; // Usar estado atual
      
      // 🔧 OTIMIZAÇÃO: Retry automático preservando posição
      if ((error?.code === 2 || error?.code === 4) && retryCount < 5) {
        const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
        
        setConnectionQuality('poor');
        setStatusMessage(`Reconectando... (${retryCount + 1}/5) - Posição: ${Math.floor(savedPosition)}s`);
        setIsRetrying(true);
        setIsPlaying(false); // Pausar durante reconexão
        
        retryTimeoutRef.current = setTimeout(() => {
          if (!activeTrack) return;
          
          // 🔧 Recarregar áudio
          audio.src = activeTrack.versions[version];
          audio.load();
          
          const handleCanPlayThrough = () => {
            // 🔧 Restaurar posição salva SEMPRE
            audio.currentTime = savedPosition;
            setCurrentTime(savedPosition);
            
            setIsRetrying(false);
            setRetryCount(prev => prev + 1);
            setConnectionQuality('good');
            setStatusMessage(`Conexão restaurada na posição ${Math.floor(savedPosition)}s`);
            
            // 🔧 CORRIGIDO: Continuar reproduzindo automaticamente após reconexão
            if (isPlaying) {
              audio.play().catch(e => {
                console.error("Erro ao retomar reprodução:", e);
                setIsPlaying(false);
              });
            }
            
            // Limpar mensagem após 3 segundos
            setTimeout(() => setStatusMessage(null), 3000);
            
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          };
          
          audio.addEventListener('canplaythrough', handleCanPlayThrough);
        }, delay);
      } else {
        // Falha final - manter posição
        setIsPlaying(false);
        setIsLoading(false);
        setIsRetrying(false);
        setRetryCount(0);
        setShowRetryButton(true);
        setConnectionQuality('poor');
        setStatusMessage(`Falha na conexão. Posição preservada: ${Math.floor(savedPosition)}s`);
        // 🔧 NUNCA resetar currentTime
      }
    };

    // 🔧 NOVO: Função para retry manual preservando posição
    const handleManualRetry = () => {
      if (!activeTrack) return;
      
      const audio = audioRef.current;
      if (!audio) return;
      
      const savedPosition = currentTime; // 🔧 Usar currentTime do estado
      const wasPlaying = isPlaying; // 🔧 Lembrar se estava tocando
      
      setShowRetryButton(false);
      setIsLoading(true);
      setIsRetrying(true);
      setRetryCount(0);
      
      audio.src = activeTrack.versions[version];
      audio.load();
      
      const handleCanPlayThrough = () => {
        audio.currentTime = savedPosition;
        setCurrentTime(savedPosition);
        setIsLoading(false);
        setIsRetrying(false);
        setConnectionQuality('good');
        setStatusMessage(`Conexão restaurada na posição ${Math.floor(savedPosition)}s`);
        
        // 🔧 CORRIGIDO: Continuar reproduzindo se estava tocando antes
        if (wasPlaying) {
          setIsPlaying(true);
          audio.play().catch(e => {
            console.error("Erro ao retomar reprodução:", e);
            setIsPlaying(false);
          });
        }
        
        setTimeout(() => setStatusMessage(null), 3000);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
      
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
    };

    // 🔧 CORRIGIDO: Stalled preserva posição
    const handleStalled = () => {
      setIsBuffering(true);
      setIsPlaying(false); // Pausar mas manter posição
      setConnectionQuality('poor');
      setStatusMessage(`Conexão instável - Pausado em ${Math.floor(currentTime)}s`);
    };

    // 🆕 NOVO: Buffer progress tracking
    // 🔧 MELHORADO: Buffer inteligente com preload agressivo
    // 🆕 MELHORADO: Buffer contínuo e inteligente
    // 🔧 MELHORADO: Buffer mais agressivo para faixas longas
    // 🔧 OTIMIZADO: handleProgress para carregamento independente
    const handleProgress = () => {
      const audio = audioRef.current;
      if (!audio || audio.buffered.length === 0) return;
      
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
      setBufferProgress(bufferPercent);
      
      // 🚀 CARREGAMENTO AGRESSIVO INDEPENDENTE DA POSIÇÃO
      if (bufferPercent < 99 && duration > 0) {
        // Sempre tentar carregar mais, independente da posição atual
        const currentTime = audio.currentTime;
        
        // Múltiplos seeks simultâneos para diferentes partes do arquivo
        const aggressiveTargets = [
          Math.min(bufferedEnd + 45, duration - 1),
          Math.min(duration * 0.3, duration - 1),
          Math.min(duration * 0.6, duration - 1),
          Math.min(duration * 0.9, duration - 1)
        ];
        
        aggressiveTargets.forEach((target, index) => {
          if (target > bufferedEnd) {
            setTimeout(() => {
              if (audioRef.current && audioRef.current.currentTime === currentTime) {
                audioRef.current.currentTime = target;
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = currentTime;
                  }
                }, 8); // Seek ultra-rápido
              }
            }, index * 15);
          }
        });
      }
      
      // Status visual melhorado
      if (bufferPercent < 100) {
        setStatusMessage(`🔄 Carregando: ${Math.round(bufferPercent)}%`);
      } else {
        setStatusMessage('✅ Arquivo totalmente carregado!');
        setTimeout(() => setStatusMessage(null), 2000);
      }
    };
    
    // 🔧 CORRIGIDO: TimeUpdate simplificado
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Detecção de travamento simples
      const now = Date.now();
      if (Math.abs(audio.currentTime - lastBufferTime) < 0.1 && isPlaying) {
        if (now - lastBufferTime > 3000) {
          setIsBuffering(true);
          setConnectionQuality('poor');
        }
      } else {
        setLastBufferTime(now);
        setIsBuffering(false);
      }
    };
    
    // 🔧 CORRIGIDO: Preload consistente no track change
    const forcePreload = () => {
      const audio = audioRef.current;
      if (!audio || !activeTrack) return;
      
      // Configurar preload agressivo
      audio.preload = 'auto';
      
      // Forçar download do buffer
      if (audio.networkState === audio.NETWORK_IDLE) {
        audio.load();
      }
    };

    // 🔧 REMOVIDO: Segunda definição duplicada de handleTimeUpdate (linhas 358-408)
    // A versão corrigida já existe na linha 330

    const handleSuspend = () => {
      // 🆕 OTIMIZAÇÃO: Não preocupar usuário com suspend normal
    };
    
    // 🔧 MELHORADO: Abort preserva posição
    const handleAbort = () => {
      if (isPlaying) {
        setIsPlaying(false); // Pausar mas manter posição
        setConnectionQuality('poor');
        setStatusMessage(`Carregamento interrompido - Posição preservada: ${Math.floor(currentTime)}s`);
      }
    };

    // Event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", handleStalled);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("suspend", handleSuspend);
    audio.addEventListener("abort", handleAbort);

    return () => {
      // Cleanup
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
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("suspend", handleSuspend);
      audio.removeEventListener("abort", handleAbort);
    };
  }, [activeTrack, version, isPlaying, retryCount, bufferProgress, connectionQuality, statusMessage, isBuffering, lastBufferTime]);
  
  const handleSelectTrack = (track: Track) => {
    if (activeTrack?._id !== track._id) {
        setActiveTrack(track);
    }
  };

  // 🔧 MELHORADO: TogglePlayPause com lógica de stop
  const togglePlayPause = () => {
    if (!activeTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      // Se estiver tocando, pausar (não resetar posição)
      audio.pause();
      setIsPlaying(false);
    } else {
      // Se estiver pausado, verificar se deve continuar ou começar do início
      if (currentTime >= duration - 1) {
        // Se chegou ao final, começar do início
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      
      // Continuar da posição atual
      if (audio.readyState >= 2) {
        audio.play().catch(e => {
          console.error("Error playing audio:", e);
          setIsPlaying(false);
        });
      } else {
        setIsLoading(true);
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

  // 🆕 OTIMIZAÇÃO: Seek melhorado para conexões instáveis
  const handleTimeSeek = (value: number[]) => {
    if (audioRef.current && activeTrack && duration > 0) {
      const audio = audioRef.current;
      const newTime = value[0];
      const wasPlaying = !audio.paused;
      
      if (wasPlaying) {
        audio.pause();
      }
      
      requestAnimationFrame(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
          
          if (wasPlaying) {
            setTimeout(() => {
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(console.warn);
              }
            }, 100); // 🆕 OTIMIZAÇÃO: Delay maior para 4G
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
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newVolume = volume > 0 ? 0 : 1;
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // 🆕 OTIMIZAÇÃO: Debounced seek para melhor performance
  const handleTimeSeekDebounced = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime); // 🆕 OTIMIZAÇÃO: Update UI imediatamente
    
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = setTimeout(() => {
      handleTimeSeek(value);
    }, 100); // 🆕 OTIMIZAÇÃO: Delay maior para 4G
  };

  // 🆕 NOVO: Retry manual
  const handleManualRetry = () => {
    if (!activeTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;
    
    const savedPosition = currentTime;
    const wasPlaying = isPlaying; // 🔧 Lembrar se estava tocando
    
    setRetryCount(0);
    setShowRetryButton(false);
    setIsRetrying(true);
    setStatusMessage('Reconectando...');
    
    audio.src = activeTrack.versions[version];
    audio.load();
    
    const handleLoadedData = () => {
      audio.currentTime = savedPosition;
      setCurrentTime(savedPosition);
      setIsRetrying(false);
      setConnectionQuality('good');
      setStatusMessage(`Conexão restaurada na posição ${Math.floor(savedPosition)}s`);
      
      // 🔧 CORRIGIDO: Continuar reproduzindo se estava tocando antes
      if (wasPlaying) {
        setIsPlaying(true);
        audio.play().then(() => {
          // Sucesso na reprodução
        }).catch(() => {
          setIsPlaying(false);
          setShowRetryButton(true);
          setStatusMessage('Falha na reconexão');
        });
      }
      
      setTimeout(() => setStatusMessage(null), 3000);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
    
    audio.addEventListener('loadeddata', handleLoadedData);
  };

  // 🆕 Função para parar manualmente durante interrupção
  const handleManualStop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      setIsRetrying(false);
      setShowRetryButton(false);
      setStatusMessage('Reprodução interrompida pelo usuário');
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-lg rounded-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        
        <audio
          ref={audioRef}
          preload="auto"
          crossOrigin="anonymous"
          // 🆕 OTIMIZAÇÃO: Configurações para buffer contínuo
          style={{
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
            
            {/* 🆕 NOVO: Barra de progresso com buffer visual - ALTURA AUMENTADA PARA MOBILE */}
            <div className="relative space-y-2">
              {/* Buffer indicator com gradiente - altura aumentada */}
              <div className="w-full h-4 sm:h-3 bg-secondary rounded-full overflow-hidden relative">
                {/* Buffer de fundo (total carregado) */}
                <div 
                  className="h-full bg-muted/40 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
                
                {/* Buffer de preload (10% à frente da posição atual) */}
                <div 
                  className="h-full bg-primary/20 transition-all duration-300 absolute top-0"
                  style={{ 
                    left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? Math.min(10, (bufferProgress - (currentTime / duration) * 100)) : 0}%`
                  }}
                />
                
                {/* Posição atual (barra de tempo) */}
                <div 
                  className="h-full bg-primary transition-all duration-150 absolute top-0 z-10"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                
                {/* Indicador de posição atual - mais visível */}
                <div 
                  className="absolute top-0 w-1.5 sm:w-1 h-full bg-primary-foreground shadow-lg transition-all duration-150 z-20"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              
              {/* Slider principal - área de toque aumentada para mobile */}
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={0.1}
                onValueChange={handleTimeSeekDebounced}
                disabled={!duration}
                aria-label="Progresso da faixa"
                className="w-full opacity-0 absolute top-0 h-4 sm:h-3 cursor-pointer"
              />
              
              {/* Informações do buffer */}
              {duration > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Buffer: {Math.round(bufferProgress)}%</span>
                  <span>
                    À frente: {audioRef.current?.buffered.length > 0 
                      ? Math.max(0, Math.round(audioRef.current.buffered.end(audioRef.current.buffered.length - 1) - currentTime))
                      : 0}s
                  </span>
                </div>
              )}
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
            {/* 🆕 NOVO: Indicador de status simplificado */}
            {connectionQuality !== 'unknown' && (
              <div className="w-full text-center text-sm bg-muted/50 p-2 rounded-md">
                <div className="flex items-center justify-center gap-2">
                  {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isBuffering && !isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                  
                  {/* Ícone de conexão */}
                  {connectionQuality === 'poor' && (
                    <WifiOff className="h-4 w-4 text-yellow-500" title="Conexão instável" />
                  )}
                  {connectionQuality === 'good' && (
                    <Wifi className="h-4 w-4 text-green-500" title="Conexão estável" />
                  )}
                  
                  <span className={cn(
                    connectionQuality === 'poor' ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {connectionQuality === 'good' ? 'Conexão estável' : 
                     connectionQuality === 'poor' ? 'Conexão instável' : 'Sem conexão'}
                  </span>
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
                    className="w-16 sm:w-24"
                    aria-label="Controle de volume"
                    disabled={!activeTrack}
                />
            </div>
            
            <div className="flex items-center justify-center gap-2">
                {/* 🆕 NOVO: Botão de retry manual */}
                {(isRetrying || showRetryButton) && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleManualRetry}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Tentar Novamente
                    </Button>
                    <Button
                      onClick={handleManualStop}
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                    >
                      Parar
                    </Button>
                  </div>
                )}
                
                <Button 
                  onClick={togglePlayPause} 
                  size="lg" 
                  className="h-16 w-16 rounded-full bg-accent hover:bg-accent/90" 
                  disabled={!activeTrack || (isLoading && !isRetrying)}
                >
                    {(isLoading && !isRetrying) ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isRetrying ? (
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

  // 🚀 NOVO: Carregamento contínuo imediato (independente da reprodução)
  useEffect(() => {
    if (!isOpen || !activeTrack) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    // Iniciar carregamento imediatamente quando a faixa carrega
    const startImmediateLoading = () => {
      // Configuração máxima de preload
      audio.preload = 'auto';
      
      // 🚀 CARREGAMENTO CONTÍNUO DESDE O INÍCIO
      const continuousLoader = setInterval(() => {
        if (audio.buffered.length > 0 && duration > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const bufferPercent = (bufferedEnd / duration) * 100;
          
          // Carregar continuamente até 100%, independente da posição atual
          if (bufferPercent < 100) {
            const currentTime = audio.currentTime;
            
            // 🎯 ESTRATÉGIA: Seeks progressivos para forçar download completo
            const loadTargets = [
              Math.min(bufferedEnd + 30, duration - 1),  // 30s à frente do buffer
              Math.min(bufferedEnd + 60, duration - 1),  // 1min à frente
              Math.min(duration * 0.25, duration - 1),   // 25% do arquivo
              Math.min(duration * 0.5, duration - 1),    // 50% do arquivo
              Math.min(duration * 0.75, duration - 1),   // 75% do arquivo
              duration - 2                               // Quase o final
            ];
            
            // Executar seeks em sequência rápida
            loadTargets.forEach((target, index) => {
              if (target > bufferedEnd) {
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = target;
                    // Retornar à posição original muito rapidamente
                    setTimeout(() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = currentTime;
                      }
                    }, 10); // Seek ultra-rápido: 10ms
                  }
                }, index * 20); // Seeks escalonados a cada 20ms
              }
            });
            
            // Forçar reload se necessário
            if (audio.networkState === audio.NETWORK_IDLE) {
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.load();
                  audioRef.current.currentTime = currentTime;
                }
              }, 200);
            }
          }
        }
      }, 500); // 🚀 MUITO FREQUENTE: A cada 500ms
      
      return continuousLoader;
    };

    // Iniciar carregamento assim que os metadados estiverem prontos
    const handleLoadedMetadata = () => {
      const loader = startImmediateLoading();
      
      // Limpar quando o componente for desmontado
      return () => {
        if (loader) clearInterval(loader);
      };
    };

    // Se já tem metadados, iniciar imediatamente
    if (audio.readyState >= 1) {
      const cleanup = handleLoadedMetadata();
      return cleanup;
    } else {
      // Aguardar metadados e então iniciar
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [isOpen, activeTrack, duration]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-lg rounded-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        
        <audio
          ref={audioRef}
          preload="auto"
          crossOrigin="anonymous"
          // 🆕 OTIMIZAÇÃO: Configurações para buffer contínuo
          style={{
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
            
            {/* 🆕 NOVO: Barra de progresso com buffer visual - ALTURA AUMENTADA PARA MOBILE */}
            <div className="relative space-y-2">
              {/* Buffer indicator com gradiente - altura aumentada */}
              <div className="w-full h-4 sm:h-3 bg-secondary rounded-full overflow-hidden relative">
                {/* Buffer de fundo (total carregado) */}
                <div 
                  className="h-full bg-muted/40 transition-all duration-300"
                  style={{ width: `${bufferProgress}%` }}
                />
                
                {/* Buffer de preload (10% à frente da posição atual) */}
                <div 
                  className="h-full bg-primary/20 transition-all duration-300 absolute top-0"
                  style={{ 
                    left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? Math.min(10, (bufferProgress - (currentTime / duration) * 100)) : 0}%`
                  }}
                />
                
                {/* Posição atual (barra de tempo) */}
                <div 
                  className="h-full bg-primary transition-all duration-150 absolute top-0 z-10"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                
                {/* Indicador de posição atual - mais visível */}
                <div 
                  className="absolute top-0 w-1.5 sm:w-1 h-full bg-primary-foreground shadow-lg transition-all duration-150 z-20"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              
              {/* Slider principal - área de toque aumentada para mobile */}
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={0.1}
                onValueChange={handleTimeSeekDebounced}
                disabled={!duration}
                aria-label="Progresso da faixa"
                className="w-full opacity-0 absolute top-0 h-4 sm:h-3 cursor-pointer"
              />
              
              {/* Informações do buffer */}
              {duration > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Buffer: {Math.round(bufferProgress)}%</span>
                  <span>
                    À frente: {audioRef.current?.buffered.length > 0 
                      ? Math.max(0, Math.round(audioRef.current.buffered.end(audioRef.current.buffered.length - 1) - currentTime))
                      : 0}s
                  </span>
                </div>
              )}
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
            {/* 🆕 NOVO: Indicador de status simplificado */}
            {connectionQuality !== 'unknown' && (
              <div className="w-full text-center text-sm bg-muted/50 p-2 rounded-md">
                <div className="flex items-center justify-center gap-2">
                  {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isBuffering && !isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                  
                  {/* Ícone de conexão */}
                  {connectionQuality === 'poor' && (
                    <WifiOff className="h-4 w-4 text-yellow-500" title="Conexão instável" />
                  )}
                  {connectionQuality === 'good' && (
                    <Wifi className="h-4 w-4 text-green-500" title="Conexão estável" />
                  )}
                  
                  <span className={cn(
                    connectionQuality === 'poor' ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {connectionQuality === 'good' ? 'Conexão estável' : 
                     connectionQuality === 'poor' ? 'Conexão instável' : 'Sem conexão'}
                  </span>
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
                    className="w-16 sm:w-24"
                    aria-label="Controle de volume"
                    disabled={!activeTrack}
                />
            </div>
            
            <div className="flex items-center justify-center gap-2">
                {/* 🆕 NOVO: Botão de retry manual */}
                {showRetryButton && (
                  <Button onClick={handleManualRetry} variant="outline" size="sm" disabled={isRetrying}>
                    {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tentar Novamente'}
                  </Button>
                )}
                
                <Button 
                  onClick={togglePlayPause} 
                  size="lg" 
                  className="h-16 w-16 rounded-full bg-accent hover:bg-accent/90" 
                  disabled={!activeTrack || (isLoading && !isRetrying)}
                >
                    {(isLoading && !isRetrying) ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isRetrying ? (
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
