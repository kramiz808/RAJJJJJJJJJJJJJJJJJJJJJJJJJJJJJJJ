import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  Home,
  Info,
  Play,
  Plus,
  Radio,
  Search,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatform } from "@/lib/platforms";
import {
  getBatches,
  getFolderContents,
  getLiveSchedule,
  getPiCategoryBatches,
  REAL_PI_CATEGORIES,
  REAL_USER_LIVE_STREAM,
  resolveVideoStream,
  type Batch,
  type ContentItem,
  type LiveSession,
  type PiCategory,
} from "@/lib/batches.functions";
import { PlatformLogo } from "@/components/PlatformLogo";
import { KeyGate } from "@/components/KeyGate";
import { readUnlock } from "@/lib/unlock";
import { CyberPlayer } from "@/components/CyberPlayer";

export const Route = createFileRoute("/batches/$id")({
  head: () => ({
    meta: [
      { title: "Course Content — Student Study" },
      {
        name: "description",
        content: "Saare free batches, chapters aur lectures ek jagah.",
      },
      { property: "og:title", content: "Course Content — Student Study" },
    ],
  }),
  loader: ({ params }) => {
    const p = getPlatform(params.id);
    return getBatches({
      data: {
        platformId: params.id,
        host: p?.bee?.host || params.id,
        base: p?.bee?.base,
      },
    });
  },
  component: BatchesPage,
});

const ENR = "student_study_enrolled_bee";

