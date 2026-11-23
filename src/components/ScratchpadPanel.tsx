import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Copy,
  FolderPlus,
  Pencil,
  Pin,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { NoteItem, ThemeMode } from "../types/app";

interface ScratchpadPanelProps {
  open: boolean;
  notes: NoteItem[];
  categories: string[];
  theme: ThemeMode;
  onClose: () => void;
  onAddNote: (content: string, isTodo: boolean, category: string) => void;
  onEditNote: (id: string, content: string, category: string) => void;
  onTogglePin: (id: string) => void;
  onToggleDone: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onClearCompleted: () => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

export const ScratchpadPanel: React.FC<ScratchpadPanelProps> = ({
  open,
  notes,
  categories,
  theme,
  onClose,
  onAddNote,
  onEditNote,
  onTogglePin,
  onToggleDone,
  onDeleteNote,
  onClearCompleted,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [draft, setDraft] = useState("");
  const [isTodo, setIsTodo] = useState(false);
  const [composeCategory, setComposeCategory] = useState("General");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editCategory, setEditCategory] = useState("General");

  useEffect(() => {
    if (activeCategory !== "All" && categories.includes(activeCategory)) {
      setComposeCategory(activeCategory);
    }
  }, [activeCategory, categories]);

  if (!open) return null;

  const isLight = theme === "light";
  const panelBg =
    theme === "oled"
      ? "bg-black border-[#232730] text-zinc-100"
      : isLight
      ? "bg-slate-100 border-slate-200 text-slate-900"
      : "bg-[#15181E] border-[#232730] text-zinc-100";

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddNote(trimmed, isTodo, composeCategory || "General");
    setDraft("");
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setActiveCategory(trimmed);
    setComposeCategory(trimmed);
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const handleCopy = (note: NoteItem) => {
    navigator.clipboard?.writeText(note.content).catch(() => {});
    setCopiedId(note.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === note.id ? null : curr));
    }, 1200);
  };

  const startEdit = (note: NoteItem) => {
    setEditingId(note.id);
    setEditDraft(note.content);
    setEditCategory(note.category || "General");
  };

  const saveEdit = (id: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    onEditNote(id, trimmed, editCategory);
    setEditingId(null);
  };

  const filtered = notes.filter((n) => {
    const cat = n.category || "General";
    const matchesCat = activeCategory === "All" || cat === activeCategory;
    const matchesQuery = n.content
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Partition into 4 clear sections: Pinned, Open Tasks, Notes, Completed Tasks
  const pinnedItems = filtered.filter((n) => n.pinned);
  const openTasks = filtered.filter((n) => !n.pinned && n.isTodo && !n.done);
  const regularNotes = filtered.filter((n) => !n.pinned && !n.isTodo);
  const completedTasks = filtered.filter((n) => !n.pinned && n.isTodo && n.done);

  const renderCard = (note: NoteItem) => {
    const cat = note.category || "General";
    const isEditing = editingId === note.id;

    return (
      <div
        key={note.id}
        className={`group rounded-xl border p-3 transition-all ${
          note.pinned
            ? isLight
              ? "border-amber-400/60 bg-amber-50/70"
              : "border-[#F59E0B]/40 bg-[#0D0F12]/90"
            : note.isTodo && note.done
            ? isLight
              ? "border-slate-200 bg-white/60 opacity-75"
              : "border-[#232730]/70 bg-[#0D0F12]/40 opacity-75"
            : isLight
            ? "border-slate-200 bg-white"
            : "border-[#232730] bg-[#0D0F12]/70"
        }`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className={`w-full resize-none rounded-lg border p-2 text-xs outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-300 bg-white"
                  : "border-[#232730] bg-[#15181E] text-zinc-100"
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className={`rounded-lg border px-2 py-1 text-[11px] outline-none ${
                  isLight
                    ? "border-slate-300 bg-white"
                    : "border-[#232730] bg-[#15181E]"
                }`}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(note.id)}
                  className="rounded-lg bg-[#F59E0B] px-2.5 py-1 text-[11px] font-bold text-[#0D0F12] hover:bg-amber-400"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5">
              {note.isTodo && (
                <input
                  type="checkbox"
                  checked={note.done}
                  onChange={() => onToggleDone(note.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#10B981]"
                />
              )}
              <p
                className={`flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed ${
                  note.isTodo && note.done ? "text-zinc-500 line-through" : ""
                }`}
              >
                {note.content}
              </p>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                    isLight
                      ? "border-slate-200 bg-slate-100 text-slate-600"
                      : "border-[#232730] bg-[#15181E] text-zinc-400"
                  }`}
                >
                  <Tag className="h-2.5 w-2.5 text-[#F59E0B]" />
                  {cat}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(note.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleCopy(note)}
                  title="Copy to clipboard"
                  className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium transition-colors ${
                    copiedId === note.id
                      ? "bg-[#10B981]/20 text-[#10B981]"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-200"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {copiedId === note.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(note)}
                  title="Edit"
                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                >
                  <Pencil className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onTogglePin(note.id)}
                  title={note.pinned ? "Unpin" : "Pin to top"}
                  className={`rounded-lg p-1 transition-colors ${
                    note.pinned
                      ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                      : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                  }`}
                >
                  <Pin className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  title="Delete"
                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{ width: 340 }}
      className={`flex h-full shrink-0 flex-col border-l ${panelBg}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#232730] bg-[#0D0F12] text-[#F59E0B]">
            <StickyNote className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              Scratchpad &amp; Tasks
            </h2>
            <p className="text-[11px] text-zinc-400">
              {openTasks.length} open • {completedTasks.length} done •{" "}
              {regularNotes.length} notes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close Scratchpad (Ctrl + N)"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="border-b border-inherit px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              activeCategory === "All"
                ? "bg-[#F59E0B] text-[#0D0F12]"
                : isLight
                ? "bg-white text-slate-600 hover:bg-slate-200"
                : "bg-[#0D0F12]/70 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>

          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <div
                key={cat}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-[#F59E0B] text-[#0D0F12]"
                    : isLight
                    ? "bg-white text-slate-600 hover:bg-slate-200"
                    : "bg-[#0D0F12]/70 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="truncate max-w-24"
                >
                  {cat}
                </button>
                {cat !== "General" && (
                  <button
                    type="button"
                    title={`Delete category ${cat}`}
                    onClick={() => {
                      if (activeCategory === cat) setActiveCategory("All");
                      onDeleteCategory(cat);
                    }}
                    className={`rounded hover:opacity-80 ${
                      active ? "text-[#0D0F12]/70" : "text-zinc-500"
                    }`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setAddingCategory((prev) => !prev)}
            title="New Category"
            className={`inline-flex items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-[11px] font-medium transition-colors ${
              isLight
                ? "border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600"
                : "border-[#232730] text-zinc-400 hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
            }`}
          >
            <FolderPlus className="h-3 w-3" />
            New
          </button>
        </div>

        {addingCategory && (
          <form onSubmit={handleCreateCategory} className="mt-2 flex gap-1.5">
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g. Bugs, Billing)"
              className={`flex-1 rounded-lg border px-2.5 py-1 text-xs outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-[#232730] bg-[#0D0F12] text-zinc-100"
              }`}
            />
            <button
              type="submit"
              className="rounded-lg bg-[#F59E0B] px-2.5 py-1 text-[11px] font-bold text-[#0D0F12] hover:bg-amber-400"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* Quick Compose */}
      <form onSubmit={handleSubmit} className="border-b border-inherit p-3">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Write a note, paste a reply, or add a task... (Ctrl+Enter)"
          className={`w-full resize-none rounded-xl border p-2.5 text-xs outline-none transition-colors focus:border-[#F59E0B] ${
            isLight
              ? "border-slate-200 bg-white text-slate-900"
              : "border-[#232730] bg-[#0D0F12] text-zinc-100 placeholder:text-zinc-500"
          }`}
        />

        <div className="mt-2 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex rounded-lg border p-0.5 text-[11px] font-medium ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-[#232730] bg-[#0D0F12]"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsTodo(false)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  !isTodo
                    ? "bg-[#F59E0B] font-bold text-[#0D0F12]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <StickyNote className="h-3 w-3" />
                Note
              </button>
              <button
                type="button"
                onClick={() => setIsTodo(true)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  isTodo
                    ? "bg-[#10B981] font-bold text-[#0D0F12]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <CheckSquare className="h-3 w-3" />
                Task
              </button>
            </div>

            <select
              value={composeCategory}
              onChange={(e) => setComposeCategory(e.target.value)}
              title="Select Category"
              className={`max-w-24 truncate rounded-lg border px-2 py-1 text-[11px] outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-200 bg-white"
                  : "border-[#232730] bg-[#0D0F12] text-zinc-300"
              }`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex items-center gap-1 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </form>

      {/* Search */}
      {notes.length > 0 && (
        <div className="px-3 pt-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes & tasks..."
              className={`w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-200 bg-white text-slate-900"
                  : "border-[#232730] bg-[#0D0F12] text-zinc-100 placeholder:text-zinc-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Categorized & Partitioned Sections */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div
            className={`flex h-44 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${
              isLight ? "border-slate-300" : "border-[#232730]"
            }`}
          >
            <StickyNote className="mb-2 h-6 w-6 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-400">
              {notes.length === 0
                ? "Your local scratchpad is empty."
                : "No items in this category."}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Organize notes and tasks by category right next to your chats.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Pinned */}
            {pinnedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                  <Pin className="h-3 w-3" />
                  Pinned ({pinnedItems.length})
                </div>
                {pinnedItems.map(renderCard)}
              </div>
            )}

            {/* 2. Open Tasks */}
            {openTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  <CircleDot className="h-3 w-3" />
                  Open Tasks ({openTasks.length})
                </div>
                {openTasks.map(renderCard)}
              </div>
            )}

            {/* 3. Notes */}
            {regularNotes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <StickyNote className="h-3 w-3" />
                  Notes ({regularNotes.length})
                </div>
                {regularNotes.map(renderCard)}
              </div>
            )}

            {/* 4. Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2 border-t border-[#232730] pt-3">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setCompletedCollapsed((prev) => !prev)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#10B981]"
                  >
                    {completedCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <CheckCircle2 className="h-3 w-3" />
                    Completed ({completedTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={onClearCompleted}
                    className="text-[10px] font-medium text-zinc-500 hover:text-rose-400"
                  >
                    Clear Done
                  </button>
                </div>
                {!completedCollapsed && completedTasks.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
