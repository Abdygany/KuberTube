"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";

export function ProfileSection() {
  const me = trpc.user.me.useQuery();
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="text-xs text-muted">{me.data?.email ?? ""}</p>
      </header>
      {me.data ? (
        <ProfileForm
          initialName={me.data.name ?? ""}
          onSaved={() => me.refetch()}
        />
      ) : (
        <p className="text-xs text-muted">Loading...</p>
      )}
    </section>
  );
}

function ProfileForm({
  initialName,
  onSaved,
}: {
  initialName: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const update = trpc.user.updateProfile.useMutation();

  async function save() {
    setSaved(false);
    await update.mutateAsync({ displayName: name });
    onSaved();
    setSaved(true);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={update.isPending || !name.trim()}>
          {update.isPending ? "Saving..." : "Save"}
        </Button>
        {saved ? <span className="text-xs text-muted">Saved</span> : null}
        {update.error ? (
          <span className="text-xs text-red-600">{update.error.message}</span>
        ) : null}
      </div>
    </>
  );
}
