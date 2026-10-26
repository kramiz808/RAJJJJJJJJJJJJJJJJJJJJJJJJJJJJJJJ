import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  Radio,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type HlsLevel = { height?: number };
type HlsInstance = {
  loadSource: (url: string) => void;
  attachMedia: (media: HTMLMediaElement) => void;
  destroy: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  levels?: HlsLevel[];
  currentLevel?: number;
};
type HlsConstructor = {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
};

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

export interface CyberPlayerProps {
  src: string;
  title: string;
  isLive?: boolean;
  poster?: string;
  isPdf?: boolean;
  onBack?: () => void;
}

function isHls(url: string) {
  return /\.m3u8(?:$|[?#])/i.test(url);
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}?autoplay=1&modestbranding=1&rel=0`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "");
      return `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function CyberPlayer({
  src,
  title,
  isLive = false,
  poster,
  isPdf = false,
  onBack,
}: CyberPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [qualityList, setQualityList] = useState<{ id: number; height: number }[]>([]);
  const [quality, setQuality] = useState(-1);
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cssFullscreen, setCssFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setCssFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const ytEmbed = getYouTubeEmbedUrl(src);
  const isDocument = isPdf || src.toLowerCase().endsWith(".pdf");

  // Video playback effect (HLS / MP4)
  useEffect(() => {
    if (isDocument || ytEmbed) return;
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    setError(null);
    setLoading(true);
    setQualityList([]);
    setQuality(-1);
    setPlaying(false);

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    const attachHls = (Hls: HlsConstructor) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setError("Browser HLS (.m3u8) playback support nahi karta.");
        setLoading(false);
        return;
      }
      cleanup();
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        setLoading(false);
        const list = (hls.levels ?? [])
          .map((level, id) => ({ id, height: level.height ?? 0 }))
          .filter((item) => item.height > 0);
        setQualityList(list);
        video
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
        const detail = args[1] as { fatal?: boolean; type?: string } | undefined;
        if (detail?.fatal) {
          setError("Stream load nahi hui. Direct source link check karein.");
          setLoading(false);
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    };

    if (isHls(src)) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Apple/Safari HLS
        video.src = src;
        video.addEventListener("loadedmetadata", () => {
          if (cancelled) return;
          setLoading(false);
          video
            .play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
        });
      } else if (window.Hls) {
        attachHls(window.Hls);
      } else {
        script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
        script.async = true;
        script.onload = () => {
          if (window.Hls) attachHls(window.Hls);
          else {
            setError("HLS player library load nahi hui.");
            setLoading(false);
          }
        };
        script.onerror = () => {
          setError("HLS player download nahi ho paya. Internet connection check karein.");
          setLoading(false);
        };
        document.head.appendChild(script);
      }
    } else {
      video.src = src;
      video.load();
      video.addEventListener("loadeddata", () => {
        if (cancelled) return;
        setLoading(false);
        video
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
      });
    }

    return () => {
      cancelled = true;
      cleanup();
      if (script?.parentNode) script.parentNode.removeChild(script);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, isLive, isDocument, ytEmbed]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setError(null);
      } catch {
        setError("Playback shuru nahi hua. Dubara Play dabayein.");
      }
    } else {
      video.pause();
    }
  };

  const skip = (amount: number) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
    }
  };

  const changeSpeed = (next: number) => {
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const changeQuality = (next: number) => {
    setQuality(next);
    if (hlsRef.current) hlsRef.current.currentLevel = next;
  };

  const fullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      setCssFullscreen(false);
      return;
    }
    if (boxRef.current?.requestFullscreen) {
      boxRef.current
        .requestFullscreen()
        .then(() => {
          setCssFullscreen(false);
        })
        .catch(() => {
          // Native fullscreen prevented (e.g. iframe permissions or iOS); fallback to CSS landscape fullscreen
          setCssFullscreen((prev) => !prev);
        });
    } else {
      setCssFullscreen((prev) => !prev);
    }
  };

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // If PDF Document
  if (isDocument) {
    return (
      <div className="relative flex h-full min-h-[480px] w-full flex-col overflow-hidden rounded-xl border border-primary/40 bg-[#020604] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-primary/30 bg-[#04170E]/90 px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button size="sm" variant="cyber" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Wapas
              </Button>
            )}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="truncate font-display text-sm font-bold text-primary">{title}</span>
            </div>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary hover:bg-primary/20"
          >
            Download / Open PDF <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="flex-1 bg-zinc-900">
          <iframe src={src} title={title} className="h-full w-full border-0" />
        </div>
      </div>
    );
  }

  // If YouTube Video
  if (ytEmbed) {
    return (
      <div
        className={`relative overflow-hidden border border-primary/40 bg-[#020604] text-white shadow-2xl transition-all ${
          cssFullscreen
            ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-0 aspect-auto"
            : "aspect-video w-full rounded-xl"
        }`}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent p-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button size="sm" variant="cyber" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Wapas
              </Button>
            )}
            <span className="truncate font-display text-sm font-bold text-primary">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle Fullscreen"
              onClick={fullscreen}
              className="rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/20"
            >
              YouTube <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <iframe
          src={ytEmbed}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={`relative select-none overflow-hidden border border-primary/40 bg-[#020604] text-white shadow-2xl transition-all ${
        cssFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-0 aspect-auto"
          : "aspect-video w-full rounded-xl"
      }`}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="h-full w-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (video) {
            setTime(video.currentTime);
            setDuration(video.duration || 0);
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() =>
          setError("Video load nahi ho saki. Stream URL expire ya unavailable ho sakti hai.")
        }
      />

      {/* Top Bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/90 to-transparent p-3">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <Button
              size="sm"
              variant="cyber"
              onClick={onBack}
              className="shrink-0 h-7 px-2.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> BACK
            </Button>
          )}
          <span className="truncate font-display text-sm font-bold text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider">
              <Radio className="h-3 w-3" /> LIVE
            </span>
          )}
          <span className="hidden sm:inline-flex rounded border border-primary/30 bg-black/60 px-2 py-0.5 font-mono text-[10px] text-primary">
            STUDENT STUDY
          </span>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 font-mono text-xs text-primary animate-pulse">
          [ BUFFERING HD STREAM... ]
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-x-4 top-16 z-30 rounded-lg border border-warning/60 bg-black/95 p-4 text-center">
          <p className="text-sm font-medium text-warning mb-3">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="border-primary/50 text-primary text-xs"
            >
              Retry Stream
            </Button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary hover:bg-primary/20"
            >
              Open Direct Link <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3">
        {!isLive && duration > 0 && (
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span className="w-10 text-right">{formatTime(time)}</span>
            <input
              aria-label="Video progress"
              type="range"
              min={0}
              max={duration}
              step={0.5}
              value={time}
              onChange={(e) => {
                const next = Number(e.target.value);
                setTime(next);
                if (videoRef.current) videoRef.current.currentTime = next;
              }}
              className="h-1 min-w-0 flex-1 accent-[#22c55e] cursor-pointer"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => void togglePlay()}
              className="rounded p-1 text-primary hover:bg-white/10"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            {!isLive && (
              <>
                <button
                  type="button"
                  aria-label="Back 10 seconds"
                  onClick={() => skip(-10)}
                  className="rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Forward 10 seconds"
                  onClick={() => skip(10)}
                  className="rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted(!muted)}
              className="rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="rounded border border-primary/30 bg-black/90 px-1.5 py-0.5 text-xs text-primary"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>

            {qualityList.length > 0 && (
              <select
                aria-label="Stream quality"
                value={quality}
                onChange={(e) => changeQuality(Number(e.target.value))}
                className="rounded border border-primary/30 bg-black/90 px-1.5 py-0.5 text-xs text-primary"
              >
                <option value={-1}>Auto</option>
                {qualityList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.height}p
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              aria-label="Fullscreen"
              onClick={fullscreen}
              className="rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
