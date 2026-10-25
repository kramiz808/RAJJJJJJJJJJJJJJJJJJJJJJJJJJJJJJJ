import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock, Trash2, Megaphone, Users, ArrowLeft, KeyRound } from "lucide-react";
import { createKey, listKeys, deleteKey } from "@/lib/keys.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  verifyAdmin,
  postAnnouncement,
  deleteAnnouncement,
  getOnlineCount,
} from "@/lib/admin.functions";
import { useAnnouncements } from "@/hooks/use-announcements";
import { PLATFORMS } from "@/lib/platforms";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Student Study" },
      { name: "description", content: "Broadcast studio for Student Study announcements." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Portal — Student Study" },
      { property: "og:description", content: "Broadcast studio for Student Study announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const verify = useServerFn(verifyAdmin);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { ok } = await verify({ data: { password: pw } });
      if (ok) setAuthed(true);
      else toast.error("Galat password");
    } catch {
      toast.error("Abhi unlock nahi hua. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={login} className="cyber-card neon-box w-full max-w-sm space-y-4 p-8">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-center text-xl font-bold text-primary">ADMIN ACCESS</h1>
          <Input
            type="password"
            aria-label="Admin password"
            placeholder="Admin password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          <Button variant="neon" className="w-full" disabled={busy || !pw}>
            {busy ? "Checking..." : "UNLOCK"}
          </Button>
          <Link to="/study" className="block text-center font-mono text-xs text-muted-foreground">
            ← Study Hub
          </Link>
        </form>
      </main>
    );
  }
  return (
    <Studio
      password={pw}
      onLock={() => {
        setAuthed(false);
        setPw("");
      }}
    />
  );
}

function Studio({ password, onLock }: { password: string; onLock: () => void }) {
  const { items, reload } = useAnnouncements();
  const post = useServerFn(postAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const [f, setF] = useState({
    title: "",
    author: "",
    message: "",
    platform: "ALL",
    priority: "normal" as "normal" | "important" | "urgent",
  });
  const [busy, setBusy] = useState(false);
  const online = useServerFn(getOnlineCount);
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await online({ data: { password } });
        if (active) {
          setCount(r.count);
          setCountError(!r.ok);
        }
      } catch {
        if (active) setCountError(true);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [online, password]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post({ data: { password, ...f } });
      if (r.ok) {
        toast.success("Broadcast bhej diya!");
        setF({ ...f, title: "", message: "" });
        await reload();
      } else toast.error(r.error);
    } catch {
      toast.error("Message nahi gaya. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2">
      <header className="flex items-center justify-between gap-3 lg:col-span-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/study">
            <ArrowLeft /> Study Hub
          </Link>
        </Button>
        <Button variant="cyber" size="sm" onClick={onLock}>
          <Lock /> Lock
        </Button>
      </header>
      <section className="flex items-center gap-4 border-y py-5 lg:col-span-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-sm font-bold">Abhi online students</h2>
          <div aria-live="polite" className="mt-1 text-3xl font-bold text-primary">
            {countError ? "Unavailable" : (count ?? "…")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Active browsers · pichhle 75 seconds</p>
        </div>
      </section>
      <form onSubmit={send} className="cyber-card space-y-4 p-6">
        <h1 className="flex items-center gap-2 text-lg font-bold text-primary">
          <Megaphone className="h-5 w-5" /> Broadcast Studio
        </h1>
        <Input
          placeholder="Title (optional)"
          maxLength={120}
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
        <Textarea
          placeholder="Message (1–1000 chars)"
          rows={5}
          maxLength={1000}
          required
          value={f.message}
          onChange={(e) => setF({ ...f, message: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="h-9 rounded-md border bg-background px-2 font-mono text-sm"
            value={f.platform}
            onChange={(e) => setF({ ...f, platform: e.target.value })}
          >
            <option value="ALL">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.tag}>
                {p.tag} · {p.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-2 font-mono text-sm"
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value as typeof f.priority })}
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <Input
          placeholder="Author name (optional)"
          maxLength={50}
          value={f.author}
          onChange={(e) => setF({ ...f, author: e.target.value })}
        />
        <Button variant="neon" className="w-full" disabled={busy || !f.message.trim()}>
          {busy ? "Sending..." : "SEND LIVE BROADCAST"}
        </Button>
      </form>

      <section className="cyber-card p-6">
        <h2 className="mb-4 text-base font-bold text-primary">History ({items.length})</h2>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          {items.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-md border bg-background/50 p-3">
              <div className="flex-1">
                <div className="font-mono text-[10px] text-primary">
                  {a.platform} · {a.priority.toUpperCase()} ·{" "}
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </div>
                {a.title && <div className="font-semibold">{a.title}</div>}
                <p className="text-sm text-muted-foreground">{a.message}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete"
                onClick={async () => {
                  const r = await del({ data: { password, id: a.id } });
                  if (!r.ok) toast.error("Delete nahi hua");
                  else await reload();
                }}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Koi broadcast nahi bheja abhi tak.</p>
          )}
        </div>
      </section>
      <KeyStudio password={password} />
    </main>
  );
}

function KeyStudio({ password }: { password: string }) {
  const create = useServerFn(createKey);
  const list = useServerFn(listKeys);
  const remove = useServerFn(deleteKey);
  const [kind, setKind] = useState<"free" | "vip">("vip");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState(30);
  const [items, setItems] = useState<
    { id: string; key: string; kind: string; phone: string | null; expires_at: string }[]
  >([]);
  const reload = async () => {
    const r = await list({ data: { password } });
    setItems(r.items);
  };
  useEffect(() => {
    void reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gen = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await create({
      data: { password, kind, days, phone: kind === "vip" ? phone : undefined },
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    await navigator.clipboard?.writeText(r.key).catch(() => {});
    toast.success(`Key bani: ${r.key} (copy ho gayi)`);
    setPhone("");
    await reload();
  };

  return (
    <section className="cyber-card space-y-4 p-6 lg:col-span-2">
      <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
        <KeyRound className="h-5 w-5" /> Key Generator
      </h2>
      <p className="text-xs text-muted-foreground">
        FREE key ko apne notepad page par daalo (GPLinks ke baad dikhegi). VIP key student ke mobile
        number se judi hoti hai.
      </p>
      <form onSubmit={gen} className="grid gap-3 sm:grid-cols-4">
        <select
          className="h-9 rounded-md border bg-background px-2 font-mono text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as "free" | "vip")}
        >
          <option value="vip">VIP (number)</option>
          <option value="free">FREE (sabke liye)</option>
        </select>
        <Input
          placeholder="Mobile number"
          inputMode="numeric"
          disabled={kind !== "vip"}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
        <Input
          type="number"
          min={1}
          max={365}
          aria-label="Validity days"
          value={days}
          onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
        />
        <Button variant="neon" disabled={kind === "vip" && phone.length !== 10}>
          GENERATE ({days} din)
        </Button>
      </form>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {items.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-3 rounded-md border bg-background/50 p-2 font-mono text-xs"
          >
            <span className="font-bold text-primary">{k.key}</span>
            <span className="text-muted-foreground">
              {k.kind.toUpperCase()}
              {k.phone ? ` · ${k.phone}` : ""} · till{" "}
              {new Date(k.expires_at).toLocaleDateString("en-IN")}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto"
              aria-label="Delete key"
              onClick={async () => {
                await remove({ data: { password, id: k.id } });
                await reload();
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Abhi koi key nahi bani.</p>
        )}
      </div>
    </section>
  );
}
