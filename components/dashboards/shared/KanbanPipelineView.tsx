import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ApplicationStatus, FormData, LenderInfo } from '../../../types';
import { APPLICATION_STATUS_CONFIG, getStatusThemeClasses, normalizeApplicationStatus } from './applicationStatus';

interface KanbanPipelineViewProps {
  merchants: FormData[];
  lenders: LenderInfo[];
  onUpdateMerchant: (updatedMerchant: FormData) => FormData;
  onSelectMerchant?: (merchant: FormData) => void;
  canEdit?: boolean;
}

type BoardColumn = {
  status: ApplicationStatus;
  cards: FormData[];
};

const money = (value?: string) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? `$${number.toLocaleString()}` : 'N/A';
};

const getPrimaryEmail = (merchant: FormData) => merchant.owners[0]?.email || 'N/A';
const getPrimaryPhone = (merchant: FormData) => merchant.owners[0]?.cellPhone || merchant.businessInfo.phone || 'N/A';

const getStateFromAddress = (address?: string) => {
  if (!address) return 'N/A';
  const parts = address.split(',').map(part => part.trim()).filter(Boolean);
  const lastPart = parts[parts.length - 1] || address;
  const stateMatch = lastPart.match(/\b[A-Z]{2}\b/);
  return stateMatch?.[0] || lastPart;
};

const PipelineCardContent: React.FC<{ merchant: FormData; lenders: LenderInfo[] }> = ({ merchant, lenders }) => {
  const matchedCount = merchant.matchedLenderIds?.length || 0;
  const offersCount = merchant.offers?.length || 0;
  const acceptedOffer = merchant.offers?.find(offer => offer.status === 'Accepted');
  const signedLabel = merchant.status === 'contract signed' || merchant.status === 'FUNDED' ? 'Yes' : 'No';
  const matchedLenderNames = (merchant.matchedLenderIds || [])
    .map(lenderId => lenders.find(lender => lender.id === lenderId)?.lenderName)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2.5 shrink-0 w-full mb-4 last:mb-0 hover:border-theme-teal/70 hover:shadow-md transition-all">
      <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate" title={merchant.businessInfo.legalName}>
        {merchant.businessInfo.legalName || 'Unnamed Business'}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5">
        Requested: <span className="font-semibold text-slate-700 dark:text-slate-200">{money(merchant.requestedAmount)}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5">
        Phone: <span className="font-medium text-slate-700 dark:text-slate-200">{getPrimaryPhone(merchant)}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate" title={getPrimaryEmail(merchant)}>
        Email: <span className="font-medium text-slate-700 dark:text-slate-200">{getPrimaryEmail(merchant)}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5">
        State / TZ: <span className="font-medium text-slate-700 dark:text-slate-200">{getStateFromAddress(merchant.businessInfo.address)}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5">
        Lenders: <span className="font-medium text-slate-700 dark:text-slate-200">{matchedCount} matched / {offersCount} offer{offersCount === 1 ? '' : 's'}</span>
      </div>
      {matchedLenderNames && (
        <div className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate" title={matchedLenderNames}>
          Sent to: <span className="font-medium text-slate-700 dark:text-slate-200">{matchedLenderNames}</span>
        </div>
      )}
      {acceptedOffer && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 border-b border-slate-100 dark:border-slate-700 pb-1.5 truncate">
          Accepted: {acceptedOffer.lenderName} / {money(acceptedOffer.amount)}
        </div>
      )}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Contract Signed: <span className="font-medium text-slate-700 dark:text-slate-200">{signedLabel}</span>
      </div>
    </div>
  );
};

const SortablePipelineCard: React.FC<{
  merchant: FormData;
  lenders: LenderInfo[];
  onSelectMerchant?: (merchant: FormData) => void;
}> = ({ merchant, lenders, onSelectMerchant }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: merchant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelectMerchant?.(merchant)}
      className="touch-none cursor-grab active:cursor-grabbing w-full text-left focus:outline-none focus:ring-2 focus:ring-theme-teal rounded-lg"
    >
      <PipelineCardContent merchant={merchant} lenders={lenders} />
    </button>
  );
};

