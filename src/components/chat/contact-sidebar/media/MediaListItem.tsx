import { colorFromTitle, initialFromTitle } from './utils';

interface MediaListItemProps {
  /** URL final pra abrir no click. */
  href: string;
  /** Título em bold (nome do arquivo OU domínio do link). */
  title: string;
  /** URL ou identificador secundário em azul, truncado. */
  subtitleAzul: string;
  /** Trecho da mensagem onde apareceu — pode estar vazio. */
  excerpt?: string;
  /** Thumbnail opcional. Se ausente, renderiza quadrado colorido com inicial. */
  thumbUrl?: string | null;
  /** Pra cor derivada quando não há thumb (default = title). */
  colorSeed?: string;
}

const MediaListItem = ({
  href,
  title,
  subtitleAzul,
  excerpt,
  thumbUrl,
  colorSeed,
}: MediaListItemProps) => {
  const seed = colorSeed ?? title;
  const bgClass = colorFromTitle(seed);
  const initial = initialFromTitle(seed);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex items-start gap-3 px-4 py-3 border-b border-border/40
        hover:bg-accent/30 active:bg-accent/50 transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-inset
      "
    >
      {/* Thumb 48x48 */}
      <div
        className={[
          'shrink-0 h-12 w-12 rounded-md overflow-hidden flex items-center justify-center',
          thumbUrl ? 'bg-muted' : `${bgClass} text-white`,
        ].join(' ')}
        aria-hidden="true"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-base font-semibold leading-none">{initial}</span>
        )}
      </div>

      {/* Texto */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        {excerpt ? (
          <p className="text-xs text-muted-foreground line-clamp-3 mt-0.5">{excerpt}</p>
        ) : null}
        <p className="text-xs text-primary truncate mt-0.5" title={subtitleAzul}>
          {subtitleAzul}
        </p>
      </div>
    </a>
  );
};

export default MediaListItem;
