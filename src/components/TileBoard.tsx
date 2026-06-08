import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore, localDayKey, SPOTLIGHT_CAP, type Tile } from '../store';
import './TileBoard.css';

// Order tiles by their manual priority (sortIndex), falling back to creation time.
const byPriority = (a: Tile, b: Tile) =>
  (a.sortIndex ?? a.createdAt) - (b.sortIndex ?? b.createdAt);

const DRAG_THRESHOLD = 6; // px of movement that counts as a drag, not a click

interface SquareTileProps {
  tile: Tile;
  spotlightActive: boolean;   // is *any* tile spotlighted right now?
  isSpotlit: boolean;         // is *this* tile spotlighted?
  isEditing: boolean;
  isChopping: boolean;
  onComplete: (id: string) => void;
  onToggleSpotlight: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onChop: (id: string, lines: string[]) => void;
  onStartChop: (id: string) => void;
  onEndEdit: () => void;
  onEndChop: () => void;
  onHover: (id: string | null) => void;
  onRoute?: (id: string, section: string) => void; // inbox only
}

const SquareTile = ({
  tile, spotlightActive, isSpotlit, isEditing, isChopping,
  onComplete, onToggleSpotlight, onEdit, onChop, onStartChop,
  onEndEdit, onEndChop, onHover, onRoute,
}: SquareTileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.id });

  const [editText, setEditText] = useState(tile.title);
  const [chopText, setChopText] = useState('');
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // When something is spotlighted and this tile isn't, blur + dim it.
  const dimmed = spotlightActive && !isSpotlit;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ['--tile-color' as any]: tile.color,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const classes = [
    'tile',
    isSpotlit ? 'tile--spotlit' : '',
    dimmed ? 'tile--dimmed' : '',
    (isEditing || isChopping) ? 'tile--editing' : '',
  ].filter(Boolean).join(' ');

  // Single click = complete — but only if it wasn't actually a drag.
  const handleClick = (e: React.MouseEvent) => {
    if (isEditing || isChopping) return;
    const start = pointerStart.current;
    if (start) {
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > DRAG_THRESHOLD) return; // it was a drag, ignore the click
    }
    onComplete(tile.id);
  };

  // Right click = chop (only worthwhile for gear > 1).
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEditing || isChopping) return;
    if (tile.gear > 1) onStartChop(tile.id);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editText.trim()) onEdit(tile.id, editText.trim());
    onEndEdit();
  };
  const submitChop = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = chopText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length) onChop(tile.id, lines);
    setChopText('');
    onEndChop();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes}
      {...attributes}
      {...listeners}
      onPointerDownCapture={(e) => { pointerStart.current = { x: e.clientX, y: e.clientY }; }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => onHover(tile.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="tile__gear">G{tile.gear}</span>

      {/* Spotlight toggle — revealed on hover, never completes the tile */}
      <button
        className="tile__star"
        onClick={(e) => { e.stopPropagation(); onToggleSpotlight(tile.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Spotlight for today"
      >
        {isSpotlit ? '✨' : '☆'}
      </button>

      {isEditing ? (
        <form
          onSubmit={submitEdit}
          className="tile__form"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} />
          <div className="tile__formrow">
            <button type="submit">Save</button>
            <button type="button" onClick={onEndEdit}>✕</button>
          </div>
        </form>
      ) : isChopping ? (
        <form
          onSubmit={submitChop}
          className="tile__form"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="tile__choplabel">Chop into Gear {tile.gear - 1}</div>
          <textarea
            autoFocus rows={3} value={chopText}
            placeholder={'Sub-task 1\nSub-task 2'}
            onChange={e => setChopText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitChop(e); }}
          />
          <div className="tile__formrow">
            <button type="submit">Chop</button>
            <button type="button" onClick={onEndChop}>✕</button>
          </div>
        </form>
      ) : (
        <div className="tile__title">{tile.title}</div>
      )}

      {/* Inbox routing — the one essential control on triage tiles */}
      {onRoute && !isEditing && !isChopping && (
        <select
          className="tile__route"
          defaultValue="default"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={e => onRoute(tile.id, e.target.value)}
        >
          <option value="default" disabled>Route…</option>
          <option value="active">🚀 Active Grid</option>
          <option value="someday">❄️ Icebox</option>
        </select>
      )}
    </div>
  );
};

interface TileBoardProps {
  tiles: Tile[];                                   // already filtered by caller
  onRoute?: (id: string, section: string) => void; // inbox passes a router
  emptyMessage?: string;
}

export const TileBoard = ({ tiles, onRoute, emptyMessage }: TileBoardProps) => {
  const {
    completeTile, deleteTile, editTile, chopTile,
    reorderTiles, toggleSpotlight, clearSpotlight, spotlightIds, spotlightDay,
  } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_THRESHOLD } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [choppingId, setChoppingId] = useState<string | null>(null);
  // Hovered tile is read by the global keyboard handler — keep it in a ref so
  // the listener always sees the current value without re-binding.
  const hoveredRef = useRef<string | null>(null);

  // Keyboard gestures act on whichever tile the cursor is over:
  //   Cmd/Ctrl + E → edit   ·   Cmd/Ctrl + D → delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const id = hoveredRef.current;
      if (!id) return;
      const key = e.key.toLowerCase();
      if (key === 'e') {
        e.preventDefault();
        setChoppingId(null);
        setEditingId(id);
      } else if (key === 'd') {
        e.preventDefault();
        deleteTile(id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteTile]);

  const liveSpotlight = spotlightDay === localDayKey() ? spotlightIds : [];
  const spotlightActive = liveSpotlight.length > 0;

  // Anti-gravity: active tiles float to the top in priority order; completed
  // tiles sink to a quiet section below.
  const { active, done } = useMemo(() => {
    const sorted = [...tiles].sort(byPriority);
    return {
      active: sorted.filter(t => !t.isCompleted),
      done: sorted.filter(t => t.isCompleted),
    };
  }, [tiles]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: dragged, over } = e;
    if (!over || dragged.id === over.id) return;
    const ids = active.map(t => t.id);
    const from = ids.indexOf(dragged.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    reorderTiles(arrayMove(ids, from, to));
  };

  if (tiles.length === 0) {
    return <div className="board__empty">{emptyMessage ?? 'Nothing here yet.'}</div>;
  }

  return (
    <div className="board">
      {spotlightActive && (
        <div className="board__focusbar">
          🎯 Focusing on {liveSpotlight.length} task{liveSpotlight.length > 1 ? 's' : ''}
          {liveSpotlight.length >= SPOTLIGHT_CAP && ' (max)'}
          <button onClick={clearSpotlight}>clear</button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={active.map(t => t.id)} strategy={rectSortingStrategy}>
          <div className="board__grid">
            {active.map(tile => (
              <SquareTile
                key={tile.id}
                tile={tile}
                spotlightActive={spotlightActive}
                isSpotlit={liveSpotlight.includes(tile.id)}
                isEditing={editingId === tile.id}
                isChopping={choppingId === tile.id}
                onComplete={completeTile}
                onToggleSpotlight={toggleSpotlight}
                onEdit={editTile}
                onChop={chopTile}
                onStartChop={(id) => { setEditingId(null); setChoppingId(id); }}
                onEndEdit={() => setEditingId(null)}
                onEndChop={() => setChoppingId(null)}
                onHover={(id) => { hoveredRef.current = id; }}
                onRoute={onRoute}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {done.length > 0 && (
        <>
          <div className="board__divider">Completed ({done.length}) · ⌘D to remove</div>
          <div className="board__grid board__grid--done">
            {done.map(tile => (
              <div
                key={tile.id}
                className="tile tile--done"
                onMouseEnter={() => { hoveredRef.current = tile.id; }}
                onMouseLeave={() => { hoveredRef.current = null; }}
              >
                <span className="tile__gear">G{tile.gear}</span>
                <div className="tile__title">{tile.title}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
