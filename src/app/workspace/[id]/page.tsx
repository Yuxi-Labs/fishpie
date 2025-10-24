import { PieLayout } from "@/pie/layout/PieLayout";
import { FishEditor } from "@/fish/FishEditor";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; filename?: string }> }) {
  const { id } = await params;
  const { filename } = await searchParams;

  return (
    <PieLayout projectId={id}>
      {/* Language is inferred strictly from filename by the editor */}
      <FishEditor projectId={id} filename={filename} />
    </PieLayout>
  );
}
