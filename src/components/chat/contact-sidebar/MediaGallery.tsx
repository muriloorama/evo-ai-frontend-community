import { useMemo, useState } from 'react';

import { useMessages } from '@/contexts/chat/MessagesContext';
import MediaSummary, { type MediaSummaryKind } from './media/MediaSummary';
import MediaPhotosModal from './media/MediaPhotosModal';
import MediaListModal from './media/MediaListModal';
import { collectFiles, collectPhotos, extractLinks } from './media/utils';

interface MediaGalleryProps {
  conversationId: string | number;
}

type OpenModal = MediaSummaryKind | null;

/**
 * Camada 1 da galeria de mídia: resumo compacto que abre cada categoria
 * num modal próprio (Camada 2 = fotos / Camada 3 = arquivos e links).
 *
 * Esse componente é o único ponto de contato com o ContactSidebar — ele
 * permanece estático na sidebar, então a posição de scroll da Camada 1
 * é preservada quando os modais fecham (eles não desmontam o resumo).
 */
const MediaGallery = ({ conversationId }: MediaGalleryProps) => {
  const { getMessages } = useMessages();
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  const messages = useMemo(
    () => getMessages(String(conversationId)),
    [conversationId, getMessages],
  );

  // Mesmas funções usadas dentro dos modais — garantem contagens consistentes.
  const photoCount = useMemo(() => collectPhotos(messages).length, [messages]);
  const fileCount = useMemo(() => collectFiles(messages).length, [messages]);
  const linkCount = useMemo(() => extractLinks(messages).length, [messages]);

  return (
    <>
      <MediaSummary
        photoCount={photoCount}
        fileCount={fileCount}
        linkCount={linkCount}
        onSelect={setOpenModal}
      />

      <MediaPhotosModal
        open={openModal === 'photos'}
        onClose={() => setOpenModal(null)}
        messages={messages}
      />

      <MediaListModal
        open={openModal === 'files'}
        onClose={() => setOpenModal(null)}
        mode="files"
        messages={messages}
      />

      <MediaListModal
        open={openModal === 'links'}
        onClose={() => setOpenModal(null)}
        mode="links"
        messages={messages}
      />
    </>
  );
};

export default MediaGallery;
