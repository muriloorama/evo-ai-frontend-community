import type { Attachment, Message } from '@/types/chat/api';

// ---------- timestamp helpers ----------

/**
 * Normaliza `created_at` da Message para milissegundos. Aceita:
 *  - number  → assumido em segundos (Unix), exceto se já for grande o bastante para ms
 *  - string  → ISO; cai pro Date.parse
 *  - inválido → 0
 */
export const messageTimeMs = (message: Message): number => {
  const raw = message.created_at;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return 0;
    // Heurística: timestamps em segundos cabem em ~10 dígitos até 2286.
    // Se vier > 1e12, já é ms.
    return raw > 1e12 ? raw : raw * 1000;
  }

  if (typeof raw === 'string' && raw) {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

// ---------- formatting ----------

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const capitalize = (s: string): string => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));

/** "Maio 2026" — primeira letra maiúscula. */
export const formatMonth = (timeMs: number): string => {
  if (!timeMs) return 'Sem data';
  return capitalize(monthFormatter.format(new Date(timeMs)));
};

/** Chave estável (ano-mês) para agrupar — não depende de locale. */
export const monthKey = (timeMs: number): string => {
  if (!timeMs) return '0000-00';
  const d = new Date(timeMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const startOfDay = (d: Date): number => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
};

/** "Hoje", "Ontem", senão "1 de maio de 2026". */
export const formatRelativeDate = (timeMs: number): string => {
  if (!timeMs) return 'Sem data';
  const today = startOfDay(new Date());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const target = startOfDay(new Date(timeMs));

  if (target === today) return 'Hoje';
  if (target === yesterday) return 'Ontem';
  return dateFormatter.format(new Date(timeMs));
};

/** Chave estável (ano-mês-dia) para agrupar. */
export const dayKey = (timeMs: number): string => {
  if (!timeMs) return '0000-00-00';
  const d = new Date(timeMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- url & domain ----------

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export const domainFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Extension de attachment: cai pro pathname da URL se vier nulo.
export const fileExtension = (att: Attachment): string => {
  if (att.extension) return att.extension.toLowerCase();
  try {
    const u = new URL(att.data_url);
    const pathname = u.pathname;
    const idx = pathname.lastIndexOf('.');
    if (idx >= 0 && idx < pathname.length - 1) {
      return pathname.slice(idx + 1).toLowerCase();
    }
  } catch {
    // ignore
  }
  return '';
};

// ---------- color from string ----------

// Paleta de 5 acentos do design — escolhidos pra contraste com texto branco.
const COLOR_CLASSES = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
] as const;

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
};

export const colorFromTitle = (title: string): string => {
  const safe = title || 'item';
  return COLOR_CLASSES[hashString(safe) % COLOR_CLASSES.length];
};

export const initialFromTitle = (title: string): string => {
  const trimmed = (title || '').trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
};

// ---------- collected media types ----------

export interface PhotoItem {
  attachment: Attachment;
  message: Message;
  timeMs: number;
}

export interface FileItem {
  attachment: Attachment;
  message: Message;
  timeMs: number;
}

export interface LinkItem {
  url: string;
  message: Message;
  timeMs: number;
}

// ---------- collectors ----------

const isPhotoAttachment = (a: Attachment): boolean =>
  (a.file_type === 'image' || a.file_type === 'video') && Boolean(a.data_url);

const isFileAttachment = (a: Attachment): boolean =>
  a.file_type === 'file' && Boolean(a.data_url);

const isUserVisibleMessage = (m: Message): boolean => {
  if (m.private) return false;
  if (m.message_type === 'activity') return false;
  return true;
};

/** Coleta fotos+vídeos de TODAS as messages, mais novas primeiro. */
export const collectPhotos = (messages: Message[]): PhotoItem[] => {
  const items: PhotoItem[] = [];
  for (const message of messages) {
    if (!message.attachments || message.attachments.length === 0) continue;
    for (const att of message.attachments) {
      if (!isPhotoAttachment(att)) continue;
      items.push({ attachment: att, message, timeMs: messageTimeMs(message) });
    }
  }
  // Mais recentes primeiro.
  items.sort((a, b) => b.timeMs - a.timeMs);
  return items;
};

/** Coleta arquivos (file_type === 'file') de TODAS as messages, mais novas primeiro. */
export const collectFiles = (messages: Message[]): FileItem[] => {
  const items: FileItem[] = [];
  for (const message of messages) {
    if (!message.attachments || message.attachments.length === 0) continue;
    for (const att of message.attachments) {
      if (!isFileAttachment(att)) continue;
      items.push({ attachment: att, message, timeMs: messageTimeMs(message) });
    }
  }
  items.sort((a, b) => b.timeMs - a.timeMs);
  return items;
};

/**
 * Extrai links de mensagens visíveis (ignora private/activity).
 * Mesma URL repetida → mantém apenas a ocorrência mais recente.
 */
export const extractLinks = (messages: Message[]): LinkItem[] => {
  const seen = new Map<string, LinkItem>();

  for (const message of messages) {
    if (!isUserVisibleMessage(message)) continue;
    const content = typeof message.content === 'string' ? message.content : '';
    if (!content) continue;

    const matches = content.match(URL_REGEX);
    if (!matches) continue;

    const timeMs = messageTimeMs(message);
    for (const rawUrl of matches) {
      // Tira pontuação trailing comum em texto livre.
      const url = rawUrl.replace(/[).,;:!?]+$/, '');
      if (!url) continue;

      const existing = seen.get(url);
      if (!existing || existing.timeMs < timeMs) {
        seen.set(url, { url, message, timeMs });
      }
    }
  }

  // Mais recentes primeiro.
  return Array.from(seen.values()).sort((a, b) => b.timeMs - a.timeMs);
};

// ---------- groupers ----------

export interface Group<T> {
  /** Chave estável (ano-mês ou ano-mês-dia). Útil pra React keys. */
  key: string;
  /** Label localizada já formatada. */
  label: string;
  /** Itens dentro do grupo, na mesma ordem em que entraram. */
  items: T[];
}

interface HasTime {
  timeMs: number;
}

/** Agrupa por mês. Itens DENTRO do grupo mantêm a ordem original (presume-se já desc). */
export const groupByMonth = <T extends HasTime>(items: T[]): Group<T>[] => {
  const buckets = new Map<string, Group<T>>();
  for (const item of items) {
    const key = monthKey(item.timeMs);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: formatMonth(item.timeMs), items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(item);
  }
  // Ordena grupos do mais recente pro mais antigo (chave ISO-like ordena bem).
  return Array.from(buckets.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
};

/** Agrupa por dia. */
export const groupByDate = <T extends HasTime>(items: T[]): Group<T>[] => {
  const buckets = new Map<string, Group<T>>();
  for (const item of items) {
    const key = dayKey(item.timeMs);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: formatRelativeDate(item.timeMs), items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(item);
  }
  return Array.from(buckets.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
};
