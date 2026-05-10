'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Clock, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

interface NoteEditorProps {
  resourceId: string;
  noteId?: string;
  initialContent?: string;
  getPlayerTime?: () => number;
  onSaved?: (noteId: string) => void;
}

export function NoteEditor({
  resourceId,
  noteId: initialNoteId,
  initialContent = '',
  getPlayerTime,
  onSaved,
}: NoteEditorProps) {
  const [noteId, setNoteId] = useState(initialNoteId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsert = trpc.notes.upsert.useMutation({
    onSuccess: (note) => {
      setNoteId(note.id);
      setSaving(false);
      setSaved(true);
      onSaved?.(note.id);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const save = useCallback(
    (content: string) => {
      setSaving(true);
      setSaved(false);
      upsert.mutate({ id: noteId, resourceId, contentMd: content });
    },
    [noteId, resourceId, upsert],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Take notes here… Use **bold**, *italic*, lists.' }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(editor.getText() ? editor.getHTML() : '');
      }, 1200);
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none p-4 text-foreground',
      },
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function insertTimecode() {
    if (!editor || !getPlayerTime) return;
    const secs = Math.floor(getPlayerTime());
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const label = `${m}:${String(s).padStart(2, '0')}`;
    editor.chain().focus().insertContent(`[${label}](#t=${secs}) `).run();
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Notes</span>
        <div className="flex items-center gap-2">
          {getPlayerTime && (
            <Button
              variant="ghost"
              size="sm"
              onClick={insertTimecode}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            >
              <Clock className="h-3 w-3" />
              Insert timecode
            </Button>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {saved && !saving && <span className="text-green-600 dark:text-green-400">Saved</span>}
          </span>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
