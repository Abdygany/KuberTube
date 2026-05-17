"use client";

import dynamic from "next/dynamic";

export const NotesEditor = dynamic(
  () => import("./notes-editor-impl").then((m) => m.NotesEditorImpl),
  {
    ssr: false,
    loading: () => <p className="text-xs text-muted">Loading editor...</p>,
  },
);

export type { NotesEditorProps } from "./notes-editor-impl";
