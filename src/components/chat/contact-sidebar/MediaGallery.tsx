import { useMemo, useState } from 'react';
import { ImageIcon, Play, FileIcon, Music, ExternalLink } from 'lucide-react';

import { useMessages } from '@/contexts/chat/MessagesContext';
import type { Attachment } from '@/types/chat/api';
import { Button } from '@evoapi/design-system/button';

type MediaTab = 'visual' | 'audio' | 'file';

interface MediaGalleryProps {
  conversationId: string | number;
}

// Quantos thumbs mostrar antes do "ver tudo"
const PREVIEW_LIMIT = 9;

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const isVisual = (a: Attachment) => a.file_type === 'image' || a.file_type === 'video';

const MediaGallery = ({ conversationId }: MediaGalleryProps) => {
  const { getMessages } = useMessages();
  const [tab, setTab] = useState<MediaTab>('visual');
  const [showAll, setShowAll] = useState(false);

  // Achata todos os attachments das mensagens carregadas, mais recentes primeiro.
  const attachments = useMemo<Attachment[]>(() => {
    const messages = getMessages(String(conversationId));
    if (!messages || messages.length === 0) return [];

    const flat: Attachment[] = [];
    // Mensagens vêm em ordem cronológica (mais antiga → mais nova). Para a galeria,
    // queremos a mais recente primeiro, então iteramos de trás pra frente.
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg.attachments || msg.attachments.length === 0) continue;
      for (const att of msg.attachments) {
        // Ignora 'location' — não cabe em galeria
        if (att.file_type === 'location') continue;
        // Sem data_url não tem o que mostrar
        if (!att.data_url) continue;
        flat.push(att);
      }
    }
    return flat;
  }, [conversationId, getMessages]);

  const visual = useMemo(() => attachments.filter(isVisual), [attachments]);
  const audio = useMemo(() => attachments.filter(a => a.file_type === 'audio'), [attachments]);
  const files = useMemo(() => attachments.filter(a => a.file_type === 'file'), [attachments]);

  const counts = {
    visual: visual.length,
    audio: audio.length,
    file: files.length,
  };
  const totalCount = counts.visual + counts.audio + counts.file;

  if (totalCount === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhum arquivo trocado nesta conversa ainda.
      </p>
    );
  }

  const tabs: Array<{ id: MediaTab; label: string; count: number }> = [
    { id: 'visual', label: 'Mídia', count: counts.visual },
    { id: 'audio', label: 'Áudio', count: counts.audio },
    { id: 'file', label: 'Arquivos', count: counts.file },
  ];

  // Esconde tabs vazias para não confundir o usuário.
  const visibleTabs = tabs.filter(t => t.count > 0);

  // Garante que a aba atual existe; senão cai pra primeira disponível.
  const activeTab: MediaTab =
    visibleTabs.find(t => t.id === tab)?.id ?? visibleTabs[0]?.id ?? 'visual';

  const renderVisualGrid = () => {
    const list = showAll ? visual : visual.slice(0, PREVIEW_LIMIT);
    return (
      <>
        <div className="grid grid-cols-3 gap-1.5">
          {list.map(att => (
            <a
              key={att.id}
              href={att.data_url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group aspect-square rounded-md overflow-hidden bg-muted hover:ring-2 hover:ring-primary/40 transition-all"
              title={att.fallback_title || ''}
            >
              <img
                src={att.thumb_url || att.data_url}
                alt={att.fallback_title || 'mídia'}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {att.file_type === 'video' && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <Play className="h-5 w-5 text-white drop-shadow" fill="currentColor" />
                </span>
              )}
            </a>
          ))}
        </div>
        {visual.length > PREVIEW_LIMIT && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-8 text-xs"
            onClick={() => setShowAll(prev => !prev)}
          >
            {showAll ? 'Ver menos' : `Ver tudo (${visual.length})`}
          </Button>
        )}
      </>
    );
  };

  const renderAudioList = () => (
    <ul className="flex flex-col gap-2">
      {audio.map(att => (
        <li
          key={att.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors"
        >
          <Music className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={att.data_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-xs truncate hover:underline"
          >
            {att.fallback_title || 'Áudio'}
          </a>
          {att.file_size > 0 && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatBytes(att.file_size)}
            </span>
          )}
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
        </li>
      ))}
    </ul>
  );

  const renderFileList = () => (
    <ul className="flex flex-col gap-2">
      {files.map(att => (
        <li
          key={att.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors"
        >
          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={att.data_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-xs truncate hover:underline"
          >
            {att.fallback_title || `arquivo${att.extension ? '.' + att.extension : ''}`}
          </a>
          {att.file_size > 0 && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatBytes(att.file_size)}
            </span>
          )}
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs minimal — só renderiza se houver mais de uma categoria */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1" role="tablist" aria-label="Tipos de mídia">
          {visibleTabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setTab(t.id);
                  setShowAll(false);
                }}
                className={[
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                {t.label}
                <span className="ml-1 opacity-70">{t.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div role="tabpanel">
        {activeTab === 'visual' && counts.visual > 0 && renderVisualGrid()}
        {activeTab === 'audio' && counts.audio > 0 && renderAudioList()}
        {activeTab === 'file' && counts.file > 0 && renderFileList()}
      </div>

      <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
        <ImageIcon className="h-3 w-3" />
        Mostra apenas arquivos das mensagens já carregadas.
      </p>
    </div>
  );
};

export default MediaGallery;
