import { useLanguage } from '@/hooks/useLanguage';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@evoapi/design-system';
import { Edit, Trash2, MoreVertical, User, GripVertical } from 'lucide-react';
import { PipelineItem, Pipeline, PipelineStage } from '@/types/analytics';

interface PipelineItemCardProps {
  item: PipelineItem;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  onView?: (item: PipelineItem) => void;
  onEdit?: (item: PipelineItem) => void;
  onRemove?: (item: PipelineItem) => void;
  showDragHandle?: boolean;
  showActions?: boolean;
}

const getContactColor = (name?: string) => {
  if (!name) return '#6B7280';
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A855F7',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function PipelineItemCard({
  item,
  onView,
  onEdit,
  onRemove,
  showDragHandle = false,
  showActions = true,
}: PipelineItemCardProps) {
  const { t } = useLanguage('pipelines');

  return (
    <div
      className="group bg-background rounded-xl p-3 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer select-none relative"
      onClick={() => onView?.(item)}
    >
      {/* Card Options Menu */}
      {showActions && (onEdit || onRemove) && (
        <div
          className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 hover:bg-muted"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('kanban.item.editItem')}
                  </DropdownMenuItem>
                )}
                {onEdit && onRemove && <DropdownMenuSeparator />}
                {onRemove && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('kanban.item.removeFromPipeline')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {showDragHandle && (
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      )}

      {/* Contact Info Header — avatar + nome (simples) */}
      <div className="flex items-center gap-2.5 mb-2">
        {item.contact?.avatar_url ? (
          <img
            src={item.contact.avatar_url}
            alt={item.contact?.name || ''}
            className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
            style={{ backgroundColor: getContactColor(item.contact?.name) }}
          >
            {item.contact?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <h4 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
          {item.contact?.name || t('kanban.item.unknownUser', 'Usuário Desconhecido')}
        </h4>
      </div>

      {/* Time and assignee info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-muted-foreground">
          <div className="w-3 h-3">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span>
            {item.conversation?.last_activity_at
              ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
              : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Assignee */}
        {item.conversation?.assignee && (
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            {item.conversation.assignee.avatar_url ? (
              <img
                src={item.conversation.assignee.avatar_url}
                alt={item.conversation.assignee.name || ''}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User className="w-3 h-3" />
            )}
            <span className="truncate max-w-20">
              {item.conversation.assignee.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