function BatchesPage() {
  const { id } = Route.useParams();
  const batches = Route.useLoaderData();
  const p = getPlatform(id);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "enr">("all");
  const [enr, setEnr] = useState<string[]>([]);
  const [shown, setShown] = useState(16);
  const [gate, setGate] = useState<string | null>(null);

  // PI Category View State (Matches Screenshot 77)
  const [selectedPiCategory, setSelectedPiCategory] = useState<PiCategory | null>(null);
  const [piBatches, setPiBatches] = useState<Batch[]>([]);
  const [loadingPiBatches, setLoadingPiBatches] = useState(false);

  // Active Batch & Content View State (Matches Screenshot 75 & 76)
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [courseTab, setCourseTab] = useState<"content" | "overview" | "live">("content");
  const [folderHistory, setFolderHistory] = useState<{ id: string; title: string }[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Live Streams State
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [activeLiveEmbed, setActiveLiveEmbed] = useState<string | null>(null);
  const [reminders, setReminders] = useState<string[]>([]);

  // Video Player state
  const [playerStream, setPlayerStream] = useState<{
    url: string;
    title: string;
    isPdf?: boolean;
    isLive?: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      setEnr(JSON.parse(localStorage.getItem(ENR) || "[]"));
      setReminders(JSON.parse(localStorage.getItem("student_study_reminders") || "[]"));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleReminder = (sessionId: string, sessionTitle: string) => {
    const next = reminders.includes(sessionId)
      ? reminders.filter((x) => x !== sessionId)
      : [...reminders, sessionId];
    setReminders(next);
    localStorage.setItem("student_study_reminders", JSON.stringify(next));
    if (!reminders.includes(sessionId)) {
      toast.success(`Reminder set! Student Study will alert you for "${sessionTitle}".`);
    } else {
      toast.info(`Reminder cancelled for "${sessionTitle}".`);
    }
  };

  const [liveSubTab, setLiveSubTab] = useState<"now" | "upcoming" | "completed">("now");

  const currentlyLive = useMemo(
    () => liveSessions.filter((s) => s.isLive || s.status === "live"),
    [liveSessions],
  );

  const upcomingSessions = useMemo(
    () => liveSessions.filter((s) => s.status === "scheduled" || (!s.isLive && s.status !== "completed")),
    [liveSessions],
  );

  const completedSessions = useMemo(
    () => liveSessions.filter((s) => s.status === "completed"),
    [liveSessions],
  );

  const key = useCallback((b: Batch) => `${id}:${b.id}`, [id]);
  const toggle = (b: Batch) => {
    const n = enr.includes(key(b)) ? enr.filter((x) => x !== key(b)) : [...enr, key(b)];
    setEnr(n);
    localStorage.setItem(ENR, JSON.stringify(n));
  };

  const list = useMemo(
    () =>
      batches.filter(
        (b) =>
          (tab === "all" || enr.includes(key(b))) &&
          b.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [batches, q, tab, enr, key],
  );

  // PI Categories filtered by search query
  const filteredPiCategories = useMemo(() => {
    return REAL_PI_CATEGORIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  // Load Batches for a specific PI Category (from Screenshot 77)
  const handleSelectPiCategory = async (cat: PiCategory) => {
    setSelectedPiCategory(cat);
    setLoadingPiBatches(true);
    try {
      const bList = await getPiCategoryBatches({
        data: { categoryId: cat._id, categoryName: cat.name },
      });
      setPiBatches(bList);
    } catch {
      setPiBatches([]);
    } finally {
      setLoadingPiBatches(false);
    }
  };

  // Load Folder / Chapter Contents
  const loadFolder = async (
    courseId: string,
    folderId: string,
    folderTitle?: string,
    parentId?: string,
  ) => {
    setLoadingContent(true);
    try {
      const items = await getFolderContents({
        data: {
          platform: id,
          courseId,
          folderId,
          parentId,
        },
      });
      setContents(items);
      if (folderTitle) {
        setFolderHistory((prev) => [...prev, { id: folderId, title: folderTitle }]);
      }
    } catch {
      setContents([]);
    } finally {
      setLoadingContent(false);
    }
  };

  // Load Live Streams for the batch
  const loadLiveStreams = async (courseId: string, courseTitle: string) => {
    setLoadingLive(true);
    try {
      const res = await getLiveSchedule({
        data: {
          platform: id,
          courseId,
          courseTitle,
        },
      });
      setLiveSessions(res);
    } catch {
      setLiveSessions([]);
    } finally {
      setLoadingLive(false);
    }
  };

  // Click on a batch to open Course Content View
  const handleOpenBatch = (b: Batch) => {
    if (!readUnlock()) {
      setGate(JSON.stringify(b));
      return;
    }
    setActiveBatch(b);
    setCourseTab("content");
    setFolderHistory([{ id: "0", title: b.title }]);
    void loadFolder(b.id, "0");
    void loadLiveStreams(b.id, b.title);
  };

  // Switch tabs inside course view
  const handleTabChange = (t: "content" | "overview" | "live") => {
    setCourseTab(t);
    if (t === "live" && activeBatch && liveSessions.length === 0) {
      void loadLiveStreams(activeBatch.id, activeBatch.title);
    }
  };

  // Jump to specific breadcrumb level
  const jumpToFolder = (index: number) => {
    if (!activeBatch) return;
    const target = folderHistory[index];
    if (!target) return;
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    const parent = index > 1 ? folderHistory[index - 1]?.id : undefined;
    void loadFolder(activeBatch.id, target.id, undefined, parent);
  };

  // Click on a folder or lecture item
  const handleItemClick = async (item: ContentItem) => {
    if (item.type === "folder" && activeBatch) {
      const parent =
        folderHistory.length > 0 ? folderHistory[folderHistory.length - 1]?.id : undefined;
      void loadFolder(activeBatch.id, item.id, item.title, parent);
      return;
    }

    if (item.type === "file") {
      if (item.streamUrl) {
        setPlayerStream({ url: item.streamUrl, title: item.title, isPdf: item.isPdf });
        return;
      }

      if (activeBatch) {
        setLoadingContent(true);
        const parent =
          folderHistory.length > 1 ? folderHistory[folderHistory.length - 1]?.id : undefined;
        const resolved = await resolveVideoStream({
          data: {
            platform: id,
            courseId: activeBatch.id,
            contentId: item.id,
            parentId: parent,
          },
        });
        setLoadingContent(false);
        if (resolved?.streamUrl) {
          setPlayerStream({
            url: resolved.streamUrl,
            title: resolved.title || item.title,
            isPdf: resolved.isPdf,
          });
        } else {
          // Strictly isolate live stream to Mission Jeet
          const fallbackUrl =
            id === "mj"
              ? REAL_USER_LIVE_STREAM
              : "https://d3uvoof8mq1fao.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/4864061/178906095188442352352/178906095188442352352_2352352.m3u8";
          setPlayerStream({
            url: fallbackUrl,
            title: item.title,
            isPdf: false,
          });
        }
      }
    }
  };

  const toggleContainerFullscreen = () => {
    if (!portalContainerRef.current) return;
    if (!document.fullscreenElement) {
      portalContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!p) {
    return (
      <main className="p-8 text-center font-mono">
        Platform nahi mila.{" "}
        <Link to="/study" className="text-primary underline">
          Wapas jayein
        </Link>
      </main>
    );
  }

  // Key required screen
  if (gate) {
    return (
      <KeyGate
        onUnlock={() => {
          const b = JSON.parse(gate) as Batch;
          setGate(null);
          handleOpenBatch(b);
        }}
        onCancel={() => setGate(null)}
      />
    );
  }

  // Fullscreen CyberPlayer Modal (No external links)
  if (playerStream) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background">
        <div className="flex h-12 items-center justify-between border-b border-border/50 bg-card/90 px-4 backdrop-blur">
          <div className="flex items-center gap-3 overflow-hidden">
            <Button size="sm" variant="cyber" onClick={() => setPlayerStream(null)}>
              <ArrowLeft className="h-4 w-4" /> Wapas
            </Button>
            <span className="truncate font-display text-sm font-bold text-primary">
              {playerStream.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary">
              STUDENT STUDY HD
            </span>
          </div>
        </div>
        <div className="flex-1 bg-black p-2 sm:p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <CyberPlayer
              src={playerStream.url}
              title={playerStream.title}
              isPdf={playerStream.isPdf}
              isLive={playerStream.isLive}
              onBack={() => setPlayerStream(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW A: COURSE CONTENT SCREEN (Screenshots 75 & 76)
  // ==========================================
  if (activeBatch) {
    return (
      <div className="min-h-screen bg-[#070908] text-foreground font-sans flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-border/40 bg-[#0d120f]/90 backdrop-blur px-4 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveBatch(null);
                  setFolderHistory([]);
                  setContents([]);
                  setActiveLiveEmbed(null);
                }}
                className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5 h-8 px-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Batches
              </Button>
              <div className="h-4 w-px bg-border/40" />
              <div className="flex items-center gap-2">
                <PlatformLogo p={p} size={32} />
                <span className="font-display font-bold text-sm tracking-wider text-primary">
                  STUDENT STUDY
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ENROLLED
              </span>
            </div>
          </div>
        </header>

        {/* Hero Course Banner */}
        <div className="border-b border-border/30 bg-gradient-to-r from-[#111c15] via-[#09100c] to-[#040806] px-4 py-6">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="font-mono text-xs text-primary uppercase tracking-wider flex items-center gap-2">
                <span>
                  {p.name} · {p.tag}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-semibold">100% Free Full Course</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-wide">
                {activeBatch.title}
              </h1>
              {activeBatch.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  {activeBatch.subtitle}
                </p>
              )}
            </div>

            {activeBatch.thumbnail && (
              <div className="hidden sm:block h-24 w-44 overflow-hidden rounded-xl border border-primary/30 shrink-0 shadow-xl bg-black">
                <img
                  src={activeBatch.thumbnail}
                  alt={activeBatch.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Subnav Tabs: Overview | Content | Live Classes */}
        <div className="border-b border-border/40 bg-[#0a0e0c] px-4 sticky top-12 z-20">
          <div className="mx-auto flex max-w-7xl items-center gap-8">
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-2 py-3.5 font-mono text-xs font-bold transition-all relative ${
                courseTab === "overview"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Info className="h-4 w-4" /> Overview
            </button>

            <button
              onClick={() => handleTabChange("content")}
              className={`flex items-center gap-2 py-3.5 font-mono text-xs font-bold transition-all relative ${
                courseTab === "content"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Folder className="h-4 w-4 fill-primary/20 text-primary" /> Content
            </button>

            <button
              onClick={() => handleTabChange("live")}
              className={`flex items-center gap-2 py-3.5 font-mono text-xs font-bold transition-all relative ${
                courseTab === "live"
                  ? "text-red-400 border-b-2 border-red-500"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>Live Classes</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb Bar */}
        {courseTab === "content" && (
          <div className="border-b border-border/20 bg-[#080c09] px-4 py-2.5">
            <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => jumpToFolder(0)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary shrink-0 transition-colors"
              >
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>Course Content</span>
              </button>

              {folderHistory.slice(1).map((f, i) => (
                <div key={f.id} className="flex items-center gap-2 shrink-0">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <button
                    onClick={() => jumpToFolder(i + 1)}
                    className={`hover:text-primary transition-colors ${
                      i === folderHistory.length - 2
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {f.title}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Body per Tab */}
        <main className="mx-auto max-w-7xl flex-1 w-full px-4 py-6">
          {/* TAB 1: CONTENT */}
          {courseTab === "content" && (
            <div>
              {currentlyLive.length > 0 && (
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950/40 via-black to-[#0c120e] p-4 shadow-[0_0_20px_rgba(239,68,68,0.22)]">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
                          🔴 LIVE CLASS ABHI CHAL RAHI HAI
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">1080p HD Direct</span>
                      </div>
                      <div className="font-semibold text-sm sm:text-base text-white line-clamp-1 mt-0.5">
                        {currentlyLive[0].title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPlayerStream({
                          url:
                            currentlyLive[0].streamUrl ||
                            activeBatch.streamUrl ||
                            "https://d3uvoof8mq1fao.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/4864061/178906095188442352352/178906095188442352352_2352352.m3u8",
                          title: `${currentlyLive[0].title} — Live Stream`,
                          isLive: true,
                        });
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs gap-1.5 shadow"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Watch Live Now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTabChange("live")}
                      className="font-mono text-xs border border-white/20 text-zinc-300 hover:text-white"
                    >
                      Schedule →
                    </Button>
                  </div>
                </div>
              )}

              {loadingContent ? (
                <div className="flex flex-col items-center justify-center py-24 text-primary font-mono text-sm animate-pulse space-y-3">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span>[ LOADING DIRECT CONTENT & LECTURES... ]</span>
                </div>
              ) : contents.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-card/40 p-12 text-center text-muted-foreground font-mono text-sm">
                  Is folder me abhi koi files nahi hain.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {contents.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => void handleItemClick(item)}
                      className="group flex flex-col overflow-hidden rounded-xl border border-primary/25 bg-[#0d1410] hover:border-primary hover:shadow-[0_0_20px_rgba(34,197,94,0.18)] transition-all cursor-pointer"
                    >
                      <div className="aspect-[16/9] w-full overflow-hidden bg-black/60 relative">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                activeBatch.thumbnail ||
                                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-transparent p-4 text-center">
                            {item.type === "folder" ? (
                              <Folder className="h-10 w-10 text-primary/70" />
                            ) : item.isPdf ? (
                              <FileText className="h-10 w-10 text-warning/70" />
                            ) : (
                              <Play className="h-10 w-10 text-primary/70 fill-current" />
                            )}
                          </div>
                        )}

                        <div className="absolute top-2 right-2">
                          {item.type === "folder" ? (
                            <span className="rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-primary border border-primary/30">
                              FOLDER
                            </span>
                          ) : item.isPdf ? (
                            <span className="rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-400 border border-amber-400/30">
                              PDF NOTES
                            </span>
                          ) : (
                            <span className="rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-400/30 flex items-center gap-1">
                              <Play className="h-2 w-2 fill-current" /> VIDEO
                            </span>
                          )}
                        </div>

                        {item.duration && (
                          <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                            {item.duration}
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold text-sm text-zinc-100 group-hover:text-primary line-clamp-2 transition-colors">
                            {item.title}
                          </h2>
                          {item.type === "folder" && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground pt-1 border-t border-border/20">
                          {item.type === "folder" ? (
                            <>
                              {typeof item.foldersCount === "number" && item.foldersCount > 0 && (
                                <span className="text-zinc-300">
                                  FOLDERS{" "}
                                  <strong className="text-primary">{item.foldersCount}</strong>
                                </span>
                              )}
                              {typeof item.videosCount === "number" && item.videosCount > 0 && (
                                <span className="text-zinc-300">
                                  VIDEO <strong className="text-primary">{item.videosCount}</strong>
                                </span>
                              )}
                              {typeof item.pdfsCount === "number" && item.pdfsCount > 0 && (
                                <span className="text-zinc-300">
                                  PDF <strong className="text-primary">{item.pdfsCount}</strong>
                                </span>
                              )}
                              {!item.foldersCount && !item.videosCount && !item.pdfsCount && (
                                <span className="text-primary font-bold">CLICK TO EXPLORE →</span>
                              )}
                            </>
                          ) : item.isPdf ? (
                            <span className="text-amber-400 font-bold">VIEW NOTES PDF →</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">PLAY LECTURE HD →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {courseTab === "overview" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="rounded-xl border border-primary/30 bg-[#0d1410] p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-primary">
                  Course Overview & Description
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {activeBatch.description ||
                    `${activeBatch.title} poora syllabus detail me cover karta hai. Isme top faculty ke daily video lectures, downloadable handwritten revision notes, formula sheets aur previous year questions (PYQs) shamil hain.`}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/30">
                  <div className="rounded-lg bg-black/40 p-3 text-center border border-primary/20">
                    <div className="font-mono text-xs text-muted-foreground">Classes</div>
                    <div className="font-display text-lg font-bold text-primary">100% Free</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-3 text-center border border-primary/20">
                    <div className="font-mono text-xs text-muted-foreground">Quality</div>
                    <div className="font-display text-lg font-bold text-primary">Full HD</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-3 text-center border border-primary/20">
                    <div className="font-mono text-xs text-muted-foreground">Notes</div>
                    <div className="font-display text-lg font-bold text-primary">PDF Included</div>
                  </div>
                  <div className="rounded-lg bg-black/40 p-3 text-center border border-primary/20">
                    <div className="font-mono text-xs text-muted-foreground">Platform</div>
                    <div className="font-display text-lg font-bold text-primary">{p.name}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-[#0d1410] p-6">
                <h3 className="font-display text-base font-bold text-white mb-3">
                  Subjects Included
                </h3>
                <div className="flex flex-wrap gap-2">
                  {p.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE CLASSES */}
          {courseTab === "live" && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Fullscreen Proxied Live Room (Branded with Student Study, No external links) */}
              {activeLiveEmbed && (
                <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-[#070908]">
                  <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-[#0c120e] px-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="cyber"
                        onClick={() => setActiveLiveEmbed(null)}
                        className="font-mono text-xs gap-1.5"
                      >
                        <ArrowLeft className="h-4 w-4" /> Wapas
                      </Button>
                      <div className="h-4 w-px bg-border/40" />
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-display font-bold text-sm tracking-wider text-white">
                          STUDENT STUDY LIVE CLASSROOM
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                        1080p HD SECURE STREAM
                      </span>
                    </div>
                  </header>

                  <div className="relative flex-1 w-full bg-black">
                    <div className="pointer-events-none absolute top-3 left-4 z-30 flex items-center gap-2 rounded-full border border-primary/40 bg-black/85 px-3 py-1 font-mono text-xs font-bold text-primary shadow-xl backdrop-blur">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <img
                        src="/favicon.png"
                        alt="Student Study"
                        className="h-4 w-4 rounded-full"
                      />
                      <span>STUDENT STUDY</span>
                    </div>
                    <iframe
                      src={activeLiveEmbed}
                      title="Student Study Live Stream"
                      className="h-full w-full border-0 bg-black"
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Header with live and upcoming counts */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/40 bg-[#0e120f] p-5">
                  <div>
                    <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold mb-1">
                      <Radio className="h-4 w-4 animate-pulse text-red-500" />
                      <span>REAL-TIME LIVE CLASSES & BROADCASTS</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-white">
                      Live Broadcast & Video Schedule Hub
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Live class, aane wale videos ka schedule aur samapt live lectures with DPPs.
                    </p>
                  </div>

                  {/* 3 Interactive Tab Selector */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-black/60 p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setLiveSubTab("now")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-colors ${
                        liveSubTab === "now"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                      Live Now ({currentlyLive.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveSubTab("upcoming")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-colors ${
                        liveSubTab === "upcoming"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Upcoming ({upcomingSessions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveSubTab("completed")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-colors ${
                        liveSubTab === "completed"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Completed & DPP ({completedSessions.length})
                    </button>
                  </div>
                </div>

                {loadingLive ? (
                  <div className="text-center py-16 text-primary font-mono text-sm animate-pulse space-y-2">
                    <div className="h-7 w-7 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto" />
                    <span>[ CONNECTING TO REAL LIVE BROADCAST FEED... ]</span>
                  </div>
                ) : (
                  <>
                    {/* SUB-TAB 1: 🔴 ABHI LIVE CHAL RAHA HAI */}
                    {liveSubTab === "now" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                            <h3 className="font-display text-base font-bold text-white tracking-wide">
                              🔴 LIVE NOW (ABHI CHAL RAHA HAI)
                            </h3>
                          </div>
                          <span className="font-mono text-xs text-zinc-400">
                            {id === "mj" ? "Mission Jeet Official Live Broadcast" : "Platform Live Stream"}
                          </span>
                        </div>

                        {currentlyLive.length === 0 ? (
                          <div className="rounded-xl border border-border/40 bg-[#0a0d0b] p-8 text-center space-y-3">
                            <div className="h-10 w-10 mx-auto rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                              <Radio className="h-5 w-5" />
                            </div>
                            <h4 className="font-display text-base font-bold text-zinc-200">
                              Abhi is batch me koi live class active nahi hai
                            </h4>
                            <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
                              Agli class shuru hone par yahan direct live player chalega. Aap aane wali
                              classes ka schedule dekh sakte hain ya completed classes padh sakte hain.
                            </p>
                            <div className="pt-2 flex justify-center gap-3">
                              <Button
                                size="sm"
                                variant="neon"
                                onClick={() => setLiveSubTab("upcoming")}
                                className="font-mono text-xs gap-1.5"
                              >
                                <Clock className="h-3.5 w-3.5" /> Upcoming Schedule Dekhein
                              </Button>
                              <Button
                                size="sm"
                                variant="cyber"
                                onClick={() => setLiveSubTab("completed")}
                                className="font-mono text-xs gap-1.5"
                              >
                                <FileText className="h-3.5 w-3.5" /> Completed Lectures & DPP
                              </Button>
                            </div>
                          </div>
                        ) : (
                          currentlyLive.map((session) => (
                            <div
                              key={session.id}
                              className="rounded-xl border-2 border-red-500/50 bg-gradient-to-r from-red-950/40 via-[#120909] to-black p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-[0_0_30px_rgba(239,68,68,0.25)]"
                            >
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white tracking-wider animate-pulse">
                                    <Radio className="h-3 w-3" /> LIVE BROADCAST
                                  </span>
                                  {session.subject && (
                                    <span className="rounded bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-[11px] text-primary font-semibold">
                                      {session.subject}
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-emerald-400">
                                    1080p Ultra HD Direct
                                  </span>
                                </div>

                                <h4 className="font-bold text-base sm:text-lg text-white">
                                  {session.title}
                                </h4>

                                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                                  {session.teacher && (
                                    <span className="flex items-center gap-1.5 text-zinc-200">
                                      <User className="h-3.5 w-3.5 text-primary" /> {session.teacher}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    {session.startTime || "Streaming Now"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <Button
                                  size="default"
                                  onClick={() =>
                                    setPlayerStream({
                                      url:
                                        session.streamUrl ||
                                        activeBatch.streamUrl ||
                                        (id === "mj"
                                          ? REAL_USER_LIVE_STREAM
                                          : "https://d3uvoof8mq1fao.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/4864061/178906095188442352352/178906095188442352352_2352352.m3u8"),
                                      title: `${session.title} — Live Stream`,
                                      isLive: true,
                                    })
                                  }
                                  className="bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold gap-2 px-5 py-2.5 shadow-lg shadow-red-900/40 border-0"
                                >
                                  <Play className="h-4 w-4 fill-current" /> ABHI LIVE DEKHEIN
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 2: ⏳ AANE WALI LIVE CLASSES (UPCOMING SCHEDULE) */}
                    {liveSubTab === "upcoming" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <h3 className="font-display text-base font-bold text-white tracking-wide">
                              ⏳ UPCOMING SCHEDULE (AANE WALI CLASSES)
                            </h3>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {upcomingSessions.length} Classes Scheduled
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {upcomingSessions.map((session) => {
                            const isSaved = reminders.includes(session.id);
                            return (
                              <div
                                key={session.id}
                                className="rounded-xl border border-border/40 bg-[#0c100d] p-4 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                                      <Calendar className="h-3 w-3" />
                                      {session.startTime || "Scheduled"}
                                    </span>
                                    {session.subject && (
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {session.subject}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-semibold text-sm text-zinc-100 line-clamp-2">
                                    {session.title}
                                  </h4>

                                  {session.teacher && (
                                    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
                                      <User className="h-3 w-3 text-primary" />
                                      <span>Educator: {session.teacher}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between border-t border-border/20 pt-2.5">
                                  <span className="font-mono text-[10px] text-zinc-400">
                                    {session.endTime
                                      ? `Ends: ${session.endTime}`
                                      : "HD Interactive Class"}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant={isSaved ? "neon" : "ghost"}
                                    onClick={() => toggleReminder(session.id, session.title)}
                                    className="h-7 px-2.5 font-mono text-[11px] gap-1"
                                  >
                                    <Bell className={`h-3 w-3 ${isSaved ? "fill-current" : ""}`} />
                                    {isSaved ? "Reminder Set" : "Notify Me"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 3: 📼 SAMAPT LIVE - RECORDED CONTENT MEIN JUDE LECTURES, NOTES & DPP */}
                    {liveSubTab === "completed" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-400" />
                            <h3 className="font-display text-base font-bold text-white tracking-wide">
                              📼 SAMAPT LIVE — BATCH CONTENT MEIN JUDA (WITH NOTES & DPP)
                            </h3>
                          </div>
                          <span className="font-mono text-xs text-emerald-400">
                            Recorded + Notes + DPP Attached
                          </span>
                        </div>

                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-zinc-300 font-mono">
                          💡 <strong>Automatic Archival:</strong> Jab live class khatm hoti hai, wo turant
                          yahan aur batch ke Content tab me recorded lecture, DPP problem sheet aur
                          hastlikhit notes ke saath jud jati hai.
                        </div>

                        <div className="space-y-3">
                          {completedSessions.length === 0 ? (
                            <div className="rounded-xl border border-border/40 bg-[#0a0d0b] p-6 text-center font-mono text-xs text-muted-foreground">
                              Abhi koi completed session archive nahi hai.
                            </div>
                          ) : (
                            completedSessions.map((session) => (
                              <div
                                key={session.id}
                                className="rounded-xl border border-border/40 bg-[#0c120e] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-emerald-500/40 transition-colors"
                              >
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                                      CONCLUDED & ARCHIVED
                                    </span>
                                    {session.subject && (
                                      <span className="font-mono text-[10px] text-zinc-400">
                                        {session.subject}
                                      </span>
                                    )}
                                    {session.duration && (
                                      <span className="font-mono text-[10px] text-zinc-400">
                                        ⏱️ {session.duration}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-semibold text-sm sm:text-base text-zinc-100">
                                    {session.title}
                                  </h4>

                                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                                    {session.teacher && (
                                      <span className="flex items-center gap-1 text-zinc-300">
                                        <User className="h-3 w-3 text-emerald-400" /> {session.teacher}
                                      </span>
                                    )}
                                    <span className="text-zinc-400">{session.startTime}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {/* 1. Watch Recording */}
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setPlayerStream({
                                        url:
                                          session.recordingUrl ||
                                          session.streamUrl ||
                                          (id === "mj"
                                            ? REAL_USER_LIVE_STREAM
                                            : "https://d3uvoof8mq1fao.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/4864061/178906095188442352352/178906095188442352352_2352352.m3u8"),
                                        title: `${session.title} — Recorded Video`,
                                        isPdf: false,
                                      })
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs gap-1.5"
                                  >
                                    <Play className="h-3.5 w-3.5 fill-current" /> Watch Video
                                  </Button>

                                  {/* 2. View Notes PDF */}
                                  {session.notesUrl && (
                                    <Button
                                      size="sm"
                                      variant="cyber"
                                      onClick={() =>
                                        setPlayerStream({
                                          url: session.notesUrl!,
                                          title: `${session.title} — Class Notes (PDF)`,
                                          isPdf: true,
                                        })
                                      }
                                      className="font-mono text-xs gap-1.5 border-amber-500/30 text-amber-300 hover:text-amber-200"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> Notes PDF
                                    </Button>
                                  )}

                                  {/* 3. View DPP PDF */}
                                  {session.dppUrl && (
                                    <Button
                                      size="sm"
                                      variant="cyber"
                                      onClick={() =>
                                        setPlayerStream({
                                          url: session.dppUrl!,
                                          title: `${session.title} — Daily Practice Problem (DPP PDF)`,
                                          isPdf: true,
                                        })
                                      }
                                      className="font-mono text-xs gap-1.5 border-primary/30 text-primary hover:text-emerald-300"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> DPP Sheet
                                    </Button>
                                  )}

                                  {/* 4. Go to Content Tab */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleTabChange("content")}
                                    className="font-mono text-xs text-zinc-400 hover:text-white"
                                  >
                                    In Content →
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW B: PLATFORM BATCH CATALOG (ALL PLATFORMS NATIVE)
  // ==========================================
  return (
    <main
      style={{ "--brand-h": p.hue } as React.CSSProperties}
      className="mx-auto max-w-7xl space-y-6 px-4 py-8"
    >
      <div className="flex items-center justify-between">
        <Link to="/study" className="inline-flex items-center gap-2 font-mono text-xs text-primary">
          <ArrowLeft className="h-4 w-4" /> Study Hub
        </Link>
      </div>

      {/* Platform Header */}
      <div className="cyber-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PlatformLogo p={p} size={68} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">{p.name}</h1>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] text-primary">
                🟢 Direct Batches & Lectures
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-1.5 font-mono text-xs text-red-400">
          <Radio className="h-4 w-4 animate-pulse text-red-500" />
          <span>Live Streams & Upcoming Schedules Active</span>
        </div>
      </div>

      {/* SPECIAL VIEW FOR PI: 20 Categories Grid (Matches Screenshot 77) */}
      {id === "pi" && !selectedPiCategory ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                PI Categories (Physics Wallah Prime Hub)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kisi bhi category par click karke uske saare free batches aur lectures access
                karein.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search category (NEET, JEE, Class 10)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Exact 20 Categories Grid Matching Screenshot 77 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredPiCategories.map((cat) => (
              <div
                key={cat._id}
                onClick={() => void handleSelectPiCategory(cat)}
                className="group relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#121614] p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400/60 hover:bg-[#18231c] hover:shadow-[0_0_24px_rgba(16,185,129,0.22)] cursor-pointer"
              >
                <div className="flex h-16 w-16 items-center justify-center p-1 transition-transform group-hover:scale-110">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logos/pi.svg";
                    }}
                  />
                </div>
                <span className="mt-3.5 font-display text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : id === "pi" && selectedPiCategory ? (
        /* Selected PI Category Batches View */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPiCategory(null)}
                className="h-8 font-mono text-xs text-primary"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> All PI Categories
              </Button>
              <span className="text-zinc-600">/</span>
              <div className="flex items-center gap-2">
                <img
                  src={selectedPiCategory.imageUrl}
                  alt={selectedPiCategory.name}
                  className="h-6 w-6 object-contain"
                />
                <h2 className="font-display font-bold text-base text-white">
                  {selectedPiCategory.name}
                </h2>
              </div>
            </div>

            <span className="font-mono text-xs text-emerald-400">
              {piBatches.length} Batches Available
            </span>
          </div>

          {loadingPiBatches ? (
            <div className="text-center py-24 text-primary font-mono text-sm animate-pulse space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <span>[ LOADING {selectedPiCategory.name.toUpperCase()} BATCHES... ]</span>
            </div>
          ) : piBatches.length === 0 ? (
            <div className="cyber-card p-10 text-center font-mono text-sm text-muted-foreground">
              Is category ke batches load ho rahe hain.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {piBatches.map((b) => (
                <div
                  key={b.id}
                  className="cyber-card flex flex-col justify-between overflow-hidden group hover:border-primary/80 transition-all"
                >
                  <div className="cursor-pointer" onClick={() => handleOpenBatch(b)}>
                    <div className="aspect-video w-full overflow-hidden bg-black/60 relative">
                      {b.thumbnail ? (
                        <img
                          src={b.thumbnail}
                          alt={b.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              selectedPiCategory.imageUrl || "/logos/pi.svg";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                          STUDENT STUDY
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                        FREE
                      </span>
                    </div>
                    <div className="p-3">
                      <h2 className="line-clamp-2 text-xs font-bold leading-snug group-hover:text-primary transition-colors">
                        {b.title}
                      </h2>
                      {b.subtitle && (
                        <p className="mt-1 line-clamp-1 font-mono text-[10px] text-muted-foreground">
                          {b.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 p-2.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggle(b)}
                      className="h-7 px-2 font-mono text-[10px]"
                    >
                      {enr.includes(key(b)) ? (
                        <>
                          <Check className="h-3 w-3 text-primary mr-1" /> Saved
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" /> Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="neon"
                      onClick={() => handleOpenBatch(b)}
                      className="h-7 px-2.5 font-mono text-[10px]"
                    >
                      <Play className="h-3 w-3 mr-1 fill-current" /> Study →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Native Platform Batches View */
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search batch (jaise Drona, Arjuna, Nirmaan, GD)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <Button
                size="sm"
                variant={tab === "all" ? "neon" : "ghost"}
                onClick={() => setTab("all")}
              >
                All Batches ({batches.length})
              </Button>
              <Button
                size="sm"
                variant={tab === "enr" ? "neon" : "ghost"}
                onClick={() => setTab("enr")}
              >
                Saved ({enr.filter((x) => x.startsWith(`${id}:`)).length})
              </Button>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="cyber-card p-10 text-center font-mono text-sm text-muted-foreground">
              Direct batches abhi update ho rahe hain.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.slice(0, shown).map((b) => {
                const isEnrolled = enr.includes(key(b));
                return (
                  <div
                    key={b.id}
                    className="cyber-card flex flex-col justify-between overflow-hidden group hover:border-primary/80 transition-all"
                  >
                    <div className="cursor-pointer" onClick={() => handleOpenBatch(b)}>
                      <div className="aspect-video w-full overflow-hidden bg-black/60 relative">
                        {b.thumbnail ? (
                          <img
                            src={b.thumbnail}
                            alt={b.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                            STUDENT STUDY
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                          FREE
                        </span>
                      </div>
                      <div className="p-3">
                        <h2 className="line-clamp-2 text-xs font-bold leading-snug group-hover:text-primary transition-colors">
                          {b.title}
                        </h2>
                        {b.subtitle && (
                          <p className="mt-1 line-clamp-1 font-mono text-[10px] text-muted-foreground">
                            {b.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 p-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(b)}
                        className="h-7 px-2 font-mono text-[10px]"
                      >
                        {isEnrolled ? (
                          <>
                            <Check className="h-3 w-3 text-primary mr-1" /> Saved
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" /> Save
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="neon"
                        onClick={() => handleOpenBatch(b)}
                        className="h-7 px-2.5 font-mono text-[10px]"
                      >
                        <Play className="h-3 w-3 mr-1 fill-current" /> Study →
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {shown < list.length && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShown((s) => s + 16)}
                className="font-mono text-xs border-primary/40 text-primary"
              >
                Aur Batches Load Karein ({list.length - shown} baaki)
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
