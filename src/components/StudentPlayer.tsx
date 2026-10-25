import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Maximize2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  src: string;
  title?: string;
  poster?: string;
}

export function StudentPlayer({ src, title = "Live Class", poster }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isHls, setIsHls] = useState(false);

  // Check if link is a direct m3u8 / mp4 stream or an embedded page
  const isDirectVideo = src.includes(".m3u8") || src.includes(".mp4") || src.includes(".webm");

  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;
    const video = videoRef.current;

    if (src.includes(".m3u8")) {
      setIsHls(true);
      // Native HLS for Safari/iOS
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        // Load lightweight HLS.js for Android/Chrome from CDN
        const scriptId = "hls-player-script";
        const initHls = () => {
          // @ts-expect-error Hls on window
          if (window.Hls && window.Hls.isSupported()) {
            // @ts-expect-error Hls instance
            const hls = new window.Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
          }
        };

        if (!(window as unknown as { Hls?: unknown }).Hls) {
          const s = document.createElement("script");
          s.id = scriptId;
          s.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
          s.onload = initHls;
          document.head.appendChild(s);
        } else {
          initHls();
        }
      }
    } else {
      video.src = src;
    }
  }, [src, isDirectVideo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const skip = (sec: number) => {
    if (videoRef.current) videoRef.current.currentTime += sec;
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length] || 1;
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col bg-black overflow-hidden select-none"
    >
      {/* Student Study Live Watermark */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded bg-black/70 px-2.5 py-1 font-mono text-xs font-bold text-primary backdrop-blur border border-primary/30">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        STUDENT STUDY
      </div>

      {isDirectVideo ? (
        <>
          <video
            ref={videoRef}
            poster={poster}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="h-full w-full object-contain cursor-pointer"
            playsInline
          />

          {/* Player Bottom Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary"
                onClick={togglePlay}
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-primary" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-white"
                onClick={() => skip(-10)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-white"
                onClick={() => skip(10)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-white"
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px] sm:max-w-[300px]">
                {title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 font-mono text-xs border-primary/40 text-primary"
                onClick={cycleSpeed}
              >
                {speed}x
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* If it is an internal classroom stream/frame, render inside container with no escape button */
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0 bg-background"
          allow="fullscreen; autoplay; encrypted-media; picture-in-picture; screen-wake-lock; orientation; clipboard-write; storage-access-by-user-activation"
          allowFullScreen
        />
      )}
    </div>
  );
}
