import { PieLayout } from "@/pie/layout/PieLayout";
import { FishEditor } from "@/fish/FishEditor";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; filename?: string }> }) {
  const { id } = await params;
  const { lang, filename } = await searchParams;
  return (
    <PieLayout projectId={id}>
      <FishEditor projectId={id} language={lang} filename={filename} />
    </PieLayout>
  );
}
