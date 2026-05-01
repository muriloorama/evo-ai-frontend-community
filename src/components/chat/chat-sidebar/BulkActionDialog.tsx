import React from 'react';

import { Button } from '@evoapi/design-system/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system/dialog';
import { Loader2 } from 'lucide-react';

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Texto descritivo da ação, ex: "Adicionar etiqueta «agendado»" */
  actionDescription: string;
  /** Quantidade de conversas afetadas */
  count: number;
  /** Variante do botão de confirmação — `destructive` para ações irreversíveis */
  confirmVariant?: 'default' | 'destructive';
  /** Texto opcional do botão de confirmar (default: "Confirmar") */
  confirmLabel?: string;
  /** Callback assíncrono executado ao confirmar; o dialog mostra spinner enquanto roda */
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

/**
 * BulkActionDialog — modal de confirmação genérico para ações em massa
 * disparadas pela toolbar do ChatSidebar. Mostra a contagem afetada e
 * desabilita os botões enquanto a ação está em curso para evitar duplo
 * disparo.
 */
const BulkActionDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onOpenChange,
  actionDescription,
  count,
  confirmVariant = 'default',
  confirmLabel = 'Confirmar',
  onConfirm,
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  // Frase no estilo "X em N conversa(s)?" — singular/plural local pra evitar
  // hardcoded só do plural.
  const target = count === 1 ? '1 conversa' : `${count} conversas`;

  return (
    <Dialog open={open} onOpenChange={isOpen => (isLoading ? undefined : onOpenChange(isOpen))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar ação</DialogTitle>
          <DialogDescription>
            {actionDescription} em {target}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            {isLoading ? 'Aplicando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkActionDialog;
