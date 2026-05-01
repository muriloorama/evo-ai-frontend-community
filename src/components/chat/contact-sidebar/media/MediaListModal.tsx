import { useMemo } from 'react';
import { Dialog, DialogContent } from '@evoapi/design-system/dialog';
import { Button } from '@evoapi/design-system/button';
import { ArrowLeft, Search } from 'lucide-react';

import {
  collectFiles,
  extractLinks,
  groupByDate,
  domainFromUrl,
  fileExtension,
  type FileItem,
  type LinkItem,
  type Group,
} from './utils';
import DateHeader from './DateHeader';
import MediaListItem from './MediaListItem';
import type { Message } from '@/types/chat/api';

export type MediaListMode = 'files' | 'links';

interface MediaListModalProps {
  open: boolean;
  onClose: () => void;
  mode: MediaListMode;
  messages: Message[];
}

const truncateExcerpt = (text: string, max = 240): string => {
  const trimmed = (text || '').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
};

const formatFileTitle = (item: FileItem): string => {
  const att = item.attachment;
  if (att.fallback_title) return att.fallback_title;
  const ext = fileExtension(att);
  return ext ? `arquivo.${ext}` : 'arquivo';
};

const MediaListModal = ({ open, onClose, mode, messages }: MediaListModalProps) => {
  const fileGroups = useMemo<Group<FileItem>[]>(() => {
    if (!open || mode !== 'files') return [];
    return groupByDate(collectFiles(messages));
  }, [open, mode, messages]);

  const linkGroups = useMemo<Group<LinkItem>[]>(() => {
    if (!open || mode !== 'links') return [];
    return groupByDate(extractLinks(messages));
  }, [open, mode, messages]);

  const isFiles = mode === 'files';
  const title = isFiles ? 'Arquivos' : 'Links';
  // Conta total dos grupos ativos (pra estado vazio).
  const totalGroups = isFiles ? fileGroups.length : linkGroups.length;

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
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Buscar"
            disabled
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {totalGroups === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground italic">
              {isFiles
                ? 'Nenhum arquivo compartilhado nesta conversa.'
                : 'Nenhum link compartilhado nesta conversa.'}
            </p>
          ) : isFiles ? (
            fileGroups.map((group, gi) => (
              <section key={group.key}>
                <DateHeader label={group.label} first={gi === 0} />
                <ul className="flex flex-col">
                  {group.items.map(fileItem => {
                    const att = fileItem.attachment;
                    const fileTitle = formatFileTitle(fileItem);
                    const ext = fileExtension(att);
                    const subtitle = ext ? `.${ext}` : att.data_url;
                    const excerpt = truncateExcerpt(fileItem.message.content || '');

                    return (
                      <li key={att.id}>
                        <MediaListItem
                          href={att.data_url}
                          title={fileTitle}
                          subtitleAzul={subtitle}
                          excerpt={excerpt}
                          thumbUrl={att.thumb_url}
                          colorSeed={fileTitle}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            linkGroups.map((group, gi) => (
              <section key={group.key}>
                <DateHeader label={group.label} first={gi === 0} />
                <ul className="flex flex-col">
                  {group.items.map(linkItem => {
                    const domain = domainFromUrl(linkItem.url);
                    const excerpt = truncateExcerpt(linkItem.message.content || '');

                    return (
                      <li key={`${linkItem.url}-${linkItem.message.id}`}>
                        <MediaListItem
                          href={linkItem.url}
                          title={domain}
                          subtitleAzul={linkItem.url}
                          excerpt={excerpt}
                          colorSeed={domain}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}

          <p className="px-4 py-4 text-[11px] text-muted-foreground italic text-center">
            Mostrando arquivos das mensagens já carregadas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaListModal;
