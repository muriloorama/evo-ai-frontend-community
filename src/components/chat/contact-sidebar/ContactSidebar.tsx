import React, { useState, useEffect, useCallback } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import { Button } from '@evoapi/design-system/button';
import { Badge } from '@evoapi/design-system/badge';
import { X, User, FileText, ChevronDown, Tag } from 'lucide-react';

import ContactHeader from './ContactHeader';
import ContactDetails from './ContactDetails';
import ContactNotes from './ContactNotes';
import ConversationLabels from './ConversationLabels';

import PipelineManagement from '@/components/chat/contact-sidebar/PipelineManagement';
import { pipelinesService } from '@/services/pipelines';
import type { Pipeline } from '@/types/analytics';

import { Contact, Conversation } from '@/types/chat/api';

interface ContactSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  conversation: Conversation | null;
  onFilterReload?: () => Promise<void>;
}

// Compact collapsible section header
interface CollapsibleHeaderProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const CollapsibleHeader = ({
  title,
  icon,
  count,
  isOpen,
  onToggle,
}: CollapsibleHeaderProps) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center justify-between w-full gap-2 cursor-pointer px-3 py-1.5 hover:bg-accent/50 transition-colors"
  >
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {icon}
      <h3 className="text-sm font-medium truncate leading-none">{title}</h3>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {count}
        </Badge>
      )}
    </div>
    <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </button>
);

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  isOpen,
  onClose,
  contact,
  conversation,
  onFilterReload,
}) => {
  const { t } = useLanguage('chat');

  // Estados para controlar seções expandidas/colapsadas
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showContactNotes, setShowContactNotes] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationPipelines, setConversationPipelines] = useState<Pipeline[]>([]);

  // Detectar se é mobile para controlar renderização
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carregar pipelines da conversation uma única vez
  const loadConversationPipelines = useCallback(async () => {
    if (!conversation?.id) {
      setConversationPipelines([]);
      return;
    }

    try {
      const pipelines = await pipelinesService.getPipelinesByConversation(conversation.id);
      setConversationPipelines(pipelines);
    } catch (error) {
      console.error('Error loading conversation pipelines:', error);
      setConversationPipelines([]);
    }
  }, [conversation?.id]);

  useEffect(() => {
    loadConversationPipelines();
  }, [loadConversationPipelines]);

  // Handler para recarregar pipelines quando houver atualização
  const handlePipelineUpdated = useCallback(async () => {
    await loadConversationPipelines();
    onFilterReload?.();
  }, [loadConversationPipelines, onFilterReload]);

  // Calcular altura real do header dinamicamente
  useEffect(() => {
    const calculateHeaderHeight = () => {
      // Procurar o AppBar do MainLayout
      const appBar = document.querySelector(
        '[class*="flex-shrink-0"][class*="bg-sidebar"][class*="border-b"]',
      );
      if (appBar) {
        const height = appBar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    calculateHeaderHeight();
    window.addEventListener('resize', calculateHeaderHeight);
    return () => window.removeEventListener('resize', calculateHeaderHeight);
  }, []);

  // No mobile, esconder completamente quando fechado
  // No desktop, manter no DOM para animação
  if (!isOpen && isMobile) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && isMobile && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/50 z-30"
          style={{ top: 'var(--header-height, 60px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        border-l bg-background flex flex-col
        fixed md:static left-0 md:left-auto right-0 md:right-auto bottom-0 md:bottom-auto z-40 md:z-auto
        transform transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen
            ? 'w-full md:w-96 translate-x-0 md:translate-x-0 md:opacity-100'
            : 'w-full md:w-0 translate-x-full md:translate-x-0 md:opacity-0'
          }
      `}
        style={{
          top: isMobile ? 'var(--header-height, 60px)' : 'auto',
          height: isMobile ? 'calc(100dvh - var(--header-height, 60px))' : '100%',
        }}
      >
        {/* Header com Avatar e Info Básica + Close Button */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
          <ContactHeader contact={contact} />

          {/* Close Button — área de toque maior no mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 h-11 w-11 md:h-8 md:w-8 p-0 hover:bg-muted"
          >
            <X className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </div>

        {/* Seções compactas — divisórias, sem Card wrapper pra manter 1 linha fechada */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin">
          {/* 1. Contact Details - Informações do contato */}
          <div className="border-b border-border">
            <CollapsibleHeader
              title={t('contactSidebar.sections.contactDetails.title')}
              icon={<User className="h-3.5 w-3.5 text-green-500" />}
              isOpen={showContactDetails}
              onToggle={() => setShowContactDetails(!showContactDetails)}
            />
            {showContactDetails && (
              <div className="px-3 pb-2">
                <ContactDetails contact={contact} />
              </div>
            )}
          </div>

          {/* 2. Contact Notes - Notas do contato */}
          {contact && (
            <div className="border-b border-border">
              <CollapsibleHeader
                title={t('contactSidebar.sections.contactNotes.title')}
                icon={<FileText className="h-3.5 w-3.5 text-orange-500" />}
                isOpen={showContactNotes}
                onToggle={() => setShowContactNotes(!showContactNotes)}
              />
              {showContactNotes && (
                <div className="px-3 pb-2">
                  <ContactNotes contactId={String(contact.id)} />
                </div>
              )}
            </div>
          )}

          {/* 3. Etiquetas — sempre visível */}
          {conversation && (
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Tag className="h-3.5 w-3.5 text-pink-500" />
                <h3 className="text-sm font-medium">Etiquetas</h3>
              </div>
              <ConversationLabels
                conversation={conversation}
                onChange={onFilterReload}
              />
            </div>
          )}

          {/* 4. Kaban — sempre visível */}
          {conversation && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-sm font-medium">Kaban</h3>
              </div>
              <PipelineManagement
                conversationId={conversation.id}
                pipelines={conversationPipelines}
                onPipelineUpdated={handlePipelineUpdated}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactSidebar;
