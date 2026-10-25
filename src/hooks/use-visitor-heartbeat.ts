import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { heartbeatVisitor } from "@/lib/visitors.functions";

export function useVisitorHeartbeat() {
  const heartbeat = useServerFn(heartbeatVisitor);
  useEffect(() => {
    let pending = false;
    const beat = async () => {
      if (
        pending ||
        document.visibilityState !== "visible" ||
        window.location.pathname === "/admin"
      )
        return;
      pending = true;
      try {
        await heartbeat();
      } catch {
        /* Try again on next heartbeat. */
      } finally {
        pending = false;
      }
    };
    void beat();
    const timer = window.setInterval(beat, 25000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [heartbeat]);
}
