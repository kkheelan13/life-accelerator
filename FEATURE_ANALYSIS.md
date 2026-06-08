# Life Accelerator — Feature Analysis

> **App version:** v0.4.1 (Patch) · **Codename:** "Orbital Command"
> **Stack:** React 18 + TypeScript + Vite · React Three Fiber / Drei / Cannon (3D) · Zustand (state) · Framer Motion · Supabase (cloud DB + realtime)
> **Concept:** A gamified, 3D "command center" for personal task management. Life areas are floating islands in space; tasks are physical tiles that ride conveyor belts and can be broken down, sidelined, completed, and synced to the cloud.

---

## 1. Core Concept & Mental Model

Life Accelerator reframes a to-do list as a spatial, sci-fi command interface:

- **Islands** = life categories (Work, Health, Running, Study, Hobbies, Admin) floating in an orbital star field.
- **Tiles** = individual tasks, rendered as glowing 3D slabs that ride along "conveyor belts."
- **Gears (1–3)** = task granularity / size. Big tasks (Gear 3) get "chopped" into smaller sub-tasks (Gear 2, then Gear 1).
- **XP & Streaks** = gamification rewards that visibly grow the 3D world (e.g., the Work tower rises as XP climbs).
- **Cloud-first** = everything persists to Supabase and syncs in realtime across devices.

---

## 2. Navigation & Views

The app has three top-level views, controlled by `view` state (`'world' | 'focus' | 'admin'`):

- **World View ("Orbital Command")**
  - The 3D map of all life-area islands.
  - Click any island to drill into its Focus view.
- **Focus View (per-category)**
  - The conveyor-belt workspace for a single category's tasks.
  - Title bar shows the category name in uppercase.
- **Admin View ("System Triage")**
  - A flat 2D HTML inbox panel (no 3D canvas) for triaging newly captured tasks.
  - **This is the default landing view on app load.**

### Navigation controls
- **App title (clickable)** — acts as an "exit/back" button; returns to the World map.
- **📥 INBOX button** — jumps to Admin triage (hidden while already in Admin).
- **MAP button** — (Focus view) returns to the World map.
- **LAUNCH 3D GRID button** — (Admin view) exits triage into the 3D world.
- **OrbitControls** — drag to orbit the camera; zoom is clamped (min distance 3, max 20); panning disabled.

---

## 3. Task Capture & Triage

### Brain Dump / Fast Capture
- A floating **"+ ADD RAW DATA"** button (bottom-center) in Focus view.
- Expands into a **FAST CAPTURE** textarea panel.
  - **Multi-line entry** — each line becomes a separate task.
  - Submit via button or **Ctrl/Cmd + Enter**.
  - New tasks always default into the **Admin inbox first** (`section: 'admin'`), regardless of capture context.
  - Panel border color adapts to the active category's color.

### Inbox Triage (Admin Panel)
- Grid of cards, one per uncompleted inbox task.
- Each card offers a **"Route to Pipeline..."** dropdown:
  - **🚀 Active Grid (3D)** — deploys the task into the live 3D workspace (`section: 'active'`).
  - **❄️ Icebox (Someday)** — defers the task (`section: 'someday'`).
- **TRASH** button to delete the task.
- Empty state: *"No raw data. Inbox zero achieved."*

---

## 4. Task Tiles & Interactions (Focus View)

Each task is a `TileCard` — a 3D slab whose appearance encodes its state.

### Visual encoding
- **Height & opacity scale with Gear** — Gear 3 = tall/solid, Gear 2 = medium, Gear 1 = short/faint.
- **Emissive glow** uses the category color; intensity varies by gear.
- **Completed tiles** turn green, rotate flat, and sink downward (`y → -1.5`).
- **Floating animation** (Drei `<Float>`) — active tiles gently bob; completed tiles freeze.
- **Hierarchy breadcrumbs** rendered on the tile face:
  - Parent title (cyan).
  - Grandparent > Parent chain (orange `>` cyan) for 3-level deep tasks.

