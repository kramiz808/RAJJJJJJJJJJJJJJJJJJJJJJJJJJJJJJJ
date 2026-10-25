import { useState } from "react";
import type { Platform } from "@/lib/platforms";

const PLATFORM_DOMAINS: Record<string, string> = {
  pw: "pw.live",
  nt: "nexttoppers.com",
  mj: "missionjeet.in",
  rwa: "rojgarwithankit.co.in",
  sa: "sachinacademy.com",
  yo: "yesofficer.com",
  "ua-on": "unacademy.com",
  "ua-off": "unacademy.com",
  ac: "apnacollege.in",
  vb: "vibrantacademy.com",
  pi: "learnxpw.site",
  ms: "youtube.com",
};

export function PlatformLogo({ p, size = 68 }: { p: Platform; size?: number }) {
  const [failed, setFailed] = useState(false);

  // Exact match for user requested Next Toppers rabbit badge
  const badgeSrc =
    p.id === "nt"
      ? "/assets/aistudio/Next_Toppers_Rabbit_Badge_5a9113a9.png"
      : `/logos/${p.id}.svg`;

  return (
    <div
      className="brand-logo relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/50 bg-[#060a08] p-1 shadow-[0_0_18px_rgba(0,230,118,0.25)] transition-all duration-300 hover:scale-105 hover:border-primary hover:shadow-[0_0_26px_rgba(0,230,118,0.45)]"
      style={{
        width: size,
        height: size,
        borderColor: `color-mix(in oklch, hsl(${p.hue} 85% 60%) 75%, transparent)`,
        boxShadow: `0 0 20px color-mix(in oklch, hsl(${p.hue} 85% 60%) 35%, transparent)`,
      }}
    >
      {!failed ? (
        <img
          src={badgeSrc}
          alt={`${p.name} badge`}
          loading="lazy"
          className="h-full w-full object-cover rounded-full"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center rounded-full font-black"
          style={{
            background: `radial-gradient(circle, hsl(${p.hue} 60% 15%) 0%, hsl(${p.hue} 80% 6%) 100%)`,
            color: `hsl(${p.hue} 95% 65%)`,
          }}
        >
          <span className="font-mono text-xs font-black tracking-tight">{p.tag}</span>
        </div>
      )}
    </div>
  );
}
