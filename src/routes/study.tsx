import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Send, Pin, Play, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
  PLATFORMS,
  TELEGRAM_CHANNEL,
  TELEGRAM_COMMUNITY,
  getPlatform,
  readEnrolled,
} from "@/lib/platforms";
import { useAnnouncements } from "@/hooks/use-announcements";
import { PlatformLogo } from "@/components/PlatformLogo";
import { GPLINKS_URL, trialInfo, readUnlock } from "@/lib/unlock";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study Hub — Student Study" },
      {
        name: "description",
        content: "Your enrolled classes, live announcements and all 10 study platforms.",
      },
      { property: "og:title", content: "Study Hub — Student Study" },
      {
        property: "og:description",
        content: "Your enrolled classes, live announcements and all 10 study platforms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyHub,
});

function AdminEmoji() {
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Admin"
      className="rounded-md p-1 text-lg"
      onClick={() => {
        taps.current += 1;
        if (timer.current) clearTimeout(timer.current);
        if (taps.current >= 3) {
          taps.current = 0;
          navigate({ to: "/admin" });
          return;
        }
        timer.current = setTimeout(() => {
          taps.current = 0;
        }, 1200);
      }}
    >
      🛡️
    </button>
  );
}

const statusChip = {
  online: { label: "● ONLINE", cls: "text-primary border-primary/40" },
  internal: { label: "● ONLINE", cls: "text-primary border-primary/40" },
  soon: { label: "● ONLINE", cls: "text-primary border-primary/40" },
};

function DemoAndKeyBanner() {
  const [state, setState] = useState<{ demo: boolean; hours: number; unlocked: boolean }>({
    demo: false,
    hours: 0,
    unlocked: false,
  });
  useEffect(() => {
    const update = () => {
      const t = trialInfo();
      setState({
        demo: !t.isExpired,
        hours: !t.isExpired ? Math.max(1, Math.ceil(t.msLeft / 3600000)) : 0,
        unlocked: !!readUnlock(),
      });
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="cyber-card neon-box grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-primary">
          {state.demo
            ? "🎁 FREE DEMO chal raha hai"
            : state.unlocked
              ? "🔓 ACCESS UNLOCKED"
              : "🔐 FREE KEY REQUIRED"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {state.demo
            ? `${state.hours} hours remaining · demo me classes bina key ke access karein.`
            : "Free key se 24 hours unlock karein. VIP ke liye KeyGate use karein."}
        </div>
      </div>
      <Button asChild variant="neon" size="sm">
        <a href={GPLINKS_URL} target="_blank" rel="noreferrer">
          <ExternalLink /> FREE KEY GENERATE KARO
        </a>
      </Button>
    </section>
  );
}

function StudyHub() {
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false);
  const { items } = useAnnouncements();

  useEffect(() => {
    setEnrolled(readEnrolled());
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Student Study"
              className="h-9 w-9 rounded-lg object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.svg";
              }}
            />
            <span className="font-display text-sm font-bold text-primary">STUDENT STUDY</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <AdminEmoji />
            <Button
              variant="cyber"
              size="icon"
              onClick={() => setDrawer(true)}
              className="relative text-primary"
              aria-label="Announcements"
            >
              <Bell className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">
                  {items.length}
                </span>
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-t bg-primary/10 px-4 py-2 font-mono text-xs">
          <Send className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Updates ke liye join karo:</span>
          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Channel
          </a>
          <a
            href={TELEGRAM_COMMUNITY}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Discussion
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <DemoAndKeyBanner />

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
            <Pin className="h-5 w-5" /> Meri Enrolled Classes
          </h2>
          {enrolled.length === 0 ? (
            <div className="cyber-card p-6 text-center text-sm text-muted-foreground">
              Abhi koi class enroll nahi ki. Neeche se koi bhi platform chuno aur free me enroll
              karo 👇
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {enrolled.map((id) => {
                const p = getPlatform(id);
                if (!p) return null;
                return (
                  <Link
                    key={id}
                    to="/batches/$id"
                    params={{ id }}
                    style={{ "--brand-h": p.hue } as React.CSSProperties}
                    className="cyber-card brand-card flex min-w-56 items-center gap-3 p-4"
                  >
                    <PlatformLogo p={p} size={56} />
                    <div className="flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="font-mono text-[11px] text-primary">Resume →</div>
                    </div>
                    <Play className="h-4 w-4 text-primary" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {items[0] && (
          <section className="cyber-card border-primary/50 p-4">
            <div className="font-mono text-[11px] text-primary">
              LATEST · {items[0].platform} · {items[0].priority.toUpperCase()}
            </div>
            {items[0].title && <div className="mt-1 font-semibold">{items[0].title}</div>}
            <p className="mt-1 text-sm text-muted-foreground">{items[0].message}</p>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">Saare Platforms</h2>
            <span className="font-mono text-xs text-muted-foreground">
              15+ Direct Real APIs & Portals
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PLATFORMS.map((p) => {
              const s = statusChip[p.status];
              return (
                <Link
                  key={p.id}
                  to="/batches/$id"
                  params={{ id: p.id }}
                  style={{ "--brand-h": p.hue } as React.CSSProperties}
                  className="cyber-card brand-card group flex min-h-[224px] flex-col items-center text-center gap-3 p-4 hover:-translate-y-1 transition-all"
                >
                  <div className="flex w-full items-start justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">{p.tag}</span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="my-1 flex items-center justify-center">
                    <PlatformLogo p={p} size={84} />
                  </div>
                  <div className="w-full">
                    <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {p.tagline || "Batches Available"}
                    </p>
                  </div>
                  <div className="brand-text mt-auto w-full pt-1 font-mono text-xs font-semibold">
                    OPEN BATCHES →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      {drawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm"
          onClick={() => setDrawer(false)}
        >
          <aside
            className="h-full w-full max-w-sm overflow-y-auto border-l bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-primary">Announcements</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawer(false)}>
                <X />
              </Button>
            </div>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Abhi koi announcement nahi hai.</p>
            )}
            <div className="space-y-3">
              {items.map((a) => (
                <div key={a.id} className="cyber-card p-3">
                  <div className="font-mono text-[10px] text-primary">
                    {a.platform} · {a.priority.toUpperCase()} ·{" "}
                    {new Date(a.created_at).toLocaleString("en-IN")}
                  </div>
                  {a.title && <div className="mt-1 font-semibold">{a.title}</div>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.message}
                  </p>
                  {a.author && (
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      — {a.author}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
