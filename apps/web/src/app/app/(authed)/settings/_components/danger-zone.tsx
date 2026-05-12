"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

export function DangerZone() {
  const me = trpc.user.me.useQuery();
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      // Redirect first so the user lands on a safe page even if the
      // signOut network call fails. The session row is already gone,
      // so any stale cookie is harmless — next request hits the
      // middleware → /sign-in path.
      void signOut();
      router.replace("/");
      router.refresh();
    },
  });

  const expectedEmail = me.data?.email;
  const canDelete =
    !!expectedEmail && confirmEmail.trim().toLowerCase() === expectedEmail.toLowerCase();

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-medium text-red-600 dark:text-red-400">Danger zone</h2>
        <p className="text-xs text-muted">Полное стирание аккаунта без возможности восстановления.</p>
      </header>

      {!opened ? (
        <Button variant="secondary" onClick={() => setOpened(true)}>
          <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-red-600" />
          Delete account
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm">
            Это удалит пользователя <strong>{expectedEmail}</strong> и все привязанные workspaces,
            сохранённые ресурсы, заметки и API-ключи. Это действие нельзя отменить.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmEmail">Введите свой email чтобы подтвердить</Label>
            <Input
              id="confirmEmail"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={expectedEmail}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpened(false);
                setConfirmEmail("");
              }}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccount.mutate({ confirmEmail })}
              disabled={!canDelete || deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Permanently delete account"}
            </Button>
          </div>
          {deleteAccount.error ? (
            <p className="text-xs text-red-700 dark:text-red-300">{deleteAccount.error.message}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
