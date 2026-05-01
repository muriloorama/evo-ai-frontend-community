import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@evoapi/design-system/button';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyStateArt from './EmptyStateArt';

interface NoConversationsProps {
  onCreateNew?: () => void;
  searchTerm?: string;
}

const NoConversations: React.FC<NoConversationsProps> = ({ onCreateNew, searchTerm }) => {
  const { t } = useLanguage('chat');
  const isSearchResult = Boolean(searchTerm && searchTerm.trim().length > 0);

  return (
    <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
      <EmptyStateArt
        kind={isSearchResult ? 'search-empty' : 'no-conversations'}
        size={140}
        className="mb-5"
      />

      <h3 className="text-base md:text-lg font-semibold tracking-tight mb-1.5">
        {isSearchResult
          ? t('emptyStates.noConversations.title.search')
          : t('emptyStates.noConversations.title.default')}
      </h3>

      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        {isSearchResult
          ? t('emptyStates.noConversations.description.search', { searchTerm: searchTerm || '' })
          : t('emptyStates.noConversations.description.default')}
      </p>

      {!isSearchResult && onCreateNew && (
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('emptyStates.noConversations.createNew')}
        </Button>
      )}
    </div>
  );
};

export default NoConversations;
