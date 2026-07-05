import { createCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { PageHeader } from "@/components/ui";

export default function NewCardPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="カードマスタ登録" description="日本語名だけ必須です。あとから詳細を追記できます。" />
      <CardForm action={createCard} submitLabel="登録する" />
    </div>
  );
}
