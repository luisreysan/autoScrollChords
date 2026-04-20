"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddSongPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const importFromUg = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/songs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Import failed");
      }
      const song = data.song as { id: string };
      toast.success(data.isNew ? "Song imported" : "Song already in library");
      router.push(`/songs/${song.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const pasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Could not read clipboard");
    }
  };

  const submitManual = async () => {
    setManualLoading(true);
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle.trim(),
          artist: manualArtist.trim(),
          rawText: manualText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save song");
      }
      const song = data.song as { id: string };
      toast.success("Song saved");
      router.push(`/songs/${song.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save song");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "inline-flex min-h-[48px] items-center px-2",
          )}
        >
          ← Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import from Ultimate Guitar</CardTitle>
          <CardDescription>Paste a tab URL and import chords into your library.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ug-url">Tab URL</Label>
            <Input
              id="ug-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tabs.ultimate-guitar.com/tab/..."
              className="min-h-[48px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={pasteUrl}>
              Paste
            </Button>
            <Button
              type="button"
              className="min-h-[48px] flex-1 bg-blue-600 text-white hover:bg-blue-600/90"
              disabled={loading || !url.trim()}
              onClick={importFromUg}
            >
              {loading ? "Importing…" : "Import"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Manual entry</CardTitle>
          <CardDescription>Optional: add a song by typing title, artist, and chord text.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-artist">Artist</Label>
            <Input
              id="m-artist"
              value={manualArtist}
              onChange={(e) => setManualArtist(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-text">Chord sheet text</Label>
            <textarea
              id="m-text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            className="min-h-[48px] w-full bg-blue-600 text-white hover:bg-blue-600/90"
            disabled={
              manualLoading ||
              !manualTitle.trim() ||
              !manualArtist.trim() ||
              !manualText.trim()
            }
            onClick={submitManual}
          >
            {manualLoading ? "Saving…" : "Save manual song"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