const DroppableColumn: React.FC<{
  column: BoardColumn;
  idx: number;
  lenders: LenderInfo[];
  onSelectMerchant?: (merchant: FormData) => void;
}> = ({ column, idx, lenders, onSelectMerchant }) => {
  const { setNodeRef } = useDroppable({ id: column.status });
  const config = APPLICATION_STATUS_CONFIG.find(status => status.label === column.status)!;
  const themeClasses = getStatusThemeClasses(config.theme);

  return (
    <div className={`w-[330px] shrink-0 h-full flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${themeClasses.border}`}>
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2 sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 rounded-t-2xl">
        <span className={`text-sm font-bold uppercase tracking-wide leading-snug ${themeClasses.title}`}>
          {idx + 1}. {column.status}
        </span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {column.cards.length} Card{column.cards.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
        <SortableContext items={column.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map(merchant => (
            <SortablePipelineCard key={merchant.id} merchant={merchant} lenders={lenders} onSelectMerchant={onSelectMerchant} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export const KanbanPipelineView: React.FC<KanbanPipelineViewProps> = ({ merchants, lenders, onUpdateMerchant, onSelectMerchant, canEdit = true }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<Record<ApplicationStatus, string[]>>({} as Record<ApplicationStatus, string[]>);

  const normalizedMerchants = useMemo(() => merchants.map(merchant => ({
    ...merchant,
    status: normalizeApplicationStatus(merchant.status),
  })), [merchants]);

  const boardData = useMemo<BoardColumn[]>(() => {
    return APPLICATION_STATUS_CONFIG.map(config => {
      const cards = normalizedMerchants.filter(merchant => merchant.status === config.label);
      const order = localOrder[config.label] || [];
      const orderedCards = [...cards].sort((a, b) => {
        const aIndex = order.indexOf(a.id);
        const bIndex = order.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      return { status: config.label, cards: orderedCards };
    });
  }, [normalizedMerchants, localOrder]);

  const activeMerchant = activeId ? normalizedMerchants.find(merchant => merchant.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string): ApplicationStatus | undefined => {
    if (APPLICATION_STATUS_CONFIG.some(config => config.label === id)) return id as ApplicationStatus;
    return boardData.find(column => column.cards.some(card => card.id === id))?.status;
  };

  const setColumnOrderFromBoard = (columns: BoardColumn[]) => {
    setLocalOrder(columns.reduce((acc, column) => ({
      ...acc,
      [column.status]: column.cards.map(card => card.id),
    }), {} as Record<ApplicationStatus, string[]>));
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!canEdit) return;
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    const activeCardId = active.id as string;
    const activeContainer = findContainer(activeCardId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    const currentColumns = boardData.map(column => ({ ...column, cards: [...column.cards] }));
    const activeColIndex = currentColumns.findIndex(column => column.status === activeContainer);
    const overColIndex = currentColumns.findIndex(column => column.status === overContainer);
    const activeCol = currentColumns[activeColIndex];
    const overCol = currentColumns[overColIndex];
    const activeIndex = activeCol.cards.findIndex(card => card.id === activeCardId);
    const movingCard = activeCol.cards[activeIndex];
    if (!movingCard) return;

    let overIndex: number;
    if (overId === overContainer) {
      overIndex = overCol.cards.length;
    } else {
      const sortableIndex = over.data.current?.sortable?.index;
      overIndex = typeof sortableIndex === 'number' ? sortableIndex : overCol.cards.length;
    }

    currentColumns[activeColIndex] = {
      ...activeCol,
      cards: activeCol.cards.filter(card => card.id !== activeCardId),
    };
    currentColumns[overColIndex] = {
      ...overCol,
      cards: [
        ...overCol.cards.slice(0, overIndex),
        { ...movingCard, status: overContainer },
        ...overCol.cards.slice(overIndex),
      ],
    };

    setColumnOrderFromBoard(currentColumns);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeCardId = active.id as string;
    const activeContainer = findContainer(activeCardId);
    const overContainer = findContainer(over.id as string);
    const originalMerchant = merchants.find(merchant => merchant.id === activeCardId);
    if (!activeContainer || !overContainer || !originalMerchant) return;

    const sourceColumn = boardData.find(column => column.status === activeContainer);
    const destinationColumn = boardData.find(column => column.status === overContainer);
    if (!sourceColumn || !destinationColumn) return;

    if (activeContainer === overContainer) {
      const activeIndex = sourceColumn.cards.findIndex(card => card.id === activeCardId);
      const overIndex = destinationColumn.cards.findIndex(card => card.id === over.id);
      if (activeIndex !== overIndex && activeIndex >= 0 && overIndex >= 0) {
        const reorderedCards = arrayMove(sourceColumn.cards, activeIndex, overIndex) as FormData[];
        setLocalOrder(prev => ({ ...prev, [activeContainer]: reorderedCards.map(card => card.id) }));
      }
      return;
    }

    onUpdateMerchant({
      ...originalMerchant,
      status: overContainer,
    });
  };

  return (
    <div className="h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] flex flex-col min-h-[720px]">
      <div className="mb-5 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card px-6 py-5 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kamba Pipeline</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">Drag deals through the 12-step funding flow. This board controls the real application status and is built as a full workspace for managing many deals across many stages.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">{normalizedMerchants.length} total deal{normalizedMerchants.length === 1 ? '' : 's'}</span>
          <span className="rounded-full bg-theme-yellow px-4 py-2 font-semibold text-theme-black">12 pipeline steps</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-950/50 p-4 shadow-inner overflow-hidden">
          <div className="flex h-full flex-row w-full overflow-x-auto overflow-y-hidden scroll-smooth pb-4 gap-5 box-border">
            {boardData.map((column, idx) => (
              <DroppableColumn key={column.status} column={column} idx={idx} lenders={lenders} onSelectMerchant={onSelectMerchant} />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.4' } },
          }),
        }}>
          {activeMerchant ? <div className="w-[306px]"><PipelineCardContent merchant={activeMerchant} lenders={lenders} /></div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
