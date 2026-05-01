import { Button } from '@evoapi/design-system/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@evoapi/design-system/tooltip';
import { Rows3, Rows2 } from 'lucide-react';
import { ChatDensity } from '@/hooks/useDensity';

interface DensityToggleProps {
  density: ChatDensity;
  onChange: (next: ChatDensity) => void;
  className?: string;
}

/**
 * Toggle de duas posições para alternar densidade visual da lista de conversas.
 * Usa tokens do design system (`bg-muted` para o ativo) e Lucide icons —
 * `Rows3` representa a densidade confortável, `Rows2` a compacta.
 */
const DensityToggle = ({ density, onChange, className = '' }: DensityToggleProps) => {
  const isCompact = density === 'compact';
  const isComfortable = density === 'comfortable';

  return (
    <TooltipProvider>
      <div
        role="group"
        aria-label="Densidade da lista"
        className={`inline-flex items-center gap-0.5 ${className}`.trim()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-pressed={isComfortable}
              aria-label="Densidade confortável"
              onClick={() => onChange('comfortable')}
              className={`h-8 w-8 ${isComfortable ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <Rows3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Confortável</span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-pressed={isCompact}
              aria-label="Densidade compacta"
              onClick={() => onChange('compact')}
              className={`h-8 w-8 ${isCompact ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <Rows2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Compacta</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default DensityToggle;
