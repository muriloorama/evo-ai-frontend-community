import { useEffect, useRef, type RefObject } from 'react';
import { Conversation } from '@/types/chat/api';

interface UseConversationKeyboardNavOptions<T extends Conversation> {
  /** Lista de conversas visíveis (já filtradas/ordenadas). */
  conversations: T[];
  /** Callback chamado ao pressionar Enter sobre o item focado. */
  onSelect: (conversation: T) => void;
  /** Ref do <input> de busca da sidebar — alvo do atalho Ctrl+K / ⌘K. */
  searchInputRef: RefObject<HTMLInputElement | null>;
  /** ID da conversa atualmente selecionada (usado pra sincronizar foco inicial). */
  selectedConversationId?: string | null;
  /**
   * Habilita ou desabilita a captura de teclado. Default `true`.
   * Use `false` quando o componente que monta o hook está oculto (ex: sidebar
   * escondido em viewport mobile durante a visualização do chat) ou enquanto
   * modais nativos cobrem a UI.
   */
  enabled?: boolean;
}

// Helper para escapar valores antes de injetar em seletores CSS. Em browsers
// modernos usamos a API nativa; quando indisponível (jsdom antigo, alguns
// runtimes embarcados), aplicamos um fallback conservador escapando qualquer
// caractere fora de `[\w-]`.
const safeEscape = (value: string): string => {
  if (typeof window !== 'undefined' && typeof window.CSS?.escape === 'function') {
    return window.CSS.escape(value);
  }
  return value.replace(/[^\w-]/g, '\\$&');
};

/**
 * Detecta plataforma macOS de forma robusta. `navigator.platform` é deprecated
 * mas ainda funciona como fallback; `userAgentData.platform` é o caminho
 * preferido em Chromium moderno; `userAgent` cobre Safari/Firefox em Mac.
 *
 * Exportado para que ChatSidebar (e outros consumidores) possam compartilhar
 * a mesma detecção que o hook usa internamente, evitando duplicação.
 */
export const detectIsMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const navWithUaData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  if (navWithUaData.userAgentData?.platform === 'macOS') return true;
  if (/Mac/i.test(navigator.platform || '')) return true;
  if (/Mac/i.test(navigator.userAgent || '')) return true;
  return false;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // ARIA role="textbox" cobre componentes ricos (rich-text editors, comboboxes
  // de busca custom) que não usam <input>/<textarea>.
  if (typeof target.matches === 'function' && target.matches('[role="textbox"]')) return true;
  return false;
};

const isModalOpen = (): boolean => {
  if (typeof document === 'undefined') return false;
  // Cobre Radix dialogs (data-state=open), <dialog> nativo (open) e qualquer
  // outro overlay que se anuncia via aria-modal=true.
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], dialog[open], [aria-modal="true"]',
    ),
  );
};

/**
 * Hook global de navegação por teclado para a lista de conversas.
 *
 * - `Ctrl+K` / `⌘K`: foca o input de busca e seleciona o texto existente.
 * - `↓` / `↑`:        move o foco visual entre os itens (quando o foco está fora
 *                     de inputs/textareas).
 * - `Enter`:          dispara `onSelect` na conversa atualmente focada.
 *
 * Os items da lista devem ter o atributo `data-conversation-id` no DOM para que
 * o hook consiga localizá-los e mover foco corretamente.
 */
export function useConversationKeyboardNav<T extends Conversation>(
  options: UseConversationKeyboardNavOptions<T>,
): { focusedId: string | null } {
  const { conversations, onSelect, searchInputRef, selectedConversationId, enabled = true } = options;

  const focusedIdRef = useRef<string | null>(selectedConversationId ?? null);

  // Mantém uma cópia atualizada da lista de conversas em ref. Lemos dela dentro
  // do handler global para evitar reanexar o listener a cada websocket/poll.
  const conversationsRef = useRef<T[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Mantém foco em sincronia com a conversa selecionada (clique externo, deeplink, etc).
  // Quando a seleção é limpa (null/undefined), também limpamos o foco — caso
  // contrário o ref ficaria apontando pra uma conversa que não existe mais na
  // visão ativa, gerando Enters mortos.
  useEffect(() => {
    if (selectedConversationId) {
      focusedIdRef.current = selectedConversationId;
    } else {
      focusedIdRef.current = null;
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const findIndex = (id: string | null): number => {
      if (!id) return -1;
      return conversationsRef.current.findIndex(c => String(c.id) === String(id));
    };

    const focusItem = (index: number) => {
      const list = conversationsRef.current;
      const conv = list[index];
      if (!conv) return;
      focusedIdRef.current = String(conv.id);
      const el = document.querySelector<HTMLElement>(
        `[data-conversation-id="${safeEscape(String(conv.id))}"]`,
      );
      if (el) {
        el.focus({ preventScroll: false });
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isModalOpen()) return;

      // Ctrl+K / ⌘K — foco na busca.
      // No Windows, AltGr (RightAlt) seta `ctrlKey=true` e produz dead keys; se
      // não excluirmos `altKey`, capturamos por engano e bloqueamos a digitação.
      // No Mac usamos metaKey (cmd), então a checagem de altKey é igualmente
      // segura ali.
      const isMeta = (event.ctrlKey || event.metaKey) && !event.altKey;
      if (isMeta && event.key.toLowerCase() === 'k') {
        const input = searchInputRef.current;
        // Só intercepta o atalho se realmente vamos focar algo — caso contrário
        // deixa o navegador/extension fazer o que normalmente faria.
        if (input) {
          event.preventDefault();
          input.focus();
          // seleciona texto atual para overwrite rápido
          try { input.select(); } catch { /* noop */ }
        }
        return;
      }

      // Os atalhos abaixo só rodam quando o foco está fora de inputs/textareas
      if (isEditableTarget(event.target)) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Shift preserva a expansão de seleção nativa do navegador (em listas
        // selecionáveis e em rich-text); Alt cobre back-nav em alguns OSes.
        if (event.shiftKey || event.altKey) return;
        const list = conversationsRef.current;
        if (list.length === 0) return;
        event.preventDefault();
        const currentIndex = findIndex(focusedIdRef.current);
        let nextIndex: number;
        if (currentIndex === -1) {
          nextIndex = event.key === 'ArrowDown' ? 0 : list.length - 1;
        } else if (event.key === 'ArrowDown') {
          nextIndex = Math.min(currentIndex + 1, list.length - 1);
        } else {
          nextIndex = Math.max(currentIndex - 1, 0);
        }
        focusItem(nextIndex);
        return;
      }

      if (event.key === 'Enter') {
        const list = conversationsRef.current;
        const idx = findIndex(focusedIdRef.current);
        if (idx === -1) {
          // A id que tínhamos não existe mais nessa visão (filtro mudou,
          // conversa foi arquivada, etc). Limpa o ref pra que próximos Enters
          // não tentem reabrir nada até o usuário focar algo de novo.
          focusedIdRef.current = null;
          return;
        }
        const conv = list[idx];
        if (!conv) {
          focusedIdRef.current = null;
          return;
        }
        event.preventDefault();
        onSelect(conv);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // `conversations` ficou DE FORA da dep array de propósito: lemos da ref
    // pra evitar listener churn a cada update da lista.
  }, [onSelect, searchInputRef, enabled]);

  return { focusedId: focusedIdRef.current };
}
