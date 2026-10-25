import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/PlatformLogo";
import { KeyGate } from "@/components/KeyGate";
import { StudentPlayer } from "@/components/StudentPlayer";
import { readUnlock } from "@/lib/unlock";
import { getPlatform, PLATFORM_PORTALS, readEnrolled, writeEnrolled } from "@/lib/platforms";

export const Route = createFileRoute("/watch/$id")({
  loader: ({ params }) => {
    const p = getPlatform(params.id);
    if (!p) throw notFound();
    return { name: p.name, tag: p.tag };
  },
  head: ({ loaderData }) => {
    const t = loaderData
      ? `${loaderData.name} Classroom — Student Study`
      : "Unavailable — Student Study";
    const d = loaderData
      ? `Free ${loaderData.name} (${loaderData.tag}) batches and classes on Student Study.`
      : "Batch not found.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Watch,
});

function Watch() {
  const { id } = Route.useParams();
  const platform = getPlatform(id);
  if (!platform) throw notFound();
  const p = platform;
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    setEnrolled(readEnrolled().includes(id));
  }, [id]);

  const enroll = () => {
    const list = readEnrolled();
    if (!list.includes(id)) writeEnrolled([id, ...list]);
    setEnrolled(true);
  };

  const [mirrorIndex, setMirrorIndex] = useState(0);
  const activeMirror = p.mirrors[mirrorIndex] || p.mirrors[0];
  const url = activeMirror?.url || PLATFORM_PORTALS[id]?.studybee || "https://studybeepro.in/";
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  useEffect(() => {
    setUnlocked(!!readUnlock());
  }, []);

  if (!enrolled) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/study"
          className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Study Hub
        </Link>
        <div className="cyber-card scanlines overflow-hidden p-6 sm:p-10">
          <div className="flex items-center gap-4">
            <div style={{ "--brand-h": p.hue } as React.CSSProperties}>
              <PlatformLogo p={p} size={64} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary sm:text-3xl">{p.name}</h1>
              <p className="text-muted-foreground">{p.tagline}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Subjects" value={String(p.subjects.length || "—")} />
            <Stat label="Servers" value={String(p.mirrors.length || "—")} />
            <Stat label="Fees" value="₹0" />
          </div>

          {p.subjects.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <BookOpen className="h-4 w-4" /> Syllabus / Subjects
              </h2>
              <div className="flex flex-wrap gap-2">
                {p.subjects.map((s) => (
                  <span
                    key={s}
                    className="rounded border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <Radio className="h-4 w-4 text-warning" /> Live class alerts Study Hub ke bell icon me
            milenge.
          </div>

          {p.status === "soon" ? (
            <p className="mt-8 text-center font-mono text-sm text-muted-foreground">
              Ye platform jaldi aa raha hai. Telegram pe update milega!
            </p>
          ) : (
            <Button variant="neon" size="lg" onClick={enroll} className="mt-8 w-full">
              ENROLL NOW (100% FREE)
            </Button>
          )}
        </div>
      </main>
    );
  }

  if (unlocked === null) return null;
  if (!unlocked) return <KeyGate onUnlock={() => setUnlocked(true)} />;

  return (
    <main className="flex h-screen flex-col">
      <div className="flex items-center gap-2 border-b bg-card/80 px-3 py-2">
        <Link to="/study" className="inline-flex items-center gap-1 font-mono text-xs text-primary">
          <ArrowLeft className="h-4 w-4" /> Hub
        </Link>
        <span className="truncate font-display text-sm font-bold">{p.name}</span>
        {p.mirrors.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-border/30">
            {p.mirrors.map((m, i) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setMirrorIndex(i)}
                className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors ${
                  mirrorIndex === i
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {m.label.replace(" Gateway", "").replace(" Live", "")}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {p.mirrors.length > 1 && (
            <select
              aria-label="Server Mirror"
              value={mirrorIndex}
              onChange={(e) => setMirrorIndex(Number(e.target.value))}
              className="sm:hidden bg-card text-foreground border border-border/50 text-[10px] font-mono rounded px-1.5 py-0.5"
            >
              {p.mirrors.map((m, i) => (
                <option key={m.label} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <Link
            to="/batches/$id"
            params={{ id }}
            className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
          >
            All Batches
          </Link>
          <span className="flex items-center gap-1 font-mono text-[10px] text-primary">
            <CheckCircle2 className="h-3 w-3" /> ENROLLED
          </span>
        </div>
      </div>

      <div className="classroom-player relative flex-1 bg-background">
        {url ? (
          <StudentPlayer src={url} title={`${p.name} Classroom`} />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center p-6 text-center font-mono text-sm text-muted-foreground">
            Is platform ka server link abhi set ho raha hai. Telegram pe update milega.
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/50 p-4 text-center">
      <div className="font-display text-2xl font-bold text-primary">{value}</div>
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
