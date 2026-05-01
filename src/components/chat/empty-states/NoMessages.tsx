import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyStateArt from './EmptyStateArt';

const NoMessages: React.FC = () => {
  const { t } = useLanguage('chat');

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center min-h-0">
      <EmptyStateArt kind="no-messages" size={148} className="mb-5" />

      <h3 className="text-base md:text-lg font-semibold tracking-tight mb-1.5">
        {t('emptyStates.noMessages.title')}
      </h3>

      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {t('emptyStates.noMessages.description')}
      </p>

      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
        {t('emptyStates.noMessages.hint')}
      </p>
    </div>
  );
};

export default NoMessages;
