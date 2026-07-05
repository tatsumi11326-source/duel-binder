import { notFound } from "next/navigation";
import { updateCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = Number(id);
  const card = await prisma.card.findUnique({ where: { id: cardId } });

  if (!card) notFound();

  return (
    <div>
      <PageHeader title="カードマスタ編集" description="カード情報を更新します。" />
      <CardForm card={card} action={updateCard.bind(null, card.id)} submitLabel="更新する" />
    </div>
  );
}
