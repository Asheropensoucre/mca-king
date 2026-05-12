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
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';

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

const PipelineCardContent: React.FC<{ merchant: FormData; lenders: LenderInfo[]; compact?: boolean }> = ({ merchant, lenders, compact = false }) => {
  const matchedCount = merchant.matchedLenderIds?.length || 0;
  const offersCount = merchant.offers?.length || 0;
  const acceptedOffer = merchant.offers?.find(offer => offer.status === 'Accepted');
  const signedLabel = merchant.status === 'contract signed' || merchant.status === 'FUNDED' ? 'Yes' : 'No';
  const matchedLenderNames = (merchant.matchedLenderIds || [])
    .map(lenderId => lenders.find(lender => lender.id === lenderId)?.lenderName)
    .filter(Boolean)
    .slice(0, compact ? 2 : 6)
    .join(', ');

  return (
    <div className="w-full shrink-0 rounded-xl border-2 border-theme-maroon/80 bg-white/95 p-5 shadow-[6px_6px_0_var(--ct-primary)] transition-all hover:border-theme-teal/70 dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
      <div className="truncate text-base font-black text-theme-maroon dark:text-theme-yellow" title={merchant.businessInfo.legalName}>
        {merchant.businessInfo.legalName || 'Unnamed Business'}
      </div>
      <div className="mt-2 space-y-2">
        <div className="border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Requested: <span className="font-semibold text-slate-700 dark:text-slate-200">{money(merchant.requestedAmount)}</span>
        </div>
        <div className="border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Phone: <span className="font-medium text-slate-700 dark:text-slate-200">{getPrimaryPhone(merchant)}</span>
        </div>
        <div className="truncate border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400" title={getPrimaryEmail(merchant)}>
          Email: <span className="font-medium text-slate-700 dark:text-slate-200">{getPrimaryEmail(merchant)}</span>
        </div>
        <div className="border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          State / TZ: <span className="font-medium text-slate-700 dark:text-slate-200">{getStateFromAddress(merchant.businessInfo.address)}</span>
        </div>
        <div className="border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Lenders: <span className="font-medium text-slate-700 dark:text-slate-200">{matchedCount} matched / {offersCount} offer{offersCount === 1 ? '' : 's'}</span>
        </div>
        {matchedLenderNames && (
          <div className="truncate border-b border-slate-200 pb-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400" title={matchedLenderNames}>
            Sent to: <span className="font-medium text-slate-700 dark:text-slate-200">{matchedLenderNames}</span>
          </div>
        )}
        {acceptedOffer && (
          <div className="truncate border-b border-slate-200 pb-1.5 text-xs text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
            Accepted: {acceptedOffer.lenderName} / {money(acceptedOffer.amount)}
          </div>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Contract Signed: <span className="font-medium text-slate-700 dark:text-slate-200">{signedLabel}</span>
        </div>
      </div>
    </div>
  );
};

const SortablePipelineCard: React.FC<{
  merchant: FormData;
  lenders: LenderInfo[];
  onOpenCard: (merchant: FormData) => void;
}> = ({ merchant, lenders, onOpenCard }) => {
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
      onClick={() => onOpenCard(merchant)}
      className="mb-4 w-full touch-none cursor-grab rounded-lg text-left last:mb-0 focus:outline-none focus:ring-2 focus:ring-theme-teal active:cursor-grabbing"
    >
      <PipelineCardContent merchant={merchant} lenders={lenders} compact />
    </button>
  );
};

const DroppableColumn: React.FC<{
  column: BoardColumn;
  idx: number;
  lenders: LenderInfo[];
  onOpenCard: (merchant: FormData) => void;
}> = ({ column, idx, lenders, onOpenCard }) => {
  const { setNodeRef } = useDroppable({ id: column.status });
  const config = APPLICATION_STATUS_CONFIG.find(status => status.label === column.status)!;
  const themeClasses = getStatusThemeClasses(config.theme);

  return (
    <div className={`flex h-full w-[330px] shrink-0 flex-col rounded-2xl border bg-slate-100 shadow-sm dark:bg-slate-900 ${themeClasses.border}`}>
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-t-2xl border-b border-slate-200 bg-slate-100 p-5 dark:border-slate-700 dark:bg-slate-900">
        <span className={`text-sm font-bold uppercase leading-snug tracking-wide ${themeClasses.title}`}>
          {idx + 1}. {column.status}
        </span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {column.cards.length} Card{column.cards.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <SortableContext items={column.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map(merchant => (
            <SortablePipelineCard key={merchant.id} merchant={merchant} lenders={lenders} onOpenCard={onOpenCard} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const ExpandedPipelineCard: React.FC<{
  merchant: FormData;
  lenders: LenderInfo[];
  currentIndex: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelectMerchant?: (merchant: FormData) => void;
}> = ({ merchant, lenders, currentIndex, total, onClose, onPrevious, onNext, onSelectMerchant }) => {
  const primaryOwner = merchant.owners[0];
  const statusConfig = APPLICATION_STATUS_CONFIG.find(config => config.label === merchant.status);
  const statusTheme = statusConfig ? getStatusThemeClasses(statusConfig.theme) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-theme-inverse-surface/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Expanded Kamba card">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-theme-primary bg-theme-surface-container-lowest shadow-[10px_10px_0_var(--ct-primary)] dark:border-theme-inverse-primary dark:bg-theme-primary dark:shadow-[10px_10px_0_var(--ct-secondary-fixed-dim)]">
        <div className="flex flex-col gap-4 border-b-2 border-theme-outline-variant bg-theme-surface-container p-5 dark:bg-theme-primary-container sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-theme-secondary dark:text-theme-secondary-fixed">Kamba Card {currentIndex + 1} of {total}</p>
            <h2 className="mt-1 text-3xl font-black text-theme-primary dark:text-theme-tertiary-fixed">{merchant.businessInfo.legalName || 'Unnamed Business'}</h2>
            <p className="mt-1 text-sm font-semibold text-theme-on-surface-variant dark:text-theme-inverse-on-surface">{merchant.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton label="Previous" size="small" onClick={onPrevious} disabled={total <= 1} />
            <PrimaryButton label="Next" size="small" onClick={onNext} disabled={total <= 1} />
            {onSelectMerchant && <PrimaryButton label="Open Deal Details" size="small" variant="funded" onClick={() => onSelectMerchant(merchant)} />}
            <PrimaryButton label="Close" size="small" variant="danger" onClick={onClose} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <PipelineCardContent merchant={merchant} lenders={lenders} />
            <div className="rounded-xl border border-theme-outline-variant bg-theme-surface-container-low p-5 dark:bg-theme-primary-container">
              <h3 className="text-lg font-black text-theme-primary dark:text-theme-tertiary-fixed">Business Snapshot</h3>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Requested Amount</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{money(merchant.requestedAmount)}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Monthly Revenue</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{money(merchant.businessInfo.monthlyRevenue)}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Industry</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{merchant.businessInfo.industryType || 'N/A'}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">State / TZ</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{getStateFromAddress(merchant.businessInfo.address)}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Entity Type</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{merchant.businessInfo.entityType || 'N/A'}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Recent NSFs</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{merchant.businessInfo.recentNSFs || 'N/A'}</dd></div>
              </dl>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-theme-outline-variant bg-theme-surface-container-low p-5 dark:bg-theme-primary-container">
              <h3 className="text-lg font-black text-theme-primary dark:text-theme-tertiary-fixed">Primary Contact</h3>
              <dl className="mt-4 space-y-3">
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Name</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{primaryOwner?.name || 'N/A'}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Phone</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{getPrimaryPhone(merchant)}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Email</dt><dd className="break-all font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{getPrimaryEmail(merchant)}</dd></div>
                <div><dt className="text-xs font-black uppercase text-theme-secondary dark:text-theme-secondary-fixed">Credit Score</dt><dd className="font-bold text-theme-on-surface dark:text-theme-inverse-on-surface">{primaryOwner?.creditScore || 'N/A'}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-theme-outline-variant bg-theme-surface-container-low p-5 dark:bg-theme-primary-container">
              <h3 className="text-lg font-black text-theme-primary dark:text-theme-tertiary-fixed">Pipeline Stage</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTheme?.badge ?? 'bg-theme-surface-container-high text-theme-on-surface'}`}>{merchant.status}</span>
                <span className="rounded-full bg-theme-secondary-fixed px-3 py-1 text-xs font-black text-theme-on-secondary-fixed">{merchant.offers?.length || 0} Offer{(merchant.offers?.length || 0) === 1 ? '' : 's'}</span>
                <span className="rounded-full bg-theme-tertiary-fixed px-3 py-1 text-xs font-black text-theme-on-tertiary-fixed">{merchant.matchedLenderIds?.length || 0} Lender{(merchant.matchedLenderIds?.length || 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const KanbanPipelineView: React.FC<KanbanPipelineViewProps> = ({ merchants, lenders, onUpdateMerchant, onSelectMerchant, canEdit = true }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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

  const orderedBoardCards = useMemo(() => boardData.flatMap(column => column.cards), [boardData]);
  const expandedCardIndex = expandedCardId ? orderedBoardCards.findIndex(card => card.id === expandedCardId) : -1;
  const expandedMerchant = expandedCardIndex >= 0 ? orderedBoardCards[expandedCardIndex] : null;
  const activeMerchant = activeId ? normalizedMerchants.find(merchant => merchant.id === activeId) : null;

  const openExpandedCard = (merchant: FormData) => setExpandedCardId(merchant.id);
  const closeExpandedCard = () => setExpandedCardId(null);
  const showPreviousExpandedCard = () => {
    if (!orderedBoardCards.length || expandedCardIndex < 0) return;
    const previousIndex = (expandedCardIndex - 1 + orderedBoardCards.length) % orderedBoardCards.length;
    setExpandedCardId(orderedBoardCards[previousIndex].id);
  };
  const showNextExpandedCard = () => {
    if (!orderedBoardCards.length || expandedCardIndex < 0) return;
    const nextIndex = (expandedCardIndex + 1) % orderedBoardCards.length;
    setExpandedCardId(orderedBoardCards[nextIndex].id);
  };

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
    <div className="flex h-[calc(100vh-2rem)] min-h-[720px] flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-700 dark:bg-dark-card xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-black text-theme-maroon dark:text-theme-yellow">Kamba Pipeline</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Drag deals through the 12-step funding flow. Click any card to open a fullscreen Kamba card view and switch between deals.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{normalizedMerchants.length} total deal{normalizedMerchants.length === 1 ? '' : 's'}</span>
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
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200/60 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-950/50">
          <div className="box-border flex h-full w-full flex-row gap-5 overflow-x-auto overflow-y-hidden scroll-smooth pb-4">
            {boardData.map((column, idx) => (
              <DroppableColumn key={column.status} column={column} idx={idx} lenders={lenders} onOpenCard={openExpandedCard} />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.4' } },
          }),
        }}>
          {activeMerchant ? <div className="w-[306px]"><PipelineCardContent merchant={activeMerchant} lenders={lenders} compact /></div> : null}
        </DragOverlay>
      </DndContext>

      {expandedMerchant && (
        <ExpandedPipelineCard
          merchant={expandedMerchant}
          lenders={lenders}
          currentIndex={expandedCardIndex}
          total={orderedBoardCards.length}
          onClose={closeExpandedCard}
          onPrevious={showPreviousExpandedCard}
          onNext={showNextExpandedCard}
          onSelectMerchant={onSelectMerchant}
        />
      )}
    </div>
  );
};
