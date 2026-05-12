"use client";

import { Clock, Trash2 } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSeconds } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { trpc } from "@/lib/trpc/react";

export interface NotesEditorProps {
  resourceId: string;
  /** Returns the current player time for "Insert timecode" (videos only). */
  getCurrentSeconds?: () => number;
}

interface StoredNote {
  id: string;
  contentMd: string;
  timestampSeconds: number | null;
}

const AUTOSAVE_MS = 1000;

export function NotesEditorImpl({ resourceId, getCurrentSeconds }: NotesEditorProps) {
  const utils = trpc.useUtils();
  const notesQuery = trpc.notes.listByResource.useQuery({ resourceId });
  const upsert = trpc.notes.upsert.useMutation({
    onSuccess: (row) => {
      utils.notes.listByResource.setData({ resourceId }, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((n) => n.id === row.id);
        if (idx >= 0) {
          const next = list.slice();
          next[idx] = row;
          return next;
        }
        return [...list, row];
      });
    },
  });
  const remove = trpc.notes.softDelete.useMutation({
    onSuccess: (_data, vars) => {
      utils.notes.listByResource.setData({ resourceId }, (prev) =>
        (prev ?? []).filter((n) => n.id !== vars.id),
      );
    },
  });

  const mainNote = useMemo(
    () => notesQuery.data?.find((n) => n.timestampSeconds === null) ?? null,
    [notesQuery.data],
  );
  const timecodeNotes = useMemo(
    () => (notesQuery.data ?? []).filter((n): n is StoredNote => n.timestampSeconds !== null),
    [notesQuery.data],
  );

  return (
    <div className="space-y-6">
      <MainNote
        resourceId={resourceId}
        existing={mainNote}
        getCurrentSeconds={getCurrentSeconds}
        onSave={(contentMd) => upsert.mutate({ resourceId, contentMd, timestampSeconds: null })}
        pending={upsert.isPending}
      />

      {timecodeNotes.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Timecode notes</h3>
          <ul className="space-y-2">
            {timecodeNotes
              .slice()
              .sort((a, b) => (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0))
              .map((note) => (
                <TimecodeNote
                  key={note.id}
                  note={note}
                  onRemove={() => remove.mutate({ id: note.id })}
                  onPatch={(contentMd) => upsert.mutate({ id: note.id, resourceId, contentMd })}
                />
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MainNote({
  resourceId,
  existing,
  getCurrentSeconds,
  onSave,
  pending,
}: {
  resourceId: string;
  existing: StoredNote | null;
  getCurrentSeconds?: () => number;
  onSave: (contentMd: string) => void;
  pending: boolean;
}) {
  const utils = trpc.useUtils();
  const initial = existing?.contentMd ?? "";
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: initial,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none rounded-md border border-border bg-card p-3 outline-none focus:ring-2 focus:ring-accent min-h-[120px]",
      },
    },
    immediatelyRender: false,
  });

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (!editor || hasHydratedRef.current) return;
    if (!existing) return; // wait for query — don't seed empty over fresh user typing
    editor.commands.setContent(existing.contentMd, false);
    hasHydratedRef.current = true;
  }, [editor, existing]);

  const debouncedSave = useDebounced(onSave, AUTOSAVE_MS);
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => debouncedSave(editor.getHTML());
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor, debouncedSave]);

  function insertTimecode() {
    if (!editor || !getCurrentSeconds) return;
    const seconds = Math.max(0, Math.floor(getCurrentSeconds()));
    editor.chain().focus().insertContent(`[${formatSeconds(seconds)}] `).run();
  }

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Notes</h3>
        <div className="flex items-center gap-2">
          {getCurrentSeconds ? (
            <Button variant="ghost" onClick={insertTimecode} className="h-7 px-2 text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Insert timecode
            </Button>
          ) : null}
          <span className="text-[11px] text-muted">{pending ? "Saving..." : "Auto-saved"}</span>
        </div>
      </header>
      <EditorContent editor={editor} />
    </section>
  );
}

function TimecodeNote({
  note,
  onRemove,
  onPatch,
}: {
  note: StoredNote;
  onRemove: () => void;
  onPatch: (contentMd: string) => void;
}) {
  const [draft, setDraft] = useState(note.contentMd);
  const debouncedSave = useDebounced(onPatch, AUTOSAVE_MS);

  useEffect(() => {
    setDraft(note.contentMd);
  }, [note.contentMd]);

  return (
    <li className="rounded-md border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-mono text-muted">{formatSeconds(note.timestampSeconds ?? 0)}</span>
        <button onClick={onRemove} className="text-muted transition hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          debouncedSave(e.target.value);
        }}
        rows={3}
        className="w-full resize-y bg-transparent text-sm outline-none"
        placeholder="What did you notice at this timestamp?"
      />
    </li>
  );
}

