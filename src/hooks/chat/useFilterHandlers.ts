import { useCallback } from 'react';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { BaseFilter } from '@/types/core';
import { convertBaseFiltersToConversationFilters } from '@/utils/chat/filterAdapters';
import { saveConversationFilters, clearConversationFilters } from '@/utils/storage/filtersStorage';

export const useFilterHandlers = () => {
  const { conversations, filters } = useChatContext();

  const handleApplyFilters = useCallback(
    async (newFilters: BaseFilter[]) => {
      // Converter BaseFilter para ConversationFilter e aplicar
      const apiFilters = convertBaseFiltersToConversationFilters(newFilters);

      return new Promise<void>((resolve, reject) => {
        filters.applyFilters(
          apiFilters,
          (conversationsResult, pagination) => {
            // Atualizar o estado das conversas com os resultados do filtro
            conversations.setConversations(conversationsResult, pagination);

            // 💾 PERSISTIR: Salvar filtros aplicados no localStorage
            saveConversationFilters(newFilters);
            resolve();
          },
          error => {
            // Erro - mostrar mensagem e rejeitar promise
            console.error('❌ Erro ao aplicar filtros:', error);
            reject(error);
          },
        );
      });
    },
    [filters, conversations],
  );

  const handleClearFilters = useCallback(async () => {
    try {
      // 🗑️ LIMPAR: Remover filtros salvos do localStorage
      clearConversationFilters();

      // applyFilters([]) faz duas coisas críticas pra que o chip de filtro
      // realmente desapareça quando o usuário clica no ✕:
      //   1. dispatcha SET_ACTIVE_FILTERS = [] no contexto, então o chip
      //      derivado de filters.state.activeFilters é desmontado.
      //   2. chama getConversations() SEM status, mostrando todas as conversas
      //      (o que o usuário espera quando remove o filtro "Status: Aberta").
      // Antes este handler chamava loadConversations({ status: 'open' }), que
      // não tocava no estado do contexto — então o chip voltava por causa do
      // useEffect de sincronização e a lista filtrava só "open" de novo.
      await new Promise<void>((resolve, reject) => {
        filters.applyFilters(
          [],
          (conversationsResult, pagination) => {
            conversations.setConversations(conversationsResult, pagination);
            resolve();
          },
          error => {
            console.error('❌ Erro ao limpar filtros:', error);
            reject(error instanceof Error ? error : new Error(String(error)));
          },
        );
      });
    } catch (error) {
      console.error('❌ Erro inesperado ao limpar filtros:', error);
    }
  }, [filters, conversations]);

  // 🔄 FUNÇÃO PARA RECARREGAR FILTROS: Reaplicar filtros atuais após mudanças
  const reloadCurrentFilters = useCallback(async () => {
    try {
      // Se há filtros ativos, reaplicar
      if (filters.state.activeFilters.length > 0) {
        await filters.applyFilters(
          filters.state.activeFilters,
          (conversationsResult, pagination) => {
            conversations.setConversations(conversationsResult, pagination);
          },
          error => {
            console.error('❌ Erro ao recarregar filtros:', error);
          },
        );
      }
      // Se há busca ativa, reaplicar busca
      else if (filters.state.searchTerm.trim().length > 0) {
        await filters.applySearch(
          filters.state.searchTerm,
          (conversationsResult, pagination) => {
            conversations.setConversations(conversationsResult, pagination);
          },
          error => {
            console.error('❌ Erro ao recarregar busca:', error);
          },
        );
      }
      // 🎯 FILTRO PADRÃO: Se não há filtros nem busca, carregar apenas conversas abertas
      else {
        await conversations.loadConversations({ status: 'open' });
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao recarregar filtros:', error);
    }
  }, [filters, conversations]);

  return {
    handleApplyFilters,
    handleClearFilters,
    reloadCurrentFilters,
  };
};
