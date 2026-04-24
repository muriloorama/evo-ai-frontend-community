import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Input } from '@evoapi/design-system/input';
import { Badge } from '@evoapi/design-system/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@evoapi/design-system/context-menu';
import {
  Search,
  Filter,
  Mail,
  MailOpen,
  MessageCircle,
  CheckCircle,
  Clock,
  Pause,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  Trash2,
  X,
  FileText,
  Pin,
  Archive,
  ArrowUpRight,
  ArrowDownLeft,
  Mic,
  Image as ImageIcon,
  Video,
  MapPin,
  Paperclip,
  Instagram,
  Facebook,
} from 'lucide-react';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { Conversation, ConversationFilter } from '@/types/chat/api';
import { formatConversationTime, formatDetailedTime } from '@/utils/time/timeHelpers';
import { ConversationSkeleton } from '../loading-states';
import { NoConversations } from '../empty-states';
import ContactAvatar from '../contact/ContactAvatar';
import ContactTagsList from '@/components/contacts/ContactTagsList';
import ConversationsFilter from '../conversation/ConversationsFilter';
import { BaseFilter } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';

interface ChatSidebarProps {
  mobileView: 'list' | 'chat';
  searchInput: string;
  onSearchChange: (value: string) => void;
  onConversationSelect: (conversation: Conversation) => void;
  onFilterApply: (filters: BaseFilter[]) => void;
  onFilterClear: () => void;
  // Context menu handlers
  onMarkAsRead: (conversation: Conversation) => void;
  onMarkAsUnread: (conversation: Conversation) => void;
  onMarkAsOpen: (conversation: Conversation) => void;
  onMarkAsResolved: (conversation: Conversation) => void;
  onPostpone: (conversation: Conversation) => void;
  onMarkAsSnoozed: (conversation: Conversation) => void;
  onSetPriority: (
    conversation: Conversation,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
  ) => void;
  onPinConversation: (conversation: Conversation) => void;
  onUnpinConversation: (conversation: Conversation) => void;
  onArchiveConversation: (conversation: Conversation) => void;
  onUnarchiveConversation: (conversation: Conversation) => void;
  onAssignAgent: (conversation: Conversation) => void;
  onAssignTeam: (conversation: Conversation) => void;
  onAssignTag: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

const ChatSidebar = ({
  mobileView,
  searchInput,
  onSearchChange,
  onConversationSelect,
  onFilterApply,
  onFilterClear,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAsOpen,
  onMarkAsResolved,
  onPostpone,
  onMarkAsSnoozed,
  onSetPriority,
  onPinConversation,
  onUnpinConversation,
  onArchiveConversation,
  onUnarchiveConversation,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
  onDeleteConversation,
}: ChatSidebarProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  // Explicitly type conversations to ensure TypeScript recognizes it has 'state'
  const conversations = chatContext.conversations as typeof chatContext.conversations & {
    state: {
      conversations: Conversation[];
      conversationsLoading: boolean;
      conversationsError: string | null;
      selectedConversationId: string | null;
      conversationsPagination: {
        page?: number;
        total_pages?: number;
        has_next_page?: boolean;
      } | null;
    };
    getUnreadCount: (conversationId: string) => number;
    loadConversations: (params?: unknown) => Promise<void>;
    loadMoreConversations: () => Promise<void>;
  };
  const filters = chatContext.filters;
  const [conversationFilters, setConversationFilters] = useState<BaseFilter[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // ðŸŽ¯ SYNC: Sincronizar local state com FiltersContext para compatibilidade com o modal
  useEffect(() => {
    // Quando filters.state.activeFilters mudar (ex: por applyFilters chamado diretamente),
    // atualizar o local state tambÃ©m para que o modal mostre os filtros corretos
    // ConversationFilter (API format) -> BaseFilter (UI format)
    const currentLocal = JSON.stringify(conversationFilters);
    const currentContext = JSON.stringify(
      filters.state.activeFilters.map((f: ConversationFilter) => ({
        attributeKey: f.attribute_key,
        filterOperator: f.filter_operator,
        values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
        queryOperator: f.query_operator,
        attributeModel: 'standard' as const,
      })),
    );

    if (currentLocal !== currentContext) {
      setConversationFilters(
        filters.state.activeFilters.map((f: ConversationFilter) => ({
          attributeKey: f.attribute_key,
          filterOperator: f.filter_operator,
          values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
          queryOperator: f.query_operator,
          attributeModel: 'standard' as const,
        })),
      );
    }
  }, [filters.state.activeFilters, conversationFilters]);

  // Debounce da busca para nÃ£o sobrecarregar a API
  // const debouncedSearchTerm = useDebounce(searchInput, 500);

  // Apply search with debounce
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
  };

  const handleApplyFilters = async (newFilters: BaseFilter[]) => {
    setConversationFilters(newFilters);
    onFilterApply(newFilters);
  };

  const handleClearFilters = async () => {
    setConversationFilters([]);
    onFilterClear();
  };

  const pagination = conversations.state.conversationsPagination;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.total_pages || 1;
  const hasNextPage = pagination?.has_next_page ?? currentPage < totalPages;

  const handleSidebarScroll = useCallback(async () => {
    const container = sidebarScrollRef.current;
    if (!container || loadingMoreRef.current) return;

    const pagination = conversations.state.conversationsPagination;
    if (!pagination) return;

    const currentPage = pagination.page || 1;
    const totalPages = pagination.total_pages || 1;
    const hasNextPage = pagination.has_next_page ?? currentPage < totalPages;
    if (!hasNextPage) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom > 120) return;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations]);

