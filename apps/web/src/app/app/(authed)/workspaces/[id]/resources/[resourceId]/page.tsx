import { notFound } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
import { createServerTrpc } from "@/lib/trpc/server";
import { ResourceViewer } from "./_viewer";

export const dynamic = "force-dynamic";

export default async function ResourceViewerPage({
  params,
}: {
  params: Promise<{ id: string; resourceId: string }>;
}) {
  const { id: workspaceId, resourceId } = await params;
  const trpc = await createServerTrpc();
  try {
    const resource = await trpc.resources.byId.query({ id: resourceId });
    if (resource.workspaceId !== workspaceId) notFound();
    return <ResourceViewer workspaceId={workspaceId} resource={resource} />;
  } catch (err) {
    if (err instanceof TRPCClientError && err.data?.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
