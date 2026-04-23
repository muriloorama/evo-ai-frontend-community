import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Copy, ExternalLink, FileText, Film, Image as ImageIcon, Info, Music, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export type AttachmentType = 'file' | 'image' | 'audio' | 'video';

export interface AttachmentTag {
  id: string;
  tag: string;
  type: AttachmentType;
  url: string;
  filename?: string;
  content_type?: string;
}

interface AttachmentTagsProps {
  tags: AttachmentTag[];
  onChange: (tags: AttachmentTag[]) => void;
}

const TYPE_ICON: Record<AttachmentType, typeof FileText> = {
  file: FileText,
  image: ImageIcon,
  audio: Music,
  video: Film,
};

const normalizeTag = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/^_+/, '')
    .slice(0, 64);

const AttachmentTags = ({ tags, onChange }: AttachmentTagsProps) => {
  const { t } = useLanguage('aiAgents');

  const handleAdd = () => {
    onChange([
      ...tags,
      {
        id: `tag_${Date.now()}`,
        tag: '',
        type: 'file',
        url: '',
        filename: '',
        content_type: '',
      },
    ]);
  };

  const handleUpdate = (id: string, updates: Partial<AttachmentTag>) => {
    onChange(tags.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleRemove = (id: string) => {
    onChange(tags.filter(t => t.id !== id));
  };

  const copyTagToken = (tag: string) => {
    if (!tag) return;
    const token = `[[${tag}]]`;
    navigator.clipboard?.writeText(token);
    toast.success(
      t('edit.configuration.attachmentTags.copied', { token }) || `${token} copiado`,
    );
  };

  const duplicateTagError = (current: AttachmentTag) =>
    !!current.tag && tags.some(t => t.id !== current.id && t.tag === current.tag);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {t('edit.configuration.attachmentTags.description') ||
              'Cadastre tags para que o agente possa enviar arquivos (PDF, imagem, áudio, vídeo) durante a conversa.'}
          </p>
          <p className="text-xs">
            {t('edit.configuration.attachmentTags.usage') ||
              'No prompt do agente, inclua [[NOME_DA_TAG]] onde quiser disparar o envio. O sistema remove a tag do texto e envia o arquivo em seguida.'}
          </p>
        </div>
      </div>

      {/* Tags List */}
      <div className="space-y-4">
        {tags.map(tag => {
          const Icon = TYPE_ICON[tag.type] || Paperclip;
          const isDuplicate = duplicateTagError(tag);

          return (
            <Card key={tag.id} className="bg-card">
              <CardContent className="p-4 space-y-4">
                {/* Header row: icon + tag name + delete */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">
                      {t('edit.configuration.attachmentTags.tagName') || 'Nome da tag'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={tag.tag}
                        onChange={e =>
                          handleUpdate(tag.id, { tag: normalizeTag(e.target.value) })
                        }
                        placeholder="ENVIAR_BROCHURA"
                        className={isDuplicate ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyTagToken(tag.tag)}
                        disabled={!tag.tag}
                        title={t('edit.configuration.attachmentTags.copyToken') || 'Copiar [[TAG]]'}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {isDuplicate && (
                      <p className="text-xs text-destructive">
                        {t('edit.configuration.attachmentTags.duplicateError') ||
                          'Esta tag já está cadastrada'}
                      </p>
                    )}
                    {tag.tag && !isDuplicate && (
                      <p className="text-xs text-muted-foreground">
                        {t('edit.configuration.attachmentTags.useInPrompt') ||
                          'Use no prompt:'}{' '}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">{`[[${tag.tag}]]`}</code>
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(tag.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Type + URL row */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t('edit.configuration.attachmentTags.type') || 'Tipo'}
                    </Label>
                    <Select
                      value={tag.type}
                      onValueChange={value =>
                        handleUpdate(tag.id, { type: value as AttachmentType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file">
                          {t('edit.configuration.attachmentTags.types.file') || 'Arquivo (PDF/doc)'}
                        </SelectItem>
                        <SelectItem value="image">
                          {t('edit.configuration.attachmentTags.types.image') || 'Imagem'}
                        </SelectItem>
                        <SelectItem value="audio">
                          {t('edit.configuration.attachmentTags.types.audio') || 'Áudio'}
                        </SelectItem>
                        <SelectItem value="video">
                          {t('edit.configuration.attachmentTags.types.video') || 'Vídeo'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">
                      {t('edit.configuration.attachmentTags.url') || 'URL do arquivo'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={tag.url}
                        onChange={e => handleUpdate(tag.id, { url: e.target.value })}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => tag.url && window.open(tag.url, '_blank', 'noopener')}
                        disabled={!tag.url}
                        title={t('edit.configuration.attachmentTags.openUrl') || 'Abrir'}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Filename + Content-Type row (optional) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t('edit.configuration.attachmentTags.filename') ||
                        'Nome do arquivo (opcional)'}
                    </Label>
                    <Input
                      value={tag.filename || ''}
                      onChange={e => handleUpdate(tag.id, { filename: e.target.value })}
                      placeholder="brochura.pdf"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t('edit.configuration.attachmentTags.contentType') ||
                        'Content-Type (opcional)'}
                    </Label>
                    <Input
                      value={tag.content_type || ''}
                      onChange={e => handleUpdate(tag.id, { content_type: e.target.value })}
                      placeholder="application/pdf"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Tag Button */}
      <Button type="button" variant="outline" onClick={handleAdd} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        {t('edit.configuration.attachmentTags.addTag') || 'Adicionar anexo'}
      </Button>
    </div>
  );
};

export default AttachmentTags;
