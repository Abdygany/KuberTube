import { notFound } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
import { createServerTrpc } from "@/lib/trpc/server";
import { WorkspaceClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trpc = await createServerTrpc();
  try {
    const workspace = await trpc.workspaces.byId.query({ id });
    void trpc.workspaces.touch.mutate({ id });
    return <WorkspaceClient initial={workspace} />;
  } catch (err) {
    if (err instanceof TRPCClientError && err.data?.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
