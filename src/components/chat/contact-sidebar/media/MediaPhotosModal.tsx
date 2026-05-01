import { useMemo, useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@evoapi/design-system/dialog';
import { Button } from '@evoapi/design-system/button';
import { ArrowLeft, MoreVertical, Play, X } from 'lucide-react';

import { collectPhotos, groupByMonth, type PhotoItem } from './utils';
import MonthHeader from './MonthHeader';
import type { Message } from '@/types/chat/api';

interface MediaPhotosModalProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
}

const MediaPhotosModal = ({ open, onClose, messages }: MediaPhotosModalProps) => {
  // Snapshot dos grupos só quando o modal está aberto, pra evitar trabalho enquanto fechado.
  const groups = useMemo(() => {
    if (!open) return [];
    const photos = collectPhotos(messages);
    return groupByMonth(photos);
  }, [open, messages]);

  const flatPhotos = useMemo<PhotoItem[]>(
    () => groups.flatMap(g => g.items),
    [groups],
  );

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Fecha o viewer se a lista mudar de tamanho e o índice ficar fora.
  useEffect(() => {
    if (viewerIndex !== null && viewerIndex >= flatPhotos.length) {
      setViewerIndex(null);
    }
  }, [flatPhotos.length, viewerIndex]);

  const closeViewer = useCallback(() => setViewerIndex(null), []);

  // Esc fecha o viewer (Dialog do design system trata Esc de fechar o modal principal).
  useEffect(() => {
    if (viewerIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeViewer();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [viewerIndex, closeViewer]);

  const activePhoto = viewerIndex !== null ? flatPhotos[viewerIndex] : null;

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className="
          p-0 gap-0 flex flex-col overflow-hidden
          w-screen h-[100dvh] max-w-none rounded-none
          md:w-[calc(100%-2rem)] md:max-w-2xl md:h-auto md:max-h-[80vh] md:rounded-lg
        "
      >
        {/* Header fixo */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-background">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onClose}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="flex-1 text-base font-semibold text-foreground text-center">
            Fotos
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Mais opções"
            disabled
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {groups.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground italic">
              Nenhuma foto compartilhada nesta conversa.
            </p>
          ) : (
            groups.map((group, gi) => {
              const baseIndex = groups
                .slice(0, gi)
                .reduce((sum, g) => sum + g.items.length, 0);
              return (
                <section key={group.key}>
                  <MonthHeader label={group.label} first={gi === 0} />
                  <div className="grid grid-cols-3 gap-0">
                    {group.items.map((item, idx) => {
                      const flatIdx = baseIndex + idx;
                      const att = item.attachment;
                      return (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => setViewerIndex(flatIdx)}
                          className="relative group aspect-square bg-muted overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
                          aria-label={`Abrir ${att.fallback_title || 'foto'}`}
                        >
                          <img
                            src={att.thumb_url || att.data_url}
                            alt={att.fallback_title || 'mídia'}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {att.file_type === 'video' && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                              <Play
                                className="h-6 w-6 text-white drop-shadow"
                                fill="currentColor"
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}

          <p className="px-4 py-4 text-[11px] text-muted-foreground italic text-center">
            Mostrando arquivos das mensagens já carregadas.
          </p>
        </div>

        {/* Viewer fullscreen — overlay sobre o próprio modal */}
        {activePhoto && (
          <div
            className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Visualizador de mídia"
            onClick={closeViewer}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeViewer();
              }}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Fechar visualizador"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="max-w-screen max-h-[100dvh] w-full h-full flex items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {activePhoto.attachment.file_type === 'video' ? (
                <video
                  src={activePhoto.attachment.data_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <img
                  src={activePhoto.attachment.data_url}
                  alt={activePhoto.attachment.fallback_title || 'mídia'}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaPhotosModal;
