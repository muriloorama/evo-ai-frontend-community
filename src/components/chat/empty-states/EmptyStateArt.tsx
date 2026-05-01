/**
 * Mini-ilustrações geométricas pros empty states do chat.
 *
 * Direção visual (alinhada ao skill frontend-design da Anthropic):
 *  - Stroke-only / monocromáticas — usam currentColor + text-primary pra
 *    integrar ao tema (light/dark, troca de paleta).
 *  - Sem ícones genéricos do Lucide. Cada cena é uma composição de formas
 *    simples mas reconhecível: bolhas concêntricas pra "conversa" ausente,
 *    cartões empilhados pra "escolha um", balão pontilhado pra "pronto pra
 *    começar", retângulos com diagonal pra "sem mídia".
 *  - Tamanho default 144x144 — generoso o suficiente pra ter presença
 *    sem dominar a tela.
 */

type EmptyStateArtKind =
  | 'no-conversations'
  | 'search-empty'
  | 'no-messages'
  | 'no-chat-selected'
  | 'no-media';

interface EmptyStateArtProps {
  kind: EmptyStateArtKind;
  size?: number;
  className?: string;
}

const EmptyStateArt = ({ kind, size = 144, className = '' }: EmptyStateArtProps) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 144 144',
    fill: 'none',
    'aria-hidden': true,
    className: `text-primary/70 ${className}`,
  } as const;

  switch (kind) {
    case 'no-conversations':
      // Bolhas concêntricas — eco silencioso de conversa
      return (
        <svg {...common}>
          <circle
            cx="72"
            cy="72"
            r="52"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeDasharray="2 6"
            opacity="0.35"
          />
          <circle
            cx="72"
            cy="72"
            r="36"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.55"
          />
          <path
            d="M48 64h36a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H62l-10 8v-8h-4a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="58" cy="78" r="1.75" fill="currentColor" />
          <circle cx="68" cy="78" r="1.75" fill="currentColor" />
          <circle cx="78" cy="78" r="1.75" fill="currentColor" />
        </svg>
      );

    case 'search-empty':
      // Lupa cruzada com linha — "não encontramos"
      return (
        <svg {...common}>
          <circle
            cx="62"
            cy="62"
            r="48"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.3"
          />
          <circle
            cx="62"
            cy="62"
            r="22"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="78"
            y1="78"
            x2="100"
            y2="100"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="62"
            x2="74"
            y2="62"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      );

    case 'no-messages':
      // Balão de fala vazio + cursor pulsando — pronto pra escrever
      return (
        <svg {...common}>
          <path
            d="M40 50h64a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H78l-12 12v-12H40a8 8 0 0 1-8-8V58a8 8 0 0 1 8-8z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <line
            x1="68"
            y1="62"
            x2="68"
            y2="78"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <animate
              attributeName="opacity"
              values="1;0.15;1"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      );

    case 'no-chat-selected':
      // 3 cartões empilhados em diagonal — escolha um
      return (
        <svg {...common}>
          <rect
            x="36"
            y="44"
            width="64"
            height="44"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.25"
            opacity="0.35"
            transform="rotate(-6 68 66)"
          />
          <rect
            x="40"
            y="52"
            width="64"
            height="44"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <rect
            x="44"
            y="60"
            width="64"
            height="44"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.75"
            transform="rotate(4 76 82)"
          />
          <line
            x1="56"
            y1="74"
            x2="92"
            y2="74"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            transform="rotate(4 76 82)"
            opacity="0.7"
          />
          <line
            x1="56"
            y1="82"
            x2="80"
            y2="82"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            transform="rotate(4 76 82)"
            opacity="0.4"
          />
        </svg>
      );

    case 'no-media':
      // Frames de imagem empilhados, vazios — galeria sem conteúdo
      return (
        <svg {...common}>
          <rect
            x="32"
            y="40"
            width="40"
            height="40"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.45"
          />
          <rect
            x="56"
            y="56"
            width="40"
            height="40"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <rect
            x="80"
            y="72"
            width="40"
            height="40"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <line
            x1="80"
            y1="72"
            x2="120"
            y2="112"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.25"
          />
        </svg>
      );

    default:
      return null;
  }
};

export type { EmptyStateArtKind };
export default EmptyStateArt;
