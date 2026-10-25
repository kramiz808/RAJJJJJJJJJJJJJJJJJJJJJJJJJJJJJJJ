import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Clock,
  Crown,
  ExternalLink,
  KeyRound,
  PlayCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemKey } from "@/lib/keys.functions";
import { GPLINKS_URL, trialInfo, writeUnlock } from "@/lib/unlock";

const TELEGRAM_VIP = "https://t.me/Danishraj07";

export function KeyGate({ onUnlock, onCancel }: { onUnlock: () => void; onCancel?: () => void }) {
  const redeem = useServerFn(redeemKey);
  const [key, setKey] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  // Live Countdown Timer (Har second update hota hai)
  const [countdown, setCountdown] = useState({ hours: 0, mins: 0, secs: 0, isExpired: true });

  useEffect(() => {
    const update = () => {
      const t = trialInfo();
      if (t.isExpired) {
        setCountdown({ hours: 0, mins: 0, secs: 0, isExpired: true });
        return;
      }
      const totalSecs = Math.floor(t.msLeft / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setCountdown({ hours, mins, secs, isExpired: false });
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await redeem({
        data: { key: key.trim().toUpperCase(), phone: phone.trim() || undefined },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      writeUnlock({ kind: r.kind, until: r.until, phone: phone.trim() || undefined });
      toast.success(r.kind === "vip" ? "VIP Access Unlock Ho Gaya!" : "24 Ghante Ke Liye Unlock!");
      onUnlock();
    } catch {
      toast.error("Network issue, dobara try karo");
    } finally {
      setBusy(false);
    }
  };

  const handleDemoPlay = () => {
    toast.info("Free Demo Mode me class start ho rahi hai!");
    onUnlock();
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        {onCancel ? (
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Wapas Batches
          </button>
        ) : (
          <Link
            to="/study"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Study Hub
          </Link>
        )}

        {/* TOP CORNER LIVE DEMO TIMER */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold border backdrop-blur-md shadow-lg transition-all ${
            countdown.isExpired
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-primary/60 bg-primary/10 text-primary shadow-primary/20 animate-pulse"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>
            {countdown.isExpired
              ? "DEMO: EXPIRED"
              : `DEMO: ${String(countdown.hours).padStart(2, "0")}h ${String(countdown.mins).padStart(2, "0")}m ${String(countdown.secs).padStart(2, "0")}s`}
          </span>
        </div>
      </div>

      <div className="cyber-card neon-box relative space-y-5 overflow-hidden p-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-black tracking-wide text-primary">
            BATCH ACCESS GATEWAY
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Daily 1 ad dekho aur 24 ghante all batches free unlock karo.
          </p>
        </div>

        {/* AGAR DEMO CHAL RAHA HAI TOH DIRECT PASS BUTTON */}
        {!countdown.isExpired && (
          <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-3.5 text-center shadow-inner">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4 text-primary animate-spin" />
              <span>FREE 3-DAY DEMO ACTIVE HAI!</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aap abhi bina key ke bhi directly class attend kar sakte ho:
            </p>
            <Button
              onClick={handleDemoPlay}
              size="sm"
              variant="neon"
              className="mt-2.5 w-full font-bold"
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> DEMO ME DIRECT CLASS DEKHO →
            </Button>
          </div>
        )}

        {/* 1. ADS WALA SHORTENER BUTTON */}
        <div className="space-y-1.5">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Option 1: Free Daily Key (1 Ad)
          </span>
          <Button
            asChild
            variant="cyber"
            className="w-full font-bold border-primary/40 hover:border-primary"
          >
            <a href={GPLINKS_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4 text-primary" /> FREE KEY GENERATE KARO (AD
              LINK)
            </a>
          </Button>
        </div>

        {/* 2. KEY SUBMIT FORM */}
        <form onSubmit={submit} className="space-y-3 pt-1 border-t border-border/40">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Option 2: Enter Access Key
          </span>
          <label className="block space-y-1">
            <Input
              aria-label="Access key"
              placeholder="Paste Key (FREE-XXXX ya VIP-XXXX)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              maxLength={40}
              className="font-mono"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-primary">
              Mobile Number (Sirf VIP Key ke liye)
            </span>
            <Input
              aria-label="Mobile number"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
          </label>

          <Button
            variant="neon"
            className="w-full font-bold"
            disabled={busy || key.trim().length < 4}
          >
            {busy ? "Checking Key..." : "UNLOCK BATCHES NOW"}
          </Button>
        </form>

        {/* STEP-BY-STEP AD GUIDE */}
        <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">Free Key lene ka tarika:</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11px]">
            <li>
              <b>"FREE KEY GENERATE KARO"</b> dabayein aur 1 chhota ad complete karein.
            </li>
            <li>
              Ad ke baad screen par aayi <b>Key copy</b> karein.
            </li>
            <li>
              Yahan aakar paste karein aur <b>UNLOCK</b> dabayein — 24 ghante chalega!
            </li>
          </ol>
        </div>

        {/* VIP TELEGRAM CARD */}
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-warning">
            <Crown className="h-4 w-4" /> Bina Ad ke VIP Access Chahiye?
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bina kisi ad ke 6 se 12 mahine ka VIP lene ke liye Telegram par admin ko apna 10-digit
            mobile number bhejein:
          </p>
          <Button
            asChild
            size="sm"
            variant="cyber"
            className="mt-2 w-full border-warning/50 text-warning hover:bg-warning/20"
          >
            <a href={TELEGRAM_VIP} target="_blank" rel="noreferrer">
              <Send className="mr-1.5 h-3.5 w-3.5" /> @Danishraj07 ko Telegram par Message Karein
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
