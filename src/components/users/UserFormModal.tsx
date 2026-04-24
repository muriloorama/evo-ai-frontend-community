import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import usersService from '@/services/users/usersService';
import useRoles from '@/hooks/useRoles';
import type { User, UserFormData, UserUpdateData } from '@/types/users';
import { Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';


interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

export default function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const { t } = useLanguage('users');

  // Buscar system roles
  const { roles: systemRoles } = useRoles({
    loadFull: true,
  });

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'agent',
    availability: 'online',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role?.key || 'agent',
        availability: user.availability || 'online',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'agent',
        availability: 'online',
        password: '',
        confirmPassword: '',
      });
    }
    setErrors({});
  }, [user]);

  const handleFieldChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.validation.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('form.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.validation.emailInvalid');
    }

    if (!user && formData.password) {
      // Criação com senha digitada pelo admin (opcional — vazia = gerada no backend).
      if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    } else if (formData.password) {
      // Validações para atualização (senha opcional)
      if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (user) {
        // Atualizar usuário
        const updateData: UserUpdateData = {
          name: formData.name,
          role: formData.role,
          availability: formData.availability,
        };

        await usersService.updateUser(user.id, updateData);
        toast.success(t('form.messages.updateSuccess'));
      } else {
        // Criar novo usuário
        const createData: UserFormData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          availability: formData.availability,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        const result = await usersService.createUser(createData);
        toast.success(t('form.messages.createSuccess'));
        if (result.temporary_password) {
          setGeneratedPassword(result.temporary_password);
          setPasswordCopied(false);
          onSuccess();
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(t('form.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGeneratedPassword(null);
    setPasswordCopied(false);
    onClose();
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar. Copie manualmente.');
    }
  };

  if (generatedPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-sidebar border-sidebar-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground">
              Atendente criado — senha temporária
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-sidebar-foreground/80">
              Copie a senha abaixo e envie ao atendente. Ele poderá trocá-la depois no perfil. Esta senha não será exibida novamente.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generatedPassword}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPassword}
                className="bg-sidebar hover:bg-sidebar-accent border-sidebar-border"
              >
                {passwordCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-sidebar border-sidebar-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground">
            {user ? t('form.title.edit') : t('form.title.create')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('form.fields.name.label')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder={t('form.fields.name.placeholder')}
              className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                errors.name ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('form.fields.email.label')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleFieldChange('email', e.target.value)}
              placeholder={t('form.fields.email.placeholder')}
              className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                errors.email ? 'border-red-500' : ''
              }`}
              disabled={loading || !!user}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            {user && (
              <p className="text-xs text-sidebar-foreground/60">
                {t('form.fields.email.cannotChange')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('form.fields.role.label')}</Label>
            <Select
              value={formData.role}
              onValueChange={value => handleFieldChange('role', value)}
              disabled={loading}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {systemRoles.map(role => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">{t('form.fields.availability.label')}</Label>
            <Select
              value={formData.availability}
              onValueChange={value => handleFieldChange('availability', value)}
              disabled={loading}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">{t('form.fields.availability.online')}</SelectItem>
                <SelectItem value="busy">{t('form.fields.availability.busy')}</SelectItem>
                <SelectItem value="offline">{t('form.fields.availability.offline')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(!user || formData.password) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('form.fields.password.labelOptional')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => handleFieldChange('password', e.target.value)}
                    placeholder={t('form.fields.password.placeholder')}
                    className={`bg-sidebar border-sidebar-border text-sidebar-foreground pr-10 ${
                      errors.password ? 'border-red-500' : ''
                    }`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                {!user && (
                  <p className="text-xs text-sidebar-foreground/60">
                    Deixe em branco para o sistema gerar uma senha temporária.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {user
                    ? t('form.fields.confirmPassword.labelOptional')
                    : t('form.fields.confirmPassword.label')}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                    placeholder={t('form.fields.confirmPassword.placeholder')}
                    className={`bg-sidebar border-sidebar-border text-sidebar-foreground pr-10 ${
                      errors.confirmPassword ? 'border-red-500' : ''
                    }`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="bg-sidebar hover:bg-sidebar-accent border-sidebar-border"
            >
              {t('form.actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('form.actions.saving')}
                </>
              ) : user ? (
                t('form.actions.save')
              ) : (
                t('form.actions.create')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