### Mouse / keyboard interactions (the "Gamepad Engine")
A global key-tracking set powers chorded shortcuts (hold key + click):

- **Single click** — Complete the task (300 ms debounce to distinguish from double-click).
- **Double click** — Toggle "Sidetrack" (move task to/from the Sidecar belt).
- **Shift+Click or Cmd+Click** — **Chop**: open a panel to break the task into sub-tasks (only for Gear > 1).
- **Hold "D" + Click** — Delete the task (and its descendants).
- **Hold "E" + Click** — Edit the task title inline (in-world HTML input terminal).

### Chopping (task decomposition)
- Opens a **"CHOP INTO GEAR N"** terminal anchored above the tile.
- Multi-line textarea → each line becomes a child task one gear smaller.
- Children inherit the parent's category, color, section, and sidetrack state.
- The parent is marked `isChopped` and removed from the visible belt (replaced by its children).
- Supports recursive depth (Gear 3 → 2 → 1).

### Editing
- In-world floating HTML input form on the tile.
- Submit to save; ✕ to cancel.

---

## 5. The Conveyor Belt System (Focus View)

The Focus workspace is built around two parallel "belts":

- **MASTER BELT** (left, dark) — the main pipeline of active tasks.
- **SIDECAR** (right, blue-tinted) — sidelined / "sidetracked" tasks parked out of the main flow.

Behavior:
- Tasks are sorted by creation time and laid out along the Z-axis.
- **Active tasks** queue forward; **completed tasks** peel off to a separate stack position.
- Toggling sidetrack on any tile moves its **entire family** (root + all descendants) between belts together.
- Belts are labelled with flat 3D text on the floor plates.

---

## 6. Zen Mode

- Toggled by the **👁️ eye button** (Focus view only); button highlights cyan when active.
- **Collapses task families** — shows only the first (root) task of each chain, hiding sub-tasks to reduce clutter.
- Completed tasks remain visible regardless.
- Designed for distraction-free focus on "next actions."

---

## 7. Gamification & Progression

### XP
- Earned on task completion: **`gear × 10` XP** (bigger tasks reward more).
- Displayed persistently in the top-left HUD (`XP: N`).
- Drives **world growth**: the Work island tower's height scales with XP (`1 + xp/1000`), and its "training crane" turns from **red → green** once XP ≥ 500.

### Streaks
- **Per-category daily streaks**, keyed by category and stored in Supabase.
- Streak logic (timezone-safe, using local day keys):
  - Completing on consecutive days increments the streak.
  - A **single missed day is forgiven** (grace period — gaps of 1–2 days still count).
  - Gap ≥ 3 days resets to 1.
  - Already-completed-today does not double-count.
- **Live (decay-aware) display**: a stale streak shows as 0 in the HUD without mutating the DB; it's corrected on next completion.
- Shown in HUD as **🔥 STREAK: N DAYS** (Focus view, when active).

---

## 8. The 3D World (Islands)

Rendered in a full-screen React Three Fiber canvas with:
- **Star field** background (Drei `<Stars>`, 5000 stars).
- **Ambient + point lighting** and a **"city" environment** preset for reflections.
- A semi-transparent circular **base platform** grounding the scene.

### Islands (`World.tsx`)
Six islands arranged around the center, each with a distinct geometric shape, color, and floating bob animation:

| Island   | Shape       | Color   | Notes |
|----------|-------------|---------|-------|
| Work     | Custom tower| Cyan    | Grows with XP; has red/green status crane |
| Health   | Sphere      | Indigo  | Wireframe placeholder |
| Running  | Capsule     | Gold    | Wireframe placeholder |
| Study    | Cone        | Teal    | Wireframe placeholder |
| Hobbies  | Torus       | Red     | Wireframe placeholder |
| Admin    | Octahedron  | Orange  | Solid (not wireframe), "banished" far off at (12, -12) |

Interactions:
- **Hover** — island scales up (1.1×), glows brighter, cursor becomes pointer.
- **Click** — enters that category's Focus view.
- **Floating labels** — each island's name hovers above it.

