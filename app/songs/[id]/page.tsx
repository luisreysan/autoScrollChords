import { notFound } from "next/navigation";

import { SongPageClient } from "@/components/SongPageClient";
import { getSongWithContent } from "@/lib/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getSongWithContent(id);
  if (!data || !data.content) {
    notFound();
  }

  return <SongPageClient song={data.song} content={data.content} />;
}
