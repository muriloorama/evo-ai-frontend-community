import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  GripVertical,
  Edit,
  Trash2,
  Copy,
  ArrowUpDown,
  User,
  CalendarClock,
} from 'lucide-react';

import { pipelinesService } from '@/services/pipelines';
import {
  Pipeline,
  PipelineStage,
  PipelineItem,
  UpdatePipelineData,
  CreateStageData,
} from '@/types/analytics';
import PipelineSwitcher from '@/components/pipelines/PipelineSwitcher';
import EditPipelineModal from '@/components/pipelines/EditPipelineModal';
import CreateStageModal from '@/components/pipelines/CreateStageModal';
import AddItemModal from '@/components/pipelines/AddItemModal';
import RemoveItemModal from '@/components/pipelines/RemoveItemModal';
import EditItemModal from '@/components/pipelines/EditItemModal';
import EditStageModal from '@/components/pipelines/EditStageModal';
import DeleteStageModal from '@/components/pipelines/DeleteStageModal';
import DeletePipelineModal from '@/components/pipelines/DeletePipelineModal';
import ReorderStagesModal from '@/components/pipelines/ReorderStagesModal';
import { ScheduleActionModal } from '@/components/scheduledActions';

export default function PipelineKanban() {
  const { t } = useLanguage('pipelines');
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null);
  const isDraggingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  // Mobile: estágio selecionado para vista vertical (stack filtrado)
  const [activeMobileStageId, setActiveMobileStageId] = useState<string | null>(null);

  // Modal states
  const [showEditPipelineModal, setShowEditPipelineModal] = useState(false);
  const [isUpdatingPipeline, setIsUpdatingPipeline] = useState(false);
  const [showCreateStageModal, setShowCreateStageModal] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedStageForItem, setSelectedStageForItem] = useState<PipelineStage | null>(null);
  const [showRemoveItemModal, setShowRemoveItemModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<PipelineItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PipelineItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<PipelineStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [isDeletingStage, setIsDeletingStage] = useState(false);
  const [showDeletePipelineModal, setShowDeletePipelineModal] = useState(false);
  const [showReorderStagesModal, setShowReorderStagesModal] = useState(false);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);
  const [isReorderingStages, setIsReorderingStages] = useState(false);
  const [scheduleActionOpen, setScheduleActionOpen] = useState(false);
  const [selectedConversationForSchedule, setSelectedConversationForSchedule] =
    useState<PipelineItem | null>(null);
  const scheduleActionContactId =
    selectedConversationForSchedule?.conversation?.contact?.id ??
    selectedConversationForSchedule?.contact?.id;

  // Load pipeline data
  const loadPipelineData = useCallback(async () => {
    if (!pipelineId) return;

    setLoading(true);
    try {
      // Load pipeline with all data (stages, items, tasks_info, services_info)
      const pipelineData = await pipelinesService.getPipeline(pipelineId);

      setPipeline(pipelineData);
      setStages(pipelineData.stages || []);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      toast.error(t('kanban.messages.loadDataError'));
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  // Load all pipelines for selector
  const loadAllPipelines = useCallback(async () => {
    try {
      const response = await pipelinesService.getPipelines();
      const pipelinesData = response.data || [];
      setAllPipelines(pipelinesData);
    } catch (error) {
      console.error('Error loading pipelines:', error);
    }
  }, []);

  useEffect(() => {
    loadPipelineData();
    loadAllPipelines();
  }, [loadPipelineData, loadAllPipelines]);

  // Garantir estágio mobile válido após carregar/mudar pipeline
  useEffect(() => {
    if (stages.length === 0) {
      setActiveMobileStageId(null);
      return;
    }
    if (!activeMobileStageId || !stages.some(s => s.id === activeMobileStageId)) {
      setActiveMobileStageId(stages[0].id);
    }
  }, [stages, activeMobileStageId]);

  // Handle pipeline change
  const handlePipelineChange = (newPipelineId: string) => {
    if (newPipelineId !== pipelineId) {
      navigate(`/pipelines/${newPipelineId}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (item: PipelineItem) => {
    setDraggedItem(item);
    isDraggingRef.current = true;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();

    if (!draggedItem) return;

    // Don't move if dropping on same stage
    if (draggedItem.stage_id === targetStageId) {
      setDraggedItem(null);
      return;
    }

    try {
      await pipelinesService.moveItem({
        item_id: draggedItem.id,
        pipeline_id: pipelineId!,
        from_stage_id: draggedItem.stage_id,
        to_stage_id: targetStageId,
      });

      // Reload pipeline data to reflect changes
      await loadPipelineData();
      toast.success(t('kanban.messages.itemMoved'));
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(t('kanban.messages.itemMoveError'));
    } finally {
      setDraggedItem(null);
      isDraggingRef.current = false;
      suppressClickUntilRef.current = Date.now() + 200;
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  // Calculate stage total value
  const calculateStageTotal = (items: PipelineItem[] = []) => {
    return items.reduce((total, item) => {
      return total + (item.value || 0);
    }, 0);
  };

  // Calculate pipeline total value
  const calculatePipelineTotal = () => {
    return stages.reduce((total, stage) => {
      return total + calculateStageTotal(stage.items);
    }, 0);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Get contact color
  const getContactColor = (name?: string) => {
    if (!name) return '#6B7280';
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F97316'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Pipeline management handlers
  const handleEditPipeline = () => {
    setShowEditPipelineModal(true);
  };

  const handleUpdatePipeline = async (data: UpdatePipelineData) => {
    if (!pipeline) return;

    setIsUpdatingPipeline(true);
    try {
      await pipelinesService.updatePipeline(pipeline.id, data);
      toast.success(t('messages.updateSuccess'));
      setShowEditPipelineModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('messages.updateError'));
    } finally {
      setIsUpdatingPipeline(false);
    }
  };

  const handleDeletePipeline = () => {
    setShowDeletePipelineModal(true);
  };

  const handleConfirmDeletePipeline = async () => {
    if (!pipeline) return;

    setIsDeletingPipeline(true);
    try {
      await pipelinesService.deletePipeline(pipeline.id);
      toast.success(t('messages.deleteSuccess'));
      setShowDeletePipelineModal(false);
      navigate('/pipelines');
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setIsDeletingPipeline(false);
    }
  };

  const handleReorderStages = () => {
    setShowReorderStagesModal(true);
  };

  const handleUpdateStageOrder = async (orderedStages: PipelineStage[]) => {
    if (!pipelineId) return;

    setIsReorderingStages(true);
    try {
      // Backend expects just an array of stage IDs in the correct order
      const stageOrders = orderedStages.map(stage => stage.id);

      await pipelinesService.reorderPipelineStages(pipelineId, stageOrders);

      toast.success(t('kanban.messages.stageReordered'));
      setShowReorderStagesModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error reordering stages:', error);
      toast.error(t('kanban.messages.stageReorderError'));
    } finally {
      setIsReorderingStages(false);
    }
  };

  // Stage management handlers
  const handleCreateStage = async (data: CreateStageData) => {
    if (!pipeline) return;

    setIsCreatingStage(true);
    try {
      await pipelinesService.createPipelineStage(pipeline.id, data);
      toast.success(t('kanban.messages.stageCreated'));
      setShowCreateStageModal(false);
      // Reload pipeline data to show new stage
      await loadPipelineData();
    } catch (error) {
      console.error('Error creating stage:', error);
      toast.error(t('kanban.messages.stageCreateError'));
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Item management handlers
  const handleAddItem = (stage?: PipelineStage) => {
    setSelectedStageForItem(stage || stages[0] || null);
    setShowAddItemModal(true);
  };

  const handleItemAdded = async () => {
    toast.success(t('kanban.messages.itemAdded'));
    // Reload pipeline data to show new item
    await loadPipelineData();
  };

  const handleRemoveItem = (item: PipelineItem) => {
    setItemToRemove(item);
    setShowRemoveItemModal(true);
  };

  const handleConfirmRemoveItem = async () => {
    if (!itemToRemove || !pipelineId) return;

    setIsRemovingItem(true);
    try {
      await pipelinesService.removeItemFromPipeline(pipelineId, itemToRemove.id);
      toast.success(t('kanban.messages.itemRemoved'));
      setShowRemoveItemModal(false);
      setItemToRemove(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error removing item from pipeline:', error);
      toast.error(t('kanban.messages.itemRemoveError'));
    } finally {
      setIsRemovingItem(false);
    }
  };

  const handleEditItem = (item: PipelineItem) => {
    setItemToEdit(item);
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (data: {
    notes: string;
    stage_id: string;
    services: Array<{ name: string; value: string }>;
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => {
    if (!itemToEdit || !pipelineId) return;

    setIsEditingItem(true);
    try {
      await pipelinesService.updateItemInPipeline(pipelineId, itemToEdit.id, {
        pipeline_stage_id: data.stage_id,
        notes: data.notes,
        custom_fields: {
          services: data.services,
          currency: data.currency,
          // Merge custom attributes into custom_fields (backend expects them here)
          ...(data.custom_attributes || {}),
        },
      });
      toast.success(t('kanban.messages.itemUpdated'));
      setShowEditItemModal(false);
      setItemToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(t('kanban.messages.itemUpdateError'));
    } finally {
      setIsEditingItem(false);
    }
  };

  // Stage management handlers
  const handleEditStage = (stage: PipelineStage) => {
    setStageToEdit(stage);
    setShowEditStageModal(true);
  };

  const handleUpdateStage = async (data: {
    name: string;
    color: string;
    stage_type: string;
    automation_rules?: { description?: string };
    custom_fields?: Record<string, unknown>;
  }) => {
    if (!stageToEdit || !pipelineId) return;

    setIsEditingStage(true);
    try {
      await pipelinesService.updatePipelineStage(pipelineId, stageToEdit.id, {
        name: data.name,
        color: data.color,
        stage_type: data.stage_type,
        automation_rules: data.automation_rules,
        custom_fields: data.custom_fields,
      });
      toast.success(t('kanban.messages.stageUpdated'));
      setShowEditStageModal(false);
      setStageToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('kanban.messages.stageUpdateError'));
    } finally {
      setIsEditingStage(false);
    }
  };

  const handleDeleteStage = (stage: PipelineStage) => {
    setStageToDelete(stage);
    setShowDeleteStageModal(true);
  };

  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete || !pipelineId) return;

    setIsDeletingStage(true);
    try {
      await pipelinesService.deletePipelineStage(pipelineId, stageToDelete.id);
      toast.success(t('kanban.messages.stageDeleted'));
      setShowDeleteStageModal(false);
      setStageToDelete(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('kanban.messages.stageDeleteError'));
    } finally {
      setIsDeletingStage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeMobileStage = stages.find(s => s.id === activeMobileStageId) || stages[0] || null;

  return (
    <div className="flex w-full h-full min-w-0 overflow-hidden">
      <div className="flex-1 h-full flex flex-col bg-muted/30 min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-background border-b border-border shadow-sm">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 py-2 md:gap-3 md:py-3 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0">
              {/* Navigation and Pipeline Info */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/pipelines')}
                  className="h-10 w-10 md:h-9 md:w-auto p-0 md:px-3 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
                </Button>

                <div className="flex-1 min-w-0 max-w-full lg:max-w-2xl">
                  {/* Pipeline Selector */}
                  <PipelineSwitcher
                    pipelines={allPipelines}
                    selectedPipeline={pipeline}
                    onSwitchPipeline={handlePipelineChange}
                  />
                </div>

                {/* Mobile: ações compactas (add + menu) à direita do switcher */}
                <div className="flex items-center gap-1 lg:hidden shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAddItem(activeMobileStage || undefined)}
                    className="h-10 w-10 p-0"
                    aria-label={t('kanban.header.addItem')}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label="Opções do pipeline">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEditPipeline}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('kanban.header.editPipeline')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleReorderStages}>
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {t('kanban.header.reorderStages')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={handleDeletePipeline}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('kanban.header.deletePipeline')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Quick Stats and Actions (desktop) */}
              <div className="hidden lg:flex w-full flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm lg:w-auto">
                <div className="text-center min-w-16">
                  <div className="font-semibold text-foreground">
                    {pipeline?.item_count || pipeline?.conversations_count || 0}
                  </div>
                  <div className="text-muted-foreground">{t('kanban.header.conversations')}</div>
                </div>
                <div className="text-center min-w-14">
                  <div className="font-semibold text-foreground">{stages.length}</div>
                  <div className="text-muted-foreground">{t('kanban.header.stages')}</div>
                </div>
                {calculatePipelineTotal() > 0 && (
                  <div className="text-center min-w-20">
                    <div className="font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      R$ {formatCurrency(calculatePipelineTotal())}
                    </div>
                    <div className="text-muted-foreground">{t('kanban.header.totalValue')}</div>
                  </div>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAddItem()}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('kanban.header.addItem')}
                </Button>

                {/* Pipeline Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditPipeline}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('kanban.header.editPipeline')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!pipeline?.id) return;
                        await navigator.clipboard.writeText(String(pipeline.id));
                        toast.success(t('kanban.idCopied'));
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('kanban.copyId')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleReorderStages}>
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      {t('kanban.header.reorderStages')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleDeletePipeline}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('kanban.header.deletePipeline')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile: estatísticas em linha compacta */}
            <div className="lg:hidden flex items-center gap-3 pb-2 text-xs text-muted-foreground overflow-x-auto">
              <span><span className="font-semibold text-foreground">{pipeline?.item_count || pipeline?.conversations_count || 0}</span> {t('kanban.header.conversations')}</span>
              <span className="text-muted-foreground/50">·</span>
              <span><span className="font-semibold text-foreground">{stages.length}</span> {t('kanban.header.stages')}</span>
              {calculatePipelineTotal() > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="whitespace-nowrap"><span className="font-semibold text-green-600 dark:text-green-400">R$ {formatCurrency(calculatePipelineTotal())}</span></span>
                </>
              )}
            </div>
          </div>

          {/* Mobile: pills horizontais de estágios */}
          {stages.length > 0 && (
            <div className="lg:hidden border-t border-border bg-muted/30">
              <div className="overflow-x-auto scrollbar-hidden">
                <div className="flex items-center gap-2 px-3 py-2 min-w-max">
                  {stages.map(stage => {
                    const isActive = stage.id === activeMobileStage?.id;
                    const count = stage.items?.length ?? stage.item_count ?? 0;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setActiveMobileStageId(stage.id)}
                        className={`flex items-center gap-2 h-9 px-3 rounded-full border text-sm whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-foreground border-border hover:bg-accent'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium">{stage.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowCreateStageModal(true)}
                    className="flex items-center gap-1 h-9 px-3 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/50 whitespace-nowrap"
                    aria-label={t('kanban.stage.addStage')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kanban Board — Mobile: single-stage vertical stack */}
        <div className="flex-1 overflow-hidden lg:hidden">
          {activeMobileStage ? (
            <div className="h-full overflow-y-auto px-3 py-3 space-y-3">
              {/* Stage header info */}
              <div
                className="rounded-xl border border-border bg-background px-3 py-2.5 flex items-center justify-between gap-2 border-l-4 shadow-sm"
                style={{ borderLeftColor: activeMobileStage.color }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {activeMobileStage.name}
                    </h3>
                    <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full shrink-0">
                      {activeMobileStage.items?.length ?? activeMobileStage.item_count ?? 0}
                    </span>
                  </div>
                  {calculateStageTotal(activeMobileStage.items) > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                      {t('kanban.stage.totalValue', {
                        value: formatCurrency(calculateStageTotal(activeMobileStage.items)),
                      })}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 shrink-0" aria-label="Opções do estágio">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddItem(activeMobileStage)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('kanban.header.addItem')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditStage(activeMobileStage)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('kanban.stage.editStage')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteStage(activeMobileStage)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('kanban.stage.deleteStage')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Items - cards confortáveis pro toque */}
              {(activeMobileStage.items || []).map(item => (
                <div
                  key={item.id}
                  className="bg-background rounded-xl p-3 border border-border shadow-sm active:bg-accent/50 transition-colors cursor-pointer select-none"
                  onClick={() => handleEditItem(item)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11 shrink-0">
                      <div
                        className="absolute inset-0 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm"
                        style={{ backgroundColor: getContactColor(item.contact?.name) }}
                      >
                        {item.contact?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      {((item.contact as any)?.avatar_url || (item.contact as any)?.thumbnail) && (
                        <img
                          src={(item.contact as any).avatar_url || (item.contact as any).thumbnail}
                          alt={item.contact?.name || ''}
                          className="absolute inset-0 w-11 h-11 rounded-full object-cover shadow-sm"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
                          {item.contact?.name || t('kanban.conversation.unknownUser')}
                        </h4>
                        {!item.is_lead && item.conversation?.status && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              item.conversation.status === 'open'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : item.conversation.status === 'resolved'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                          >
                            {item.conversation.status === 'open'
                              ? 'Aberto'
                              : item.conversation.status === 'resolved'
                              ? 'Resolvido'
                              : item.conversation.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.conversation?.last_activity_at
                          ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
                          : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
                        {item.conversation?.assignee && (
                          <> · {item.conversation.assignee.name}</>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 shrink-0" aria-label="Opções do card">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('kanban.item.editItem')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedConversationForSchedule(item);
                            setScheduleActionOpen(true);
                          }}
                        >
                          <CalendarClock className="h-4 w-4 mr-2" />
                          {t('kanban.item.scheduleAction')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveItem(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('kanban.item.removeFromPipeline')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Serviços com valores */}
                  {item.services_info?.has_services && (item.services_info.services?.length ?? 0) > 0 && (
                    <div className="mt-2 p-2 rounded-md bg-muted/40 border border-border/60 text-xs space-y-0.5">
                      {item.services_info.services?.map((svc, idx) => (
                        <div key={`${svc.name}-${idx}`} className="flex items-center justify-between gap-2">
                          <span className="truncate text-foreground">{svc.name}</span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {item.services_info?.currency}{' '}
                            {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(svc.value)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 font-medium">
                        <span className="text-foreground">Total</span>
                        <span className="text-green-600 dark:text-green-400 whitespace-nowrap">
                          {item.services_info.currency} {item.services_info.formatted_total}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty state */}
              {(!activeMobileStage.items || activeMobileStage.items.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-sm mb-3">{t('kanban.stage.noConversations')}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem(activeMobileStage)}
                    className="h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('kanban.header.addItem')}
                  </Button>
                </div>
              )}

              <div className="h-4" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground text-sm">
              {t('kanban.stage.noStages')}
            </div>
          )}
        </div>

        {/* Kanban Board — Desktop: horizontal columns */}
        <div className="flex-1 overflow-hidden hidden lg:block">
          <div className="h-full overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 py-6">
            {/* Kanban Content */}
            <div
              className="flex gap-6 h-full pb-6"
              style={{ width: 'fit-content', minWidth: '100%' }}
            >
              {/* Stage Columns */}
              {stages.map((stage: PipelineStage) => (
                <div key={stage.id} className="w-80 flex-shrink-0">
                  <div className="bg-background rounded-xl shadow-sm border border-border h-full flex flex-col">
                    {/* Stage Header */}
                    <div
                      className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/50 rounded-t-xl border-t-4"
                      style={{ borderTopColor: stage.color }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <h3 className="text-sm font-medium text-foreground">{stage.name}</h3>
                          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                            {stage.items?.length || stage.item_count || 0}
                          </span>
                          {/* Stage Total Value */}
                          {calculateStageTotal(stage.items) > 0 && (
                            <span className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                              {t('kanban.stage.totalValue', {
                                value: formatCurrency(calculateStageTotal(stage.items)),
                              })}
                            </span>
                          )}
                        </div>

                        {/* Stage Options */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStage(stage)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('kanban.stage.editStage')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                await navigator.clipboard.writeText(String(stage.id));
                                toast.success(t('kanban.idCopied'));
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {t('kanban.copyId')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteStage(stage)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('kanban.stage.deleteStage')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Items Drop Zone */}
                    <div
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, stage.id)}
                    >
                      {/* Items */}
                      {(stage.items || []).map(item => (
                        <div
                          key={item.id}
                          className="group bg-background rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer select-none relative"
                          draggable
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (!isDraggingRef.current && Date.now() > suppressClickUntilRef.current) {
                              handleEditItem(item);
                            }
                          }}
                        >
                          {/* Card Options Menu */}
                          <div
                            className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center space-x-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-1 hover:bg-muted"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('kanban.item.editItem')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(String(item.id));
                                      toast.success(t('kanban.idCopied'));
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    {t('kanban.copyId')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedConversationForSchedule(item);
                                      setScheduleActionOpen(true);
                                    }}
                                  >
                                    <CalendarClock className="h-4 w-4 mr-2" />
                                    {t('kanban.item.scheduleAction')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleRemoveItem(item)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('kanban.item.removeFromPipeline')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Contact Info Header — simples: avatar + nome + status aberto/resolvido */}
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="relative w-10 h-10 shrink-0">
                              <div
                                className="absolute inset-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                                style={{ backgroundColor: getContactColor(item.contact?.name) }}
                              >
                                {item.contact?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              {((item.contact as any)?.avatar_url || (item.contact as any)?.thumbnail) && (
                                <img
                                  src={(item.contact as any).avatar_url || (item.contact as any).thumbnail}
                                  alt={item.contact?.name || ''}
                                  className="absolute inset-0 w-10 h-10 rounded-full object-cover shadow-sm"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
                              {item.contact?.name || t('kanban.conversation.unknownUser')}
                            </h4>
                            {!item.is_lead && item.conversation?.status && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  item.conversation.status === 'open'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : item.conversation.status === 'resolved'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}
                              >
                                {item.conversation.status === 'open'
                                  ? 'Aberto'
                                  : item.conversation.status === 'resolved'
                                  ? 'Resolvido'
                                  : item.conversation.status}
                              </span>
                            )}
                          </div>

                          {/* Serviços com valores individuais + total */}
                          {item.services_info?.has_services && (item.services_info.services?.length ?? 0) > 0 && (
                            <div className="mb-2 p-2 rounded-md bg-muted/40 border border-border/60 text-xs space-y-0.5">
                              {item.services_info.services?.map((svc, idx) => (
                                <div key={`${svc.name}-${idx}`} className="flex items-center justify-between gap-2">
                                  <span className="truncate text-foreground">{svc.name}</span>
                                  <span className="text-muted-foreground whitespace-nowrap">
                                    {item.services_info?.currency}{' '}
                                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(svc.value)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60 font-medium">
                                <span className="text-foreground">Total</span>
                                <span className="text-green-600 dark:text-green-400 whitespace-nowrap">
                                  {item.services_info.currency} {item.services_info.formatted_total}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Time and assignee info */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {item.conversation?.last_activity_at
                                ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
                                : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
                            </span>
                            {item.conversation?.assignee && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                {(item.conversation.assignee as any).avatar_url ? (
                                  <img
                                    src={(item.conversation.assignee as any).avatar_url}
                                    alt={item.conversation.assignee.name || ''}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                <span className="truncate max-w-24">
                                  {item.conversation.assignee.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Empty state */}
                      {(!stage.items || stage.items.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">{t('kanban.stage.noConversations')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Stage Column */}
              <div className="w-80 flex-shrink-0">
                <div
                  className="bg-muted/50 rounded-xl p-6 h-full border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => setShowCreateStageModal(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">{t('kanban.stage.addStage')}</h3>
                  <p className="text-xs text-center">{t('kanban.stage.addStageDescription')}</p>
                </div>
              </div>

              {/* Empty state for no stages */}
              {stages.length === 0 && (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center">
                    <div className="text-muted-foreground text-sm">
                      {t('kanban.stage.noStages')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Pipeline Modal */}
      {pipeline && (
        <EditPipelineModal
          open={showEditPipelineModal}
          onOpenChange={setShowEditPipelineModal}
          pipeline={pipeline}
          onSubmit={handleUpdatePipeline}
          loading={isUpdatingPipeline}
        />
      )}

      {/* Create Stage Modal */}
      <CreateStageModal
        open={showCreateStageModal}
        onOpenChange={setShowCreateStageModal}
        onSubmit={handleCreateStage}
        loading={isCreatingStage}
      />

      {/* Add Item Modal */}
      {pipeline && (
        <AddItemModal
          open={showAddItemModal}
          onOpenChange={setShowAddItemModal}
          pipelineId={pipeline.id}
          stages={stages}
          preselectedStage={selectedStageForItem}
          onItemAdded={handleItemAdded}
        />
      )}

      {/* Remove Item Modal */}
      <RemoveItemModal
        open={showRemoveItemModal}
        onOpenChange={setShowRemoveItemModal}
        item={itemToRemove}
        onConfirm={handleConfirmRemoveItem}
        loading={isRemovingItem}
      />

      {/* Edit Item Modal */}
      {itemToEdit && (
        <EditItemModal
          open={showEditItemModal}
          onOpenChange={setShowEditItemModal}
          item={itemToEdit}
          stages={stages}
          pipeline={pipeline}
          onSubmit={handleUpdateItem}
          loading={isEditingItem}
        />
      )}

      {/* Edit Stage Modal */}
      <EditStageModal
        open={showEditStageModal}
        onOpenChange={setShowEditStageModal}
        stage={stageToEdit}
        onSubmit={handleUpdateStage}
        loading={isEditingStage}
      />

      {/* Delete Stage Modal */}
      <DeleteStageModal
        open={showDeleteStageModal}
        onOpenChange={setShowDeleteStageModal}
        stage={stageToDelete}
        itemCount={stageToDelete?.item_count || 0}
        onConfirm={handleConfirmDeleteStage}
        loading={isDeletingStage}
      />

      {/* Delete Pipeline Modal */}
      {pipeline && (
        <DeletePipelineModal
          open={showDeletePipelineModal}
          onOpenChange={setShowDeletePipelineModal}
          pipeline={pipeline}
          onConfirm={handleConfirmDeletePipeline}
          loading={isDeletingPipeline}
        />
      )}

      {/* Reorder Stages Modal */}
      <ReorderStagesModal
        open={showReorderStagesModal}
        onOpenChange={setShowReorderStagesModal}
        stages={stages}
        onSubmit={handleUpdateStageOrder}
        loading={isReorderingStages}
      />

      {/* Schedule Action Modal */}
      {selectedConversationForSchedule && scheduleActionContactId && (
        <ScheduleActionModal
          open={scheduleActionOpen}
          onClose={() => {
            setScheduleActionOpen(false);
            setSelectedConversationForSchedule(null);
          }}
          contactId={scheduleActionContactId}
        />
      )}
    </div>
  );
}
