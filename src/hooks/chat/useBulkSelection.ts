import { useCallback, useMemo, useState } from 'react';

/**
 * useBulkSelection — gerencia o "modo seleção" da lista de conversas:
 * o usuário entra no modo (mostra checkboxes), marca itens, e a UI exibe
 * uma toolbar com ações em massa enquanto há ao menos um selecionado.
 *
 * O hook não conhece nada de Conversation — opera sobre IDs string.
 * Quem renderiza a lista converte conversation.id para string e chama
 * `toggle`/`isSelected`/`selectAll`. A intenção é manter o hook reutilizável
 * caso a tela de contatos queira o mesmo padrão depois.
 */
export interface UseBulkSelectionResult {
  selectionMode: boolean;
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  enterMode: () => void;
  exitMode: () => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export function useBulkSelection(): UseBulkSelectionResult {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const enterMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const exitMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return useMemo(
    () => ({
      selectionMode,
      selectedIds,
      selectedCount: selectedIds.size,
      enterMode,
      exitMode,
      toggle,
      selectAll,
      clear,
      isSelected,
    }),
    [selectionMode, selectedIds, enterMode, exitMode, toggle, selectAll, clear, isSelected],
  );
}
