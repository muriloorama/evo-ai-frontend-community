import { Button } from '@evoapi/design-system/button';
import { Badge } from '@evoapi/design-system/badge';
import {
  ArrowLeft,
  X,
  MessageCircle,
  CheckCircle,
  Clock,
  Pause,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  Trash2,
  Mail,
  MailOpen,
  Inbox,
  Pin,
  Archive,
  IdCard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@evoapi/design-system/dropdown-menu';
import { Conversation } from '@/types/chat/api';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { getStatusLabel, isPendingStatus } from '@/utils/chat/conversationStatus';
import { useLanguage } from '@/hooks/useLanguage';

interface ChatHeaderProps {
  conversation: Conversation;
  onBackClick: () => void;
  onCloseConversation: () => void;
  onContactSidebarOpen: () => void;
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
  unreadCount: number;
}

const ChatHeader = ({
  conversation,
  onBackClick,
  onCloseConversation,
  onContactSidebarOpen,
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
  unreadCount,
}: ChatHeaderProps) => {
  const { t } = useLanguage('chat');
  const currentStatus = conversation.status;
  const hasUnreadMessages = unreadCount > 0;
  const isPinned = Boolean(conversation.custom_attributes?.pinned);
  const isArchived = Boolean(conversation.custom_attributes?.archived);

  const inboxName = conversation.inbox?.name || '';
  const inboxPhone = (conversation.inbox as { phone_number?: string } | undefined)?.phone_number;
  const inboxDisplay = inboxPhone ? `${inboxName} (${inboxPhone})` : inboxName;

  const renderConversationStatusDropdown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 md:h-8 md:w-8 p-0"
            aria-label="Mais ações"
          >
            <MoreVertical className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Read/Unread Actions */}
          {hasUnreadMessages ? (
            <DropdownMenuItem
              onClick={() => onMarkAsRead(conversation)}
              className="flex items-center gap-2"
            >
              <MailOpen className="h-4 w-4" />
              {t('chatHeader.actions.markAsRead')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onMarkAsUnread(conversation)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t('chatHeader.actions.markAsUnread')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Status Actions */}
          {currentStatus !== 'open' && (
            <DropdownMenuItem
              onClick={() => onMarkAsOpen(conversation)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsOpen')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'resolved' && (
            <DropdownMenuItem
              onClick={() => onMarkAsResolved(conversation)}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsResolved')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'pending' && (
            <DropdownMenuItem
              onClick={() => onPostpone(conversation)}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t('chatHeader.actions.markAsPending')}
            </DropdownMenuItem>
          )}

          {currentStatus !== 'snoozed' && (
            <DropdownMenuItem
              onClick={() => onMarkAsSnoozed(conversation)}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              {t('chatHeader.actions.pauseConversation')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Priority Actions */}
          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'urgent')}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {t('chatHeader.actions.priorityUrgent')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'high')}
            className="flex items-center gap-2"
          >
            <ArrowUp className="h-4 w-4 text-orange-600" />
            {t('chatHeader.actions.priorityHigh')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'medium')}
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4 text-blue-600" />
            {t('chatHeader.actions.priorityMedium')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onSetPriority(conversation, 'low')}
            className="flex items-center gap-2"
          >
            <ArrowDown className="h-4 w-4 text-gray-600" />
            {t('chatHeader.actions.priorityLow')}
          </DropdownMenuItem>

          {conversation.priority && (
            <DropdownMenuItem
              onClick={() => onSetPriority(conversation, null)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('chatHeader.actions.removePriority')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              isPinned ? onUnpinConversation(conversation) : onPinConversation(conversation)
            }
            className="flex items-center gap-2"
          >
            <Pin className="h-4 w-4" />
            {isPinned
              ? t('chatHeader.actions.unpinConversation')
              : t('chatHeader.actions.pinConversation')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              isArchived
                ? onUnarchiveConversation(conversation)
                : onArchiveConversation(conversation)
            }
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {isArchived
              ? t('chatHeader.actions.unarchiveConversation')
              : t('chatHeader.actions.archiveConversation')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onAssignAgent(conversation)}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4" />
            {t('chatHeader.actions.assignAgent')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTeam(conversation)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {t('chatHeader.actions.assignTeam')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onAssignTag(conversation)}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            {t('chatHeader.actions.assignTag')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onDeleteConversation(conversation)}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('chatHeader.actions.deleteConversation')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      className="flex-shrink-0 px-2 py-2 md:p-4 border-b bg-background/95 backdrop-blur-sm"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {/* Back button for mobile (área de toque maior) */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0 -ml-1 flex-shrink-0"
            onClick={onBackClick}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all rounded-full flex-shrink-0"
            onClick={onContactSidebarOpen}
          >
            <ContactAvatar contact={conversation.contact} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">
              {conversation.contact?.name || t('chatHeader.contactNoName')}
            </h3>
            <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
              {/* Inbox name escondido no mobile pra economizar espaço */}
              {inboxName && (
                <>
                  <span className="hidden md:inline truncate">{inboxDisplay}</span>
                  <span className="hidden md:inline">•</span>
                </>
              )}
              {isPendingStatus(conversation.status) ? (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[11px] font-medium bg-warning/10 text-warning border-warning/20"
                >
                  {getStatusLabel(conversation.status)}
                </Badge>
              ) : (
                <span className="truncate">{getStatusLabel(conversation.status)}</span>
              )}
              {/* Pipeline stages: limitar exibição no mobile */}
              {conversation.pipelines?.flatMap((pipeline) =>
                pipeline.stages.map((stage) => (
                  <span
                    key={`${pipeline.id}-${stage.id}`}
                    className="hidden md:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: stage.color ? `${stage.color}1A` : 'rgb(var(--muted))',
                      color: stage.color || 'inherit',
                      border: stage.color ? `1px solid ${stage.color}` : undefined,
                    }}
                    title={pipeline.name}
                  >
                    {stage.name}
                  </span>
                )),
              )}
            </div>
          </div>
        </div>
        {/* Ações do chat */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Botão "Abrir Conversa" — visível só quando status === 'pending'.
              Usa o handler onMarkAsOpen (mesmo do dropdown) para mover a
              conversa de pending → open. Variante default (preenchido) para
              chamar atenção, à esquerda do botão "Contato". */}
          {isPendingStatus(conversation.status) && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onMarkAsOpen(conversation)}
              className="flex items-center gap-2 h-10 md:h-8 w-10 md:w-auto md:px-3 p-0 md:p-2 transition-all duration-200"
              title={t('chatHeader.openConversation')}
              aria-label={t('chatHeader.openConversation')}
            >
              <Inbox className="h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline">{t('chatHeader.openConversation')}</span>
            </Button>
          )}

          {/* Botão Contato: abre o sidebar com info do contato (renomear, atributos, pipeline, etc) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onContactSidebarOpen}
            className="flex items-center justify-center gap-1.5 h-10 w-10 md:h-8 md:w-auto md:px-2.5 p-0 md:p-2 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            title="Abrir detalhes do contato"
            aria-label="Abrir detalhes do contato"
          >
            <IdCard className="h-5 w-5 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">Contato</span>
          </Button>

          {/* Dropdown de ações da conversa */}
          {renderConversationStatusDropdown()}

          {/* Botão fechar conversa — escondido no mobile (já tem o back button) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseConversation}
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
            aria-label={t('chatHeader.closeConversation')}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('chatHeader.closeConversation')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
