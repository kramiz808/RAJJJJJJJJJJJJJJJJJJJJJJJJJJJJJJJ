import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export const heartbeatVisitor = createServerFn({ method: "POST" }).handler(async () => {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("Visitor tracking unavailable");
  const session = await useSession<{ visitorId?: string }>({
    password,
    name: "student-visitor",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
  let id = session.data.visitorId;
  if (!id) {
    id = crypto.randomUUID();
    await session.update({ visitorId: id });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("online_visitors")
    .upsert({ id, last_seen: new Date().toISOString() });
  if (error) throw new Error("Visitor tracking unavailable");
  return { ok: true };
});
