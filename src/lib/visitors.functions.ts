import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export const heartbeatVisitor = createServerFn({ method: "POST" }).handler(async () => {
  const password =
    process.env["SESSION_SECRET"] || "student-study-visitor-session-secret-32-chars-minimum";
  const session = await useSession<{ visitorId?: string }>({
    password,
    name: "student-visitor",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
    },
  });
  let id = session.data.visitorId;
  if (!id) {
    id = crypto.randomUUID();
    await session.update({ visitorId: id });
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("online_visitors")
      .upsert({ id, last_seen: new Date().toISOString() });
  } catch {
    /* Offline mock or connection error */
  }
  return { ok: true };
});
