import { ProgramWorkspace } from "@/components/program-workspace";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProgramWorkspace programId={id} />;
}



