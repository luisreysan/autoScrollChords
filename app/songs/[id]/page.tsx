import Link from "next/link";
import { notFound } from "next/navigation";

import { SongPageClient } from "@/components/SongPageClient";
import { buttonVariants } from "@/components/ui/button";
import { getSongWithContent } from "@/lib/data";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongPage({ params }: PageProps) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getSongWithContent>>;
  try {
    data = await getSongWithContent(id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error.";
    return (
      <div className="mx-auto min-h-[100dvh] max-w-lg px-4 py-10">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-6 inline-flex min-h-[48px] items-center px-2",
          )}
        >
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Cannot load song</h1>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{message}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Configure Turso variables in Vercel (see README), redeploy, and ensure the schema is pushed (
          <code className="font-mono text-xs">npm run db:push</code>).
        </p>
      </div>
    );
  }

  if (!data || !data.content) {
    notFound();
  }

  return <SongPageClient song={data.song} content={data.content} />;
}