  const handleLoadMoreClick = useCallback(async () => {
    if (loadingMoreRef.current || isLoadingMoreConversations || !hasNextPage) return;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations, hasNextPage, isLoadingMoreConversations]);

  const visibleConversations = useMemo(() => {
    const filtered = conversations.state.conversations.filter(conversation => {
      const isArchived = Boolean(conversation.custom_attributes?.archived);
      return showArchived ? isArchived : !isArchived;
    });

    const getSortTimestamp = (conversation: Conversation) => {
      if (typeof conversation.timestamp === 'number') {
        return conversation.timestamp;
      }
      const activityTime = Date.parse(conversation.last_activity_at || '');
      if (!Number.isNaN(activityTime)) {
        return activityTime;
      }
      const updatedTime = Date.parse(conversation.updated_at || '');
      if (!Number.isNaN(updatedTime)) {
        return updatedTime;
      }
      const createdTime = Date.parse(conversation.created_at || '');
      if (!Number.isNaN(createdTime)) {
        return createdTime;
      }
      return 0;
    };

    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.custom_attributes?.pinned);
      const bPinned = Boolean(b.custom_attributes?.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return getSortTimestamp(b) - getSortTimestamp(a);
    });
  }, [conversations.state.conversations, showArchived]);

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const getLastMessage = (conversation: Conversation) => {
    const msg = conversation.last_non_activity_message;
    const cleanContent = stripHtml(msg?.processed_message_content || msg?.content || '');
    return cleanContent.length > 60 ? cleanContent.substring(0, 60) + '...' : cleanContent;
  };

  // Whatsapp-style preview. When the message has an attachment, we always
  // prepend the type icon (🎤 Áudio / 📷 Imagem / 🎥 Vídeo / 📍 / 📎) so the
  // operator can tell at a glance what kind of message it is — even when text
  // is also present (e.g. caption on an image, transcription of an audio).
  const renderMessagePreview = (conversation: Conversation) => {
    const msg = conversation.last_non_activity_message;
    if (!msg) return null;

    const text = getLastMessage(conversation);
    const attachmentType = msg.attachment_type;

    let icon: React.ReactNode = null;
    let label = '';
    switch (attachmentType) {
      case 'audio':
        icon = <Mic className="h-3.5 w-3.5 flex-shrink-0" />;
        label = 'Áudio';
        break;
      case 'image':
        icon = <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />;
        label = 'Imagem';
        break;
      case 'video':
        icon = <Video className="h-3.5 w-3.5 flex-shrink-0" />;
        label = 'Vídeo';
        break;
      case 'location':
        icon = <MapPin className="h-3.5 w-3.5 flex-shrink-0" />;
        label = 'Localização';
        break;
      default:
        if (attachmentType) {
          icon = <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />;
          label = 'Anexo';
        }
    }

    if (icon) {
      return (
        <span className="inline-flex items-center gap-1 min-w-0">
          {icon}
          <span className="truncate">{text || label}</span>
        </span>
      );
    }

    if (text) return <span className="truncate">{text}</span>;
    return null;
  };

  // Direction marker shown next to the last-message preview. Outgoing
  // (atendente/bot) → arrow pointing up-right (sent); incoming (lead) → arrow
  // pointing down-left (received). Color-coded so it reads at a glance:
  // green for outgoing, blue for incoming.
  const renderDirectionIcon = (conversation: Conversation) => {
    const msg = conversation.last_non_activity_message;
    if (!msg) return null;
    const isOutgoing = msg.message_type === 'outgoing';
    return isOutgoing
      ? <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
      : <ArrowDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-sky-600 dark:text-sky-400" />;
  };

  // Pipeline summary compactado pra caber na linha 1/2 do card. Mostra
  // apenas o estágio atual (operador raramente precisa do nome do funil
  // num glance da lista — o estágio dá o sinal). Cor e contador de dias
  // continuam vindo do stage.
  const getPipelineInfo = (conversation: Conversation) => {
    const pipeline = conversation.pipelines?.[0];
    const stage = pipeline?.stages?.[0];
    if (!pipeline || !stage) return null;

    const title = stage.name || pipeline.name;
    const days = stage.days_in_current_stage;
    let daysText = '';
    if (typeof days === 'number') {
      if (days === 1) daysText = '1 dia';
      else if (days < 7) daysText = `${days} dias`;
      else if (days < 30) {
        const w = Math.floor(days / 7);
        daysText = `${w} ${w === 1 ? 'sem' : 'sem'}`;
      } else {
        const m = Math.floor(days / 30);
        daysText = `${m} ${m === 1 ? 'mês' : 'meses'}`;
      }
    }
    return { title, color: stage.color || '#00b894', daysText };
  };

  // Priority icon (compacto). Só o ícone colorido, sem bolha grande.
  const getPriorityIcon = (priority?: string | null) => {
    if (!priority) return null;
    const cls = 'h-3.5 w-3.5 flex-shrink-0';
    switch (priority) {
      case 'urgent': return <AlertTriangle className={`${cls} text-red-600`} />;
      case 'high':   return <ArrowUp className={`${cls} text-orange-500`} />;
      case 'medium': return <Minus className={`${cls} text-blue-500`} />;
      case 'low':    return <ArrowDown className={`${cls} text-gray-500`} />;
      default:       return null;
    }
  };

  // Render conversation context menu
  const renderConversationContextMenu = (conversation: Conversation, children: React.ReactNode) => {
    const currentStatus = conversation.status;
    const hasUnreadMessages =
      (conversations.getUnreadCount(conversation.id) ?? conversation.unread_count ?? 0) > 0;
    const isPinned = Boolean(conversation.custom_attributes?.pinned);
    const isArchived = Boolean(conversation.custom_attributes?.archived);

    return (
      <ContextMenu key={conversation.id}>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {/* Read/Unread Actions */}
          {hasUnreadMessages ? (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsRead(conversation);
              }}
              className="flex items-center gap-2"
            >
              <MailOpen className="h-4 w-4" />
              {t('chatHeader.actions.markAsRead')}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsUnread(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t('chatHeader.actions.markAsUnread')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          {/* Status Actions */}
          {currentStatus !== 'open' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsOpen(conversation);
              }}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsOpen')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'resolved' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsResolved(conversation);
              }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsResolved')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'pending' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onPostpone(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t('chatHeader.actions.markAsPending')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'snoozed' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsSnoozed(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              {t('chatHeader.actions.pauseConversation')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          {/* Priority Actions */}
          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'urgent');
            }}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {t('chatHeader.actions.priorityUrgent')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'high');
            }}
            className="flex items-center gap-2"
          >
            <ArrowUp className="h-4 w-4 text-orange-600" />
            {t('chatHeader.actions.priorityHigh')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'medium');
            }}
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4 text-blue-600" />
            {t('chatHeader.actions.priorityMedium')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'low');
            }}
            className="flex items-center gap-2"
          >
            <ArrowDown className="h-4 w-4 text-gray-600" />
            {t('chatHeader.actions.priorityLow')}
          </ContextMenuItem>

          {conversation.priority && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onSetPriority(conversation, null);
              }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('chatHeader.actions.removePriority')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isPinned) {
                onUnpinConversation(conversation);
              } else {
                onPinConversation(conversation);
              }
            }}
            className="flex items-center gap-2"
          >
            <Pin className="h-4 w-4" />
            {isPinned
              ? t('chatHeader.actions.unpinConversation')
              : t('chatHeader.actions.pinConversation')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isArchived) {
                onUnarchiveConversation(conversation);
              } else {
                onArchiveConversation(conversation);
              }
            }}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {isArchived
              ? t('chatHeader.actions.unarchiveConversation')
              : t('chatHeader.actions.archiveConversation')}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignAgent(conversation);
            }}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4" />
            {t('chatHeader.actions.assignAgent')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignTeam(conversation);
            }}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {t('chatHeader.actions.assignTeam')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignTag(conversation);
            }}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            {t('chatHeader.actions.assignTag')}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onDeleteConversation(conversation);
            }}
            className="flex items-center gap-2"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('chatHeader.actions.deleteConversation')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div
      data-tour="chat-sidebar"
      className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'} md:flex
        w-full md:w-80 border-r bg-card/50 flex-col h-full
      `}
    >
      {/* Search and Filter Header */}
      <div className="p-3 md:p-4 border-b space-y-2.5 md:space-y-3">
        {/* Search */}
        <div className="relative" data-tour="chat-search">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t('chatSidebar.searchPlaceholder')}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-10 h-11 md:h-9 text-base md:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showArchived ? 'ghost' : 'secondary'}
            size="sm"
            className="h-10 md:h-8 flex-1 md:flex-none cursor-pointer"
            aria-pressed={!showArchived}
            onClick={() => setShowArchived(false)}
          >
            {t('chatSidebar.view.active')}
          </Button>
          <Button
            type="button"
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10 md:h-8 flex-1 md:flex-none cursor-pointer"
            aria-pressed={showArchived}
            onClick={() => setShowArchived(true)}
          >
            {t('chatSidebar.view.archived')}
          </Button>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {visibleConversations.length}{' '}
            {visibleConversations.length === 1
              ? t('chatSidebar.conversation')
              : t('chatSidebar.conversations')}
          </span>
          <div className="flex items-center gap-2">
            {/* Indicador de filtros ativos */}
            {filters.state.activeFilters.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filters.state.activeFilters.length}{' '}
                {filters.state.activeFilters.length === 1
                  ? t('chatSidebar.filter')
                  : t('chatSidebar.filters')}
              </Badge>
            )}

            {/* Botão de filtros */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterModalOpen(true)}
              disabled={filters.state.isApplyingFilters}
              className="h-10 md:h-8 px-3 md:px-2 cursor-pointer"
              data-tour="chat-filter-button"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden md:inline">{t('chatSidebar.filtersButton')}</span>
            </Button>
          </div>
        </div>
        {showArchived && (
          <p className="text-xs text-muted-foreground">{t('chatSidebar.archivedNotice')}</p>
        )}
      </div>

      {/* Conversations List */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleSidebarScroll}
        data-tour="chat-conversations-list"
      >
        {!conversations ? (
          <ConversationSkeleton count={8} />
        ) : conversations.state.conversationsLoading || filters.state.isApplyingFilters ? (
          <ConversationSkeleton count={8} />
        ) : conversations.state.conversationsError ? (
          <div className="p-4 text-center">
            <div className="text-destructive mb-2">{t('chatSidebar.errors.loadConversations')}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {conversations.state.conversationsError}
            </p>
            <Button variant="outline" size="sm" onClick={() => conversations.loadConversations({})}>
              {t('chatSidebar.errors.tryAgain')}
            </Button>
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="p-4 text-center">
            {searchInput ? (
              <NoConversations
                searchTerm={searchInput}
                onCreateNew={() => console.log('Create new conversation')}
              />
            ) : (
              <div className="py-8">
                <div className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {showArchived
                    ? t('chatSidebar.emptyArchived.title')
                    : t('chatSidebar.empty.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {showArchived
                    ? t('chatSidebar.emptyArchived.description')
                    : t('chatSidebar.empty.description')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {visibleConversations.map((conversation: Conversation) => {
              const isSelected =
                String(conversations.state.selectedConversationId) === String(conversation.id);

              // Usar channel da conversa diretamente, com fallback para inbox
              const channelType =
                conversation.inbox?.channel_type || conversation.inbox?.channel_type;
              const channelProvider = conversation.inbox?.provider;

              const stagePipelineInfo = getPipelineInfo(conversation);

              return renderConversationContextMenu(
                conversation,
                <div
                  key={conversation.id}
                  className={`relative px-3 py-3 md:py-1.5 min-h-[64px] md:min-h-0 hover:bg-accent active:bg-accent cursor-pointer transition-colors touch-manipulation ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'border-b border-border/50'
                  }`}
                  onClick={() => onConversationSelect(conversation)}
                >
                  {/* Travessão colorido à esquerda — cor do estágio do kanban */}
                  {stagePipelineInfo && !isSelected && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 z-10 pointer-events-none"
                      style={{ backgroundColor: stagePipelineInfo.color }}
                      title={`Estágio: ${stagePipelineInfo.title}`}
                      aria-hidden
                    />
                  )}
                  <div className="flex items-start gap-3 md:gap-2.5">
                    <ContactAvatar
                      contact={conversation.contact}
                      channelType={channelType}
                      channelProvider={channelProvider}
                      className="!h-12 !w-12 md:!h-10 md:!w-10"
                    />
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      {(() => {
                        const pipelineInfo = getPipelineInfo(conversation);
                        const priorityIcon = getPriorityIcon(conversation.priority);
                        const hasUnread = (conversations.getUnreadCount(conversation.id) || 0) > 0;
                        const conversationLabels = ((conversation.labels || []) as unknown as Array<{
                          id?: string;
                          title?: string;
                          name?: string;
                          color?: string;
                        }>)
                          .filter(l => l && typeof l === 'object')
                          .slice(-1); // apenas a última label atribuída (mais recente)
                        return (
                          <>
                            {/* LINE 1: status dot + name + (mobile: only pin + time) (desktop: + tags + pipeline) */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {(() => {
                                const status = conversation.status;
                                const statusConfig: Record<string, { color: string; label: string }> = {
                                  open: { color: '#22c55e', label: 'Aberta' },
                                  pending: { color: '#eab308', label: 'Pendente' },
                                  resolved: { color: '#9ca3af', label: 'Resolvida' },
                                  snoozed: { color: '#a855f7', label: 'Adiada' },
                                };
                                const cfg = statusConfig[status as string];
                                if (!cfg) return null;
                                return (
                                  <span
                                    className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cfg.color }}
                                    title={cfg.label}
                                  />
                                );
                              })()}
                              <p className={`font-medium truncate min-w-0 flex-1 text-[15px] md:text-sm ${hasUnread ? 'font-semibold' : ''}`}>
                                {conversation.contact?.name || t('chatSidebar.contactNoName')}
                              </p>
                              {conversation.tracking_source?.source_type === 'instagram_ad' && (
                                <Instagram
                                  className="h-3.5 w-3.5 md:h-3 md:w-3 text-pink-600 flex-shrink-0"
                                  aria-label={conversation.tracking_source.source_label || 'Instagram Ads'}
                                />
                              )}
                              {conversation.tracking_source?.source_type === 'meta_ad' && (
                                <Facebook
                                  className="h-3.5 w-3.5 md:h-3 md:w-3 text-blue-600 flex-shrink-0"
                                  aria-label={conversation.tracking_source.source_label || 'Meta Ads'}
                                />
                              )}
                              {Boolean(conversation.custom_attributes?.pinned) && (
                                <Pin className="h-3.5 w-3.5 md:h-3 md:w-3 text-primary flex-shrink-0" />
                              )}
                              {conversation.additional_attributes?.conversation_type === 'post' && (
                                <Badge
                                  variant="outline"
                                  className="hidden md:inline-flex h-4 px-1 text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700 flex-shrink-0"
                                  title="Facebook Post"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" />
                                  Post
                                </Badge>
                              )}
                              {pipelineInfo && (
                                <span
                                  className="hidden md:inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-full text-white flex-shrink-0 max-w-[120px]"
                                  style={{ backgroundColor: pipelineInfo.color }}
                                  title={pipelineInfo.title}
                                >
                                  <span className="truncate">{pipelineInfo.title}</span>
                                </span>
                              )}
                              {conversationLabels.map((label, i) => {
                                const title = label.title || label.name || '';
                                const color = label.color || '#1f93ff';
                                return (
                                  <span
                                    key={label.id || `label-${i}-${title}`}
                                    className="hidden md:inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-full text-white flex-shrink-0 max-w-[80px]"
                                    style={{ backgroundColor: color }}
                                    title={title}
                                  >
                                    <Tag className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                                    <span className="truncate">{title}</span>
                                  </span>
                                );
                              })}
                              <span
                                className={`text-[11px] flex-shrink-0 ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                                title={formatDetailedTime(conversation.timestamp)}
                              >
                                {formatConversationTime(conversation.timestamp)}
                              </span>
                            </div>

                            {/* LINE 2: direction + preview + (desktop: assignee) + priority + (desktop: days) + unread */}
                            <div className="flex items-center gap-1.5 min-w-0 text-[13px] md:text-xs text-muted-foreground">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                {renderDirectionIcon(conversation)}
                                <div className={`truncate min-w-0 ${hasUnread ? 'text-foreground font-medium' : ''}`}>
                                  {renderMessagePreview(conversation) || (
                                    <span className="italic">Sem mensagens</span>
                                  )}
                                </div>
                              </div>
                              {conversation?.assignee && (
                                <span
                                  className="hidden md:inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-full bg-primary/10 dark:bg-primary/20 text-primary max-w-[90px] flex-shrink-0"
                                  title={conversation.assignee.name}
                                >
                                  <UserIcon className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                                  <span className="truncate">{conversation.assignee.name}</span>
                                </span>
                              )}
                              {priorityIcon}
                              {pipelineInfo?.daysText && (
                                <span className="hidden md:inline text-[10px] whitespace-nowrap flex-shrink-0">
                                  {pipelineInfo.daysText}
                                </span>
                              )}
                              {hasUnread && (
                                <div className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>

                            {/* LINE 3: nome do estágio do pipeline embaixo do agente — pra saber em que etapa o lead está */}
                            {pipelineInfo && (
                              <div className="flex items-center gap-1.5 text-[12px] md:text-[11px] text-muted-foreground mt-0.5">
                                <span
                                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: pipelineInfo.color }}
                                  aria-hidden
                                />
                                <span className="truncate" title={`Estágio: ${pipelineInfo.title}${pipelineInfo.daysText ? ' • ' + pipelineInfo.daysText : ''}`}>
                                  Estágio: <span className="font-medium text-foreground/90">{pipelineInfo.title}</span>
                                  {pipelineInfo.daysText && (
                                    <span className="text-muted-foreground"> • {pipelineInfo.daysText}</span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* LINE 4 (mobile): assignee + 1 label compactos pra não perder informação (pipeline já vai na LINE 3) */}
                            {(conversation?.assignee || conversationLabels.length > 0) && (
                              <div className="flex md:hidden items-center gap-1 min-w-0 mt-0.5 overflow-hidden">
                                {conversation?.assignee && (
                                  <span
                                    className="inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex-shrink min-w-0 max-w-[100px]"
                                    title={conversation.assignee.name}
                                  >
                                    <UserIcon className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                                    <span className="truncate">{conversation.assignee.name}</span>
                                  </span>
                                )}
                                {conversationLabels.map((label, i) => {
                                  const title = label.title || label.name || '';
                                  const color = label.color || '#1f93ff';
                                  return (
                                    <span
                                      key={`m-${label.id || `label-${i}-${title}`}`}
                                      className="inline-flex items-center h-4 px-1.5 text-[10px] font-medium rounded-full text-white flex-shrink min-w-0 max-w-[80px]"
                                      style={{ backgroundColor: color }}
                                      title={title}
                                    >
                                      <Tag className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                                      <span className="truncate">{title}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Tags do contato (só desktop — em mobile já temos densidade demais) */}
                            {conversation.contact?.labels && conversation.contact.labels.length > 0 && (
                              <div className="hidden md:block">
                                <ContactTagsList
                                  labels={conversation.contact.labels}
                                  maxVisible={3}
                                  size="sm"
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>,
              );
            })}

            {isLoadingMoreConversations && (
              <div className="border-t border-border/40">
                <ConversationSkeleton count={1} />
              </div>
            )}

            {!isLoadingMoreConversations && hasNextPage && (
              <div className="p-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-11 md:h-9"
                  onClick={handleLoadMoreClick}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conversations Filter Modal */}
      <ConversationsFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={conversationFilters}
        onFiltersChange={setConversationFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
};

export default ChatSidebar;


