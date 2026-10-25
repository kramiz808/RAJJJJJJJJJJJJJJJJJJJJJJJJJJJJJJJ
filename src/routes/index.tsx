import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Volume2, VolumeX, ArrowRight, Send } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Study — Enter the Free Study Matrix" },
      {
        name: "description",
        content: "Ad-free, key-free study platform. 10 coaching platforms, one dashboard.",
      },
      { property: "og:title", content: "Student Study — Enter the Free Study Matrix" },
      {
        property: "og:description",
        content: "Ad-free, key-free study platform. 10 coaching platforms, one dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gateway,
});

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    /* ignore */
  }
}

function AdminEmoji() {
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Admin"
      className="absolute left-4 top-4 rounded-md p-2 text-xl"
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

function Gateway() {
  const [sound, setSound] = useState(true);
  const navigate = useNavigate();
  const enter = () => {
    if (sound) beep();
    navigate({ to: "/study" });
  };

  return (
    <main className="scanlines relative flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <AdminEmoji />
      <Button
        variant="cyber"
        onClick={() => {
          setSound((s) => !s);
          if (!sound) beep();
        }}
        className="cyber-card absolute right-4 top-4 flex items-center gap-2 px-3 py-2 font-mono text-xs text-primary"
        aria-label="Sound toggle"
      >
        {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {sound ? "SOUND ON" : "SOUND OFF"}
      </Button>

      <p className="mb-6 font-mono text-xs tracking-[0.3em] text-muted-foreground">
        // SYSTEM ONLINE · FREE STUDY MATRIX
      </p>
      <img
        src={logo}
        alt="Student Study logo"
        width={512}
        height={512}
        className="logo-pulse h-56 w-56 rounded-[2rem] sm:h-72 sm:w-72 object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/logo.svg";
        }}
      />
      <h1 className="neon-text mt-8 text-3xl font-black sm:text-5xl">STUDENT STUDY</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        All Classes in One Place — batches, search, enroll aur study ek hi Student Study hub par.
      </p>
      <a
        href="https://t.me/+04xCA1ldNEozOWI1"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
      >
        <Send className="h-4 w-4" /> Telegram Discussion / Community
      </a>

      <Button variant="neon" size="lg" onClick={enter} className="mt-10">
        ENTER STUDENT STUDY <ArrowRight />
      </Button>
      <p className="mt-6 font-mono text-[10px] text-muted-foreground">
        v2026 · made with pride for students of India
      </p>
    </main>
  );
}
