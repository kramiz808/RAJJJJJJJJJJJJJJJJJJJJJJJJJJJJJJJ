import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function checkPassword(input: string) {
  const expected = process.env["ADMIN_PASSWORD"] || "1145344";
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a),
    y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => ({ ok: await checkPassword(data.password) }));

export const getOnlineCount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) return { ok: false as const, count: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cutoff = new Date(Date.now() - 75000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("online_visitors")
      .select("id", { count: "exact", head: true })
      .gte("last_seen", cutoff);
    if (error) throw new Error("Online count unavailable");
    return { ok: true as const, count: count ?? 0 };
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string().max(100),
        title: z.string().trim().max(120).optional(),
        author: z.string().trim().max(50).optional(),
        message: z.string().trim().min(1).max(1000),
        platform: z.string().max(20),
        priority: z.enum(["normal", "important", "urgent"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password)))
      return { ok: false as const, error: "Galat password" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("announcements").insert({
      title: data.title || null,
      author: data.author || null,
      message: data.message,
      platform: data.platform,
      priority: data.priority,
    });
    if (error) {
      console.error(error);
      return { ok: false as const, error: "Save nahi hua" };
    }
    return { ok: true as const };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ password: z.string().max(100), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    return { ok: !error };
  });
