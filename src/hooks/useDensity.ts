import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tipo de densidade visual da lista de conversas.
 * - 'comfortable': padding maior (default)
 * - 'compact':     padding reduzido para caber mais conversas no viewport
 */
export type ChatDensity = 'compact' | 'comfortable';

const STORAGE_KEY = 'chat:density';
const DEFAULT_DENSITY: ChatDensity = 'comfortable';

const isValidDensity = (value: unknown): value is ChatDensity =>
  value === 'compact' || value === 'comfortable';

const readInitialDensity = (): ChatDensity => {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidDensity(stored)) return stored;
  } catch {
    // localStorage indisponível (SSR / privacy mode) — cai pro default
  }
  return DEFAULT_DENSITY;
};

/**
 * Hook que persiste a preferência de densidade visual da lista de conversas
 * em `localStorage['chat:density']`. SSR-safe: durante render no servidor
 * retorna o default e só sincroniza com o localStorage no client.
 */
export function useDensity(): [ChatDensity, (next: ChatDensity) => void] {
  const [density, setDensityState] = useState<ChatDensity>(readInitialDensity);
  // Espelha o valor atual do estado para o handler de `storage`. Sem isso, um
  // evento que ecoa nossa própria escrita (alguns browsers/extensões disparam
  // mesmo na aba de origem em condições de race) dispararia um setState
  // redundante e poderia introduzir flicker.
  const currentRef = useRef<ChatDensity>(density);

  // Garante que mudanças cross-tab sejam refletidas (Storage event)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      // Echo guard: ignora eventos que apenas confirmam o valor que já temos.
      if (event.newValue === currentRef.current) return;
      if (isValidDensity(event.newValue)) {
        currentRef.current = event.newValue;
        setDensityState(event.newValue);
      } else if (event.newValue === null) {
        currentRef.current = DEFAULT_DENSITY;
        setDensityState(DEFAULT_DENSITY);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setDensity = useCallback((next: ChatDensity) => {
    if (!isValidDensity(next)) return;
    // Atualiza o ref ANTES do setItem para que o `storage` event subsequente
    // (se houver eco) seja descartado pelo guard acima.
    currentRef.current = next;
    setDensityState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore quota / unavailable
    }
  }, []);

  return [density, setDensity];
}
