/**
 * Pílula com o status atual da conversa (Aberta/Pendente/Resolvida/Pausada).
 *
 * Estilo visual replica o badge "Aberto" da tela de pipelines (PipelineKanban.tsx):
 *   text-[10px] px-1.5 py-0.5 rounded-full font-medium + cor semântica.
 *
 * Cores seguem a especificação do produto para a lista de conversas:
 *   - open      → verde claro / texto verde escuro
 *   - pending   → amarelo claro / texto amarelo escuro
 *   - resolved  → cinza claro / texto cinza escuro
 *   - snoozed   → roxo claro / texto roxo escuro (preserva a paleta usada
 *                  no indicador de "adiada" antes deste badge)
 */

interface ConversationStatusBadgeProps {
  status: string | undefined | null;
  /** Esconde o badge se o status for desconhecido. Útil quando o card já
   *  tem outros indicadores e não queremos um "Desconhecido" piscando. */
  hideUnknown?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  open: {
    label: 'Aberta',
    classes:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  pending: {
    label: 'Pendente',
    classes:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  resolved: {
    label: 'Resolvida',
    classes:
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  snoozed: {
    label: 'Adiada',
    classes:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

const ConversationStatusBadge = ({
  status,
  hideUnknown = false,
  className = '',
}: ConversationStatusBadgeProps) => {
  const cfg = status ? STATUS_STYLES[status] : undefined;
  if (!cfg) {
    if (hideUnknown) return null;
    return (
      <span
        className={[
          'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
          'bg-muted text-muted-foreground',
          className,
        ].join(' ')}
        title={status || 'Status desconhecido'}
      >
        {status || '—'}
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
        cfg.classes,
        className,
      ].join(' ')}
      title={cfg.label}
    >
      {cfg.label}
    </span>
  );
};

export default ConversationStatusBadge;
