import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Skeleton,
  Switch,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import MessageTemplateService, {
  supportsTemplateSync,
  usesStructuredComponents,
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import api from '@/services/core/api';
import { TemplatePreview } from './TemplatePreview';
import { MessageTemplate, TemplateFormData } from '@/types';

interface MessageTemplateFormProps {
  inboxId: string;
  channelType: string;
  onUpdate?: () => void;
}

// Template Form Modal
const TemplateFormModal: React.FC<{
  isOpen: boolean;
  template?: MessageTemplate;
  onClose: () => void;
  onSave: (template: TemplateFormData) => void;
  mode: 'create' | 'edit';
  channelType: string;
  t: (key: string, params?: Record<string, unknown>) => string;
}> = ({ isOpen, template, onClose, onSave, mode, channelType, t }) => {
  const channelConfig = getChannelTemplateConfig(channelType);
  const isStructured = usesStructuredComponents(channelType);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    language: 'en_US',
    category: 'MARKETING',
    template_type: 'text',
    active: true,
    // Structured fields
    headerFormat: 'NONE',
    headerText: '',
    headerMediaUrl: '',
    bodyText: '',
    bodyExamples: [],
    footerText: '',
    buttons: [],
  });

  // Extract {{variable}} tokens from body text
  const bodyVariables = useMemo(() => {
    const text = formData.bodyText || '';
    const matches = text.match(/\{\{\s*[\w.-]+\s*\}\}/g) || [];
    // de-duplicate preserving order
    return Array.from(new Set(matches));
  }, [formData.bodyText]);

  // Sync bodyExamples array length with detected variables
  useEffect(() => {
    setFormData(prev => {
      const current = prev.bodyExamples || [];
      if (current.length === bodyVariables.length) return prev;
      const next = bodyVariables.map((_, i) => current[i] || '');
      return { ...prev, bodyExamples: next };
    });
  }, [bodyVariables]);

  // Strip emoji + surrogate pairs (Meta rejects templates with emojis in buttons)
  const stripEmoji = (text: string): string =>
    text
      .replace(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F9FF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
        '',
      )
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');

  // Character limits per Meta Cloud API spec
  const LIMITS = {
    headerText: 60,
    bodyText: 1024,
    footerText: 60,
    buttonText: 20,
    maxButtons: 3,
  };

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const handleMediaFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const form = new FormData();
      form.append('attachment', file);
      const response = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl: string | undefined =
        response.data?.data?.file_url || response.data?.file_url;
      if (!fileUrl) {
        toast.error(t('settings.messageTemplates.errors.uploadFailed'));
        return;
      }
      setFormData(prev => ({ ...prev, headerMediaUrl: fileUrl }));
      toast.success(t('settings.messageTemplates.success.uploadSuccess'));
    } catch (error) {
      console.error('Template media upload error:', error);
      toast.error(t('settings.messageTemplates.errors.uploadFailed'));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  useEffect(() => {
    if (template && mode === 'edit') {
      const convertedTemplate = MessageTemplateService.transformToFrontendFormat(
        template,
        channelType,
      );
      setFormData(convertedTemplate);
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        content: '',
        language: 'en_US',
        category: (channelConfig.categories[0] as TemplateFormData['category']) || 'MARKETING',
        template_type:
          (channelConfig.templateTypes[0] as TemplateFormData['template_type']) || 'text',
        active: true,
        headerFormat: 'NONE',
        headerText: '',
        headerMediaUrl: '',
        bodyText: '',
        bodyExamples: [],
        footerText: '',
        buttons: [],
      });
    }
  }, [template, mode, isOpen, channelType]);

  const handleSave = () => {
    // Validate based on channel type
    if (isStructured) {
      if (!formData.name.trim() || !formData.bodyText?.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
      // Header with media requires a URL example (Meta API requirement)
      if (
        ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat || '') &&
        !formData.headerMediaUrl?.trim()
      ) {
        toast.error(t('settings.messageTemplates.errors.headerMediaUrlRequired'));
        return;
      }
      // Each body variable must have an example value (Meta API requirement)
      if (bodyVariables.length > 0) {
        const missing = (formData.bodyExamples || []).some(v => !v?.trim());
        if (missing) {
          toast.error(t('settings.messageTemplates.errors.variableExamplesRequired'));
          return;
        }
      }
      // Buttons: all must have non-empty text within limits
      if (formData.buttons?.length) {
        const invalid = formData.buttons.some(
          b => !b.text.trim() || b.text.length > LIMITS.buttonText,
        );
        if (invalid) {
          toast.error(t('settings.messageTemplates.errors.buttonsInvalid'));
          return;
        }
      }
    } else {
      if (!formData.name.trim() || !formData.content.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { type: 'QUICK_REPLY', text: '' }],
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons:
        prev.buttons?.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)) || [],
    }));
  };

  const isFormValid = isStructured
    ? formData.name.trim() && formData.bodyText?.trim()
    : formData.name.trim() && formData.content.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-hidden"
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Form */}
          <div className="space-y-4">
            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.category')}
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      category: value as TemplateFormData['category'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelConfig.categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.language')}
                </label>
                <Select
                  value={formData.language}
                  onValueChange={value => setFormData(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es_ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.templateType')}
                </label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      template_type: value as TemplateFormData['template_type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelConfig.templateTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {t(`settings.messageTemplates.form.templateTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Structured Components (WhatsApp, Facebook, Instagram) */}
            {isStructured && channelConfig.supportsStructured && (
              <>
                {/* Header (optional) */}
                {channelConfig.supportsMedia && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="block text-sm font-medium mb-2">
                          {t('settings.messageTemplates.form.headerFormat')}
                        </label>
                        <Select
                          value={formData.headerFormat || 'NONE'}
                          onValueChange={(value: string) =>
                            setFormData(prev => ({
                              ...prev,
                              headerFormat: value as TemplateFormData['headerFormat'],
                              // Reset header-dependent fields on change
                              headerText: value === 'TEXT' ? prev.headerText : '',
                              headerMediaUrl: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(value)
                                ? prev.headerMediaUrl
                                : '',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">
                              {t('settings.messageTemplates.form.headerFormats.none')}
                            </SelectItem>
                            <SelectItem value="TEXT">
                              {t('settings.messageTemplates.form.headerFormats.text')}
                            </SelectItem>
                            <SelectItem value="IMAGE">
                              {t('settings.messageTemplates.form.headerFormats.image')}
                            </SelectItem>
                            <SelectItem value="VIDEO">
                              {t('settings.messageTemplates.form.headerFormats.video')}
                            </SelectItem>
                            <SelectItem value="DOCUMENT">
                              {t('settings.messageTemplates.form.headerFormats.document')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.headerFormat === 'TEXT' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2">
                            {t('settings.messageTemplates.form.headerText')}
                            <span className="text-xs text-muted-foreground ml-2">
                              {(formData.headerText || '').length}/{LIMITS.headerText}
                            </span>
                          </label>
                          <Input
                            value={formData.headerText}
                            maxLength={LIMITS.headerText}
                            onChange={e =>
                              setFormData(prev => ({ ...prev, headerText: e.target.value }))
                            }
                            placeholder={t('settings.messageTemplates.form.headerTextPlaceholder')}
                          />
                        </div>
                      )}
                      {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerFormat || '') && (
                        <div className="col-span-2 space-y-2">
                          <label className="block text-sm font-medium">
                            {t('settings.messageTemplates.form.headerMediaUpload')}
                          </label>
                          <input
                            type="file"
                            accept={
                              formData.headerFormat === 'IMAGE'
                                ? 'image/*'
                                : formData.headerFormat === 'VIDEO'
                                ? 'video/*'
                                : '.pdf,application/pdf'
                            }
                            onChange={e => handleMediaFileSelect(e.target.files?.[0])}
                            disabled={isUploadingMedia}
                            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-border file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
                          />
                          {isUploadingMedia && (
                            <p className="text-xs text-muted-foreground">
                              {t('settings.messageTemplates.form.uploading')}
                            </p>
                          )}
                          {formData.headerMediaUrl && !isUploadingMedia && (
                            <p className="text-xs text-green-700 dark:text-green-400 break-all">
                              ✓ {formData.headerMediaUrl}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t('settings.messageTemplates.form.headerMediaUrlHelp')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.bodyText')}
                    <span className="text-xs text-muted-foreground ml-2">
                      {(formData.bodyText || '').length}/{LIMITS.bodyText}
                    </span>
                  </label>
                  <Textarea
                    value={formData.bodyText}
                    maxLength={LIMITS.bodyText}
                    onChange={e => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.bodyTextPlaceholder')}
                    rows={4}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.variablesHelp')}
                  </p>

                  {/* Variable examples — required by Meta API when {{vars}} present */}
                  {bodyVariables.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-300/30 bg-amber-50/10 dark:bg-amber-950/10 space-y-2">
                      <div>
                        <h4 className="text-sm font-semibold">
                          {t('settings.messageTemplates.form.variableExamples')}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.messageTemplates.form.variableExamplesHelp')}
                        </p>
                      </div>
                      {bodyVariables.map((token, idx) => (
                        <div key={token} className="grid grid-cols-3 gap-2 items-center">
                          <code className="text-xs font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                            {token}
                          </code>
                          <Input
                            className="col-span-2"
                            value={(formData.bodyExamples || [])[idx] || ''}
                            onChange={e => {
                              const v = e.target.value;
                              setFormData(prev => {
                                const examples = [...(prev.bodyExamples || [])];
                                examples[idx] = v;
                                return { ...prev, bodyExamples: examples };
                              });
                            }}
                            placeholder={t(
                              'settings.messageTemplates.form.variableExamplePlaceholder',
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.footerText')}
                    <span className="text-xs text-muted-foreground ml-2">
                      {(formData.footerText || '').length}/{LIMITS.footerText}
                    </span>
                  </label>
                  <Input
                    value={formData.footerText}
                    maxLength={LIMITS.footerText}
                    onChange={e => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.footerTextPlaceholder')}
                  />
                </div>

                {/* Buttons */}
                {channelConfig.supportsButtons && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        {t('settings.messageTemplates.form.buttons')}
                        <span className="text-xs text-muted-foreground ml-2">
                          {formData.buttons?.length || 0}/{LIMITS.maxButtons}
                        </span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addButton}
                        disabled={(formData.buttons?.length || 0) >= LIMITS.maxButtons}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('settings.messageTemplates.form.addButton')}
                      </Button>
                    </div>
                    {(formData.buttons?.length || 0) >= LIMITS.maxButtons && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                        {t('settings.messageTemplates.form.buttonsLimitReached')}
                      </p>
                    )}

                    {formData.buttons?.map((button, index) => (
                      <Card key={index} className="p-3 mb-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Select
                            value={button.type}
                            onValueChange={(value: string) => updateButton(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">
                                {t('settings.messageTemplates.form.buttonTypes.quickReply')}
                              </SelectItem>
                              <SelectItem value="URL">
                                {t('settings.messageTemplates.form.buttonTypes.url')}
                              </SelectItem>
                              <SelectItem value="PHONE_NUMBER">
                                {t('settings.messageTemplates.form.buttonTypes.phone')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeButton(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="mb-2">
                          <Input
                            value={button.text}
                            maxLength={LIMITS.buttonText}
                            onChange={e => {
                              const cleaned = stripEmoji(e.target.value).slice(
                                0,
                                LIMITS.buttonText,
                              );
                              if (cleaned !== e.target.value) {
                                // User tried to paste emoji — notify once
                                if (/[\p{Emoji}]/u.test(e.target.value)) {
                                  toast.info(
                                    t('settings.messageTemplates.form.buttonsNoEmoji'),
                                  );
                                }
                              }
                              updateButton(index, 'text', cleaned);
                            }}
                            placeholder={t('settings.messageTemplates.form.buttonTextPlaceholder')}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {button.text.length}/{LIMITS.buttonText}
                          </p>
                        </div>

                        {button.type === 'URL' && (
                          <Input
                            value={button.url || ''}
                            onChange={e => updateButton(index, 'url', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.urlPlaceholder')}
                          />
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <Input
                            value={button.phone_number || ''}
                            onChange={e => updateButton(index, 'phoneNumber', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.phonePlaceholder')}
                          />
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Email-specific fields */}
            {channelType === 'Channel::Email' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.subject')}
                </label>
                <Input
                  value={formData.subject || ''}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.subjectPlaceholder')}
                />
              </div>
            )}

            {/* Simple Text Content (SMS, API, Telegram, Line) */}
            {/* Note: Email templates are edited in a dedicated page, not in this modal */}
            {!isStructured && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.content')}
                </label>
                <Textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.contentPlaceholder')}
                  rows={6}
                />
                {channelConfig.usesLiquid && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.messageTemplates.form.liquidHelp')}
                  </p>
                )}
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.active')}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('settings.messageTemplates.form.activeHelp')}
                </p>
              </div>
              <Switch
                checked={formData.active !== false}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          {/* Preview - Sticky on larger screens */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <TemplatePreview template={formData} channelType={channelType} t={t} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('settings.messageTemplates.form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {mode === 'create'
              ? t('settings.messageTemplates.form.create')
              : t('settings.messageTemplates.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MessageTemplateForm: React.FC<MessageTemplateFormProps> = ({
  inboxId,
  channelType,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage('channels');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'name' | 'category' | 'status' | 'created_at'>(
    'name',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

  const canSync = supportsTemplateSync(channelType);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await MessageTemplateService.getTemplates(inboxId);
      setTemplates(response.data);
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.loadError'), error);
      toast.error(t('settings.messageTemplates.errors.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [inboxId, t]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredAndSortedTemplates = useMemo(() => {
    const filtered = templates.filter(
      template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.category && template.category.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    filtered.sort((a, b) => {
      let aValue: string | number = (a[sortColumn] as string | number) || '';
      let bValue: string | number = (b[sortColumn] as string | number) || '';

      if (sortColumn === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [templates, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      await MessageTemplateService.syncTemplates(inboxId);
      toast.success(t('settings.messageTemplates.success.syncSuccess'));
      await loadTemplates();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.syncError'), error);
      toast.error(t('settings.messageTemplates.errors.syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTemplate = async (templateData: TemplateFormData) => {
    try {
      await MessageTemplateService.createTemplate(inboxId, templateData, channelType);
      toast.success(t('settings.messageTemplates.success.createSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.createError'), error);
      toast.error(t('settings.messageTemplates.errors.createError'));
    }
  };

  const handleEditTemplate = async (templateData: TemplateFormData) => {
    if (!editingTemplate || !editingTemplate.id) return;

    try {
      await MessageTemplateService.updateTemplate(
        inboxId,
        editingTemplate.id,
        templateData,
        channelType,
      );
      toast.success(t('settings.messageTemplates.success.updateSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.updateError'), error);
      toast.error(t('settings.messageTemplates.errors.updateError'));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !templateToDelete.id) return;

    try {
      await MessageTemplateService.deleteTemplate(inboxId, templateToDelete.id);
      toast.success(t('settings.messageTemplates.success.deleteSuccess'));
      await loadTemplates();
      onUpdate?.();
    } catch (error) {
      console.error(t('settings.messageTemplates.errors.deleteError'), error);
      toast.error(t('settings.messageTemplates.errors.deleteError'));
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const openDeleteConfirm = (template: MessageTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      APPROVED: {
        color: 'bg-green-600 dark:bg-green-500 text-white',
        text: t('settings.messageTemplates.status.approved'),
      },
      PENDING: {
        color: 'bg-yellow-600 dark:bg-yellow-500 text-white',
        text: t('settings.messageTemplates.status.pending'),
      },
      REJECTED: {
        color: 'bg-red-600 dark:bg-red-500 text-white',
        text: t('settings.messageTemplates.status.rejected'),
      },
      PAUSED: {
        color: 'bg-gray-600 dark:bg-gray-500 text-white',
        text: t('settings.messageTemplates.status.paused'),
      },
      ACTIVE: {
        color: 'bg-green-600 dark:bg-green-500 text-white',
        text: t('settings.messageTemplates.status.active'),
      },
      INACTIVE: {
        color: 'bg-gray-600 dark:bg-gray-500 text-white',
        text: t('settings.messageTemplates.status.inactive'),
      },
    };

    const config = statusConfig[status || 'ACTIVE'] || statusConfig.ACTIVE;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;

    const categoryConfig: Record<string, { color: string }> = {
      MARKETING: { color: 'bg-blue-600 dark:bg-blue-500 text-white' },
      UTILITY: { color: 'bg-green-600 dark:bg-green-500 text-white' },
      AUTHENTICATION: { color: 'bg-purple-600 dark:bg-purple-500 text-white' },
      TRANSACTIONAL: { color: 'bg-orange-600 dark:bg-orange-500 text-white' },
    };

    const config = categoryConfig[category] || { color: 'bg-gray-600 dark:bg-gray-500 text-white' };
    return (
      <Badge className={config.color}>
        {t(`settings.messageTemplates.categories.${category.toLowerCase()}`)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('settings.messageTemplates.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('settings.messageTemplates.description')}
          </p>
        </div>
        <div className="flex gap-2">
          {canSync && (
            <Button variant="outline" onClick={handleSyncTemplates} loading={isSyncing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('settings.messageTemplates.actions.sync')}
            </Button>
          )}
          <Button
            onClick={() => {
              if (channelType === 'Channel::Email') {
                // Redirect to dedicated email template editor page
                navigate(
                  `/settings/email-template-editor?inboxId=${inboxId}&channelType=${encodeURIComponent(
                    channelType,
                  )}`,
                );
              } else {
                // Use modal for other channel types
                setShowFormModal(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('settings.messageTemplates.newTemplate')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('settings.messageTemplates.searchPlaceholder')}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.name')}
                    {sortColumn === 'name' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.category')}
                    {sortColumn === 'category' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.status')}
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>{t('settings.messageTemplates.table.language')}</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {t('settings.messageTemplates.table.createdAt')}
                    {sortColumn === 'created_at' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </button>
                </TableHead>
                <TableHead className="w-32">
                  {t('settings.messageTemplates.table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTemplates.map(template => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getCategoryBadge(template.category)}</TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                  <TableCell>{template.language}</TableCell>
                  <TableCell>
                    {template.created_at
                      ? new Date(template.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreview(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (channelType === 'Channel::Email') {
                            // Redirect to dedicated email template editor page
                            navigate(
                              `/settings/email-template-editor?inboxId=${inboxId}&templateId=${
                                template.id
                              }&channelType=${encodeURIComponent(channelType)}`,
                            );
                          } else {
                            // Use modal for other channel types
                            openEditModal(template);
                          }
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteConfirm(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedTemplates.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('settings.messageTemplates.emptyState.title')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? t('settings.messageTemplates.emptyState.searchEmpty')
                  : t('settings.messageTemplates.emptyState.description')}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => {
                    if (channelType === 'Channel::Email') {
                      // Redirect to dedicated email template editor page
                      navigate(
                        `/settings/email-template-editor?inboxId=${inboxId}&channelType=${encodeURIComponent(
                          channelType,
                        )}`,
                      );
                    } else {
                      // Use modal for other channel types
                      setShowFormModal(true);
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.messageTemplates.newTemplate')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Form Modal */}
      <TemplateFormModal
        isOpen={showFormModal}
        template={editingTemplate || undefined}
        mode={editingTemplate ? 'edit' : 'create'}
        channelType={channelType}
        onClose={() => {
          setShowFormModal(false);
          setEditingTemplate(null);
        }}
        onSave={editingTemplate ? handleEditTemplate : handleCreateTemplate}
        t={t}
      />

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.messageTemplates.preview.modalTitle')}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePreview
              template={MessageTemplateService.transformToFrontendFormat(
                selectedTemplate,
                channelType,
              )}
              channelType={channelType}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.messageTemplates.deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 dark:text-slate-400">
              {t('settings.messageTemplates.deleteDialog.message', {
                templateName: templateToDelete?.name,
              })}
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              {t('settings.messageTemplates.deleteDialog.warning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('settings.messageTemplates.deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              {t('settings.messageTemplates.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageTemplateForm;
