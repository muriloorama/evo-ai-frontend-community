import { Images, FileIcon, Link2 } from 'lucide-react';

export type MediaSummaryKind = 'photos' | 'files' | 'links';

interface MediaSummaryProps {
  photoCount: number;
  fileCount: number;
  linkCount: number;
  onSelect: (kind: MediaSummaryKind) => void;
}

interface RowProps {
  icon: React.ReactNode;
  count: number;
  /** Texto pra contagem 1. */
  singular: string;
  /** Texto pra contagem != 1. */
  plural: string;
  ariaLabel: string;
  onClick?: () => void;
}

const SummaryRow = ({ icon, count, singular, plural, ariaLabel, onClick }: RowProps) => {
  const disabled = count === 0;
  const label = count === 1 ? singular : plural;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={[
        'flex items-center gap-3 w-full text-left rounded-md py-1.5 -mx-1 px-1',
        'transition-colors',
        disabled
          ? 'text-muted-foreground/60 cursor-not-allowed'
          : 'text-foreground hover:bg-accent/40 active:bg-accent/60 cursor-pointer',
      ].join(' ')}
    >
      <span
        className={`shrink-0 ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-sm leading-tight">
        <span
          className={`font-semibold ${disabled ? 'text-muted-foreground/60' : 'text-primary'}`}
        >
          {count}
        </span>{' '}
        <span className={disabled ? 'text-muted-foreground/60' : 'text-foreground'}>
          {label}
        </span>
      </span>
    </button>
  );
};

const MediaSummary = ({ photoCount, fileCount, linkCount, onSelect }: MediaSummaryProps) => {
  const total = photoCount + fileCount + linkCount;

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhum arquivo trocado ainda nessa conversa.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Resumo de mídia e arquivos">
      <li>
        <SummaryRow
          icon={<Images className="h-5 w-5" strokeWidth={1.75} />}
          count={photoCount}
          singular="foto"
          plural="fotos"
          ariaLabel={`Ver ${photoCount} foto${photoCount === 1 ? '' : 's'}`}
          onClick={() => onSelect('photos')}
        />
      </li>
      <li>
        <SummaryRow
          icon={<FileIcon className="h-5 w-5" strokeWidth={1.75} />}
          count={fileCount}
          singular="arquivo"
          plural="arquivos"
          ariaLabel={`Ver ${fileCount} arquivo${fileCount === 1 ? '' : 's'}`}
          onClick={() => onSelect('files')}
        />
      </li>
      <li>
        <SummaryRow
          icon={<Link2 className="h-5 w-5" strokeWidth={1.75} />}
          count={linkCount}
          singular="link compartilhado"
          plural="links compartilhados"
          ariaLabel={`Ver ${linkCount} link${linkCount === 1 ? '' : 's'} compartilhado${linkCount === 1 ? '' : 's'}`}
          onClick={() => onSelect('links')}
        />
      </li>
    </ul>
  );
};

export default MediaSummary;