---

## 9. Cloud Sync & Realtime (Supabase)

- **Backend tables:** `tiles` (tasks) and `streaks`.
- **On load:** fetches all tiles and streaks from Supabase.
- **Realtime subscription:** listens for `INSERT` events on `public:tiles` and live-injects new tasks (dedupes by ID) — supports capture from other devices / external automation.
- **Optimistic updates:** all mutations (add, complete, route, chop, edit, delete, sidetrack) update local state immediately, then persist to the cloud.
- **Streak upsert:** keyed on category PK (insert-or-update in one call).
- **External integration noted in git history:** "Macrodroid config shipped" (v0.4.0) — suggests Android automation can push tasks into the inbox via the realtime channel.

### Local persistence
- Zustand `persist` middleware saves a subset to `localStorage` (key `orbital-command-storage`): `xp`, `view`, `activeCategory`, `zenMode`. (Tiles themselves come from the cloud.)

---

## 10. Data Model

**Tile**
- `id`, `title`, `category`, `color`, `gear` (1–3)
- `parentId` (for chop hierarchy)
- `isCompleted`, `isChopped`, `isSidetracked`
- `createdAt`, `section` (`'admin' | 'active' | 'someday'`)

**Streak**
- `category`, `currentStreak`, `lastCompletedDate` (local `YYYY-MM-DD`)

---

## 11. UI / Visual Style Summary

The interface reads like a **sci-fi mission-control console** rendered against deep space:

- **Backdrop:** near-black (`#050505`) with a dense, twinkling star field — everything floats in orbit.
- **Typography:** monospace "Geist" for HUD/labels, giving a terminal/command-deck feel. Headings have soft drop-shadows.
- **Color language:** each life area owns a signature neon color (cyan, indigo, gold, teal, red, orange) that propagates through its island glow, tiles, capture panel borders, and accents. Cyan (`#00a1e0`) is the primary "system" accent.
- **HUD layout:** fixed top bar — left side shows the contextual title (ORBITAL COMMAND / SYSTEM TRIAGE / category name), version tag, XP, and live streak; right side holds the navigation buttons. The HUD is pointer-transparent except for its interactive controls, so it floats over the 3D scene.
- **Motion & feel:** gentle floating/bobbing on islands and tiles, smooth lerped transitions as tiles slide along belts and sink on completion, hover scale-ups, and emissive glows — a calm, weightless, "everything is alive" aesthetic.
- **3D vs 2D split:** the World and Focus views are fully 3D and explorable (orbit/zoom). The Admin inbox deliberately drops to a clean, dark 2D card grid — a focused "triage terminal" with teal headers, rounded cards, dropdowns, and red TRASH actions.
- **Language/theme consistency:** copy leans into the metaphor throughout — "RAW DATA," "SEND TO CLOUD," "PIPELINE," "ICEBOX," "LAUNCH 3D GRID," "MASTER BELT," "SIDECAR," "Inbox zero achieved."

---

## 12. Legacy / Unused Code (Observations)

A few files appear to be earlier prototypes not wired into the current app flow:

- **`WorldSpace.tsx`** — an older 3-pillar world ("WORK / PERSONAL / PROJECTS"). Superseded by `World.tsx`'s island map.
- **`Cone.tsx` (`FocusCone`)** — an earlier spiral-of-beads focus view. References `state.tasks` and `completeTask`, which **no longer exist** in the current store (the store now uses `tiles`/`completeTile`) — so this is dead/broken code.
- **`TaskRow.tsx`** — a semi-circle task-row layout component, not referenced by the active views.
- **`islands/HealthIsland.tsx`** — a detailed "growing tree" model for Health (grows with XP, sprouts fruit > 1000 XP). Defined but **not currently rendered** (World.tsx draws a plain wireframe sphere for Health instead).

These suggest the project evolved from a pillar/cone concept → the current island/conveyor-belt architecture (matching the "island-architecture" feature branch).
