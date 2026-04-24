import { Button, Card, CardContent } from '@evoapi/design-system';
import { Settings, Trash2, Phone } from 'lucide-react';
import { Inbox } from '@/types/channels/inbox';
import ChannelIcon from './ChannelIcon';
import { getChannelDisplayName } from '@/utils/channelUtils';
import { useLanguage } from '@/hooks/useLanguage';

type ChannelCardProps = {
  inbox: Inbox;
  isDeleting?: string | null;
  onSettings: (inbox: Inbox) => void;
  onDelete: (inbox: Inbox) => void;
};

export default function ChannelCard({ inbox, isDeleting, onSettings, onDelete }: ChannelCardProps) {
  const { t } = useLanguage('channels');

  return (
    <Card className="group relative bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with icon, name and type */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex-shrink-0">
            <ChannelIcon
              channelType={inbox.channel_type}
              provider={inbox.provider as string | undefined}
              size="lg"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-sidebar-foreground">
              {inbox.name}
            </h3>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {inbox.channel_type ? getChannelDisplayName(inbox.channel_type, inbox.provider) : '—'}
            </p>
            {inbox.phone_number && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                <Phone className="w-3 h-3 text-green-700 dark:text-green-400" />
                <span className="text-xs font-mono font-semibold text-green-800 dark:text-green-300">
                  {inbox.phone_number}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="px-4 py-3 text-xs text-sidebar-foreground/70 space-y-1">
          {inbox.display_name && (
            <div className="flex items-center justify-between">
              <span>{t('card.displayName')}</span>
              <span className="font-medium text-sidebar-foreground">{inbox.display_name}</span>
            </div>
          )}
          {inbox.phone_number && (
            <div className="flex items-center justify-between">
              <span>{t('card.phoneNumber')}</span>
              <span className="font-mono text-sidebar-foreground">{inbox.phone_number}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>{t('card.channelId')}</span>
            <span className="font-mono">{inbox.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('card.type')}</span>
            <span className="font-mono">
              {inbox.channel_type
                ? getChannelDisplayName(inbox.channel_type, inbox.provider)
                : t('common.notAvailable')}
            </span>
          </div>
        </div>

        {/* Action buttons - hover effect like other cards */}
        <div className="flex border-t border-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={() => onSettings(inbox)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('actions.configure')}
          </Button>
          <div className="w-px bg-sidebar-border" />
          <Button
            variant="ghost"
            className="rounded-none h-12 px-4 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            disabled={isDeleting === inbox.id}
            onClick={() => onDelete(inbox)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
