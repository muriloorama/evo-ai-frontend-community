import React, { useState, useEffect } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';
import { GitBranch, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import type { Pipeline, PipelineItem, PipelineStage } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface PipelineManagementProps {
  conversationId: string;
  pipelines: Pipeline[];
  onPipelineUpdated?: () => void;
}

interface ConversationPipelineData {
  pipeline: Pipeline;
  stage: PipelineStage;
}

const PipelineManagement: React.FC<PipelineManagementProps> = ({
  conversationId,
  pipelines, 
  onPipelineUpdated,
}) => {
  const { t } = useLanguage('chat');
  const [currentPipeline, setCurrentPipeline] = useState<ConversationPipelineData | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [originalPipelines, setOriginalPipelines] = useState<Pipeline[]>([]);

  const loadData = async () => {
    const pipelinesResponse = await pipelinesService.getPipelines();
    setOriginalPipelines(pipelinesResponse.data || []);
    
    let foundPipeline: ConversationPipelineData | null = null;
    
    for (const pipeline of pipelines) {
      if (pipeline.stages) {
        // Procurar o item da conversation nos stages
        for (const stage of pipeline.stages) {
          if (stage.items && stage.items.length > 0) {
            foundPipeline = { pipeline, stage };
            setSelectedPipelineId(String(pipeline.id));
            setSelectedStageId(String(stage.id));
            break;
          }
        }
      }
    }
    
    if (!foundPipeline) return;

    setCurrentPipeline(foundPipeline);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, pipelines]);

  // Load stages when pipeline is selected
  const [availableStages, setAvailableStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    const loadStages = async () => {
      if (!selectedPipelineId) {
        setAvailableStages([]);
        return;
      }

      try {
        const pipelinesToSearch = originalPipelines || [];
        const selectedPipeline = pipelinesToSearch.find(
          (p) => String(p.id) === selectedPipelineId,
        );

        setAvailableStages(selectedPipeline?.stages || []);
      } catch (error) {
        console.error('Error loading stages:', error);
        setAvailableStages([]);
      }
    };

    loadStages();
  }, [selectedPipelineId, originalPipelines]);

  const applyChange = async (pipelineId: string, stageId: string) => {
    if (!pipelineId || !stageId) return;
    try {
      setIsSaving(true);

      const conversationPipeline = pipelines?.find(
        (pipeline: Pipeline) => String(pipeline.id) === pipelineId
      );

      let conversationItem: PipelineItem | undefined;
      if (conversationPipeline?.stages) {
        for (const stage of conversationPipeline.stages) {
          const found = stage.items?.find(
            (item: PipelineItem) => String(item.item_id) === conversationId
          );
          if (found) {
            conversationItem = found;
            break;
          }
        }
      }

      if (conversationItem) {
        await pipelinesService.moveItem({
          item_id: conversationItem.id,
          pipeline_id: pipelineId,
          from_stage_id: conversationItem.stage_id,
          to_stage_id: stageId,
        });
      } else {
        await pipelinesService.addItemToPipeline(pipelineId, {
          item_id: conversationId,
          type: 'conversation',
          pipeline_stage_id: stageId,
        });
      }

      toast.success(t('contactSidebar.pipeline.saveSuccess'));
      await loadData();
      onPipelineUpdated?.();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('contactSidebar.pipeline.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save on any pipeline change (no confirm dialog).
  const handlePipelineChange = (value: string) => {
    setSelectedPipelineId(value);
    setSelectedStageId(''); // reset stage, user will pick next
  };

  // Auto-save on stage change — triggered every time user picks a new stage.
  const handleStageChange = (value: string) => {
    setSelectedStageId(value);
    if (selectedPipelineId && value) {
      applyChange(selectedPipelineId, value);
    }
  };

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemove = async () => {
    if (!currentPipeline) return;

    try {
      setIsSaving(true);
      setShowRemoveConfirm(false);
      await pipelinesService.removeItemFromPipeline(
        String(currentPipeline.pipeline.id),
        conversationId,
      );
      toast.success(t('contactSidebar.pipeline.removeSuccess'));
      setSelectedPipelineId('');
      setSelectedStageId('');
      setCurrentPipeline(null);
      onPipelineUpdated?.();
    } catch (error) {
      console.error('Error removing from pipeline:', error);
      toast.error(t('contactSidebar.pipeline.removeError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Pipeline + Stage inline — auto-saves on change */}
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <Select value={selectedPipelineId} onValueChange={handlePipelineChange} disabled={isSaving}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder={t('contactSidebar.pipeline.selectPipeline')} />
          </SelectTrigger>
          <SelectContent>
            {originalPipelines.map(pipeline => (
              <SelectItem key={pipeline.id} value={String(pipeline.id)}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentPipeline && (
          <Button
            onClick={handleRemoveClick}
            disabled={isSaving}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Remover do pipeline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {selectedPipelineId && (
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 flex-shrink-0" />
          <Select value={selectedStageId} onValueChange={handleStageChange} disabled={isSaving}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder={t('contactSidebar.pipeline.selectStage')} />
            </SelectTrigger>
            <SelectContent>
              {availableStages
                .sort((a, b) => a.position - b.position)
                .map(stage => (
                  <SelectItem key={stage.id} value={String(stage.id)}>
                    {stage.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-left space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-lg font-semibold">
                  {t('contactSidebar.pipeline.dialogs.remove.title')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {(() => {
                    const pipelineName = currentPipeline?.pipeline.name || '';
                    const description = t('contactSidebar.pipeline.dialogs.remove.description', {
                      pipelineName: pipelineName,
                    });
                    const parts = description.split(pipelineName);
                    return (
                      <>
                        {parts[0]}
                        <strong>{pipelineName}</strong>
                        {parts[1]}
                      </>
                    );
                  })()}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">
              {t('contactSidebar.pipeline.dialogs.remove.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('contactSidebar.pipeline.dialogs.remove.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PipelineManagement;
