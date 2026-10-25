import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function checkPassword(input: string) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) return false;
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

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, "10 digit number");

function randomKey(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `${prefix}-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}

/** Student redeems a key. Free keys work for anyone; VIP keys only with the matching phone. */
export const redeemKey = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        key: z.string().trim().min(4).max(40),
        phone: z.string().trim().max(15).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("access_keys")
      .select("kind, phone, expires_at")
      .eq("key", data.key.toUpperCase())
      .maybeSingle();
    if (!row || new Date(row.expires_at) < new Date())
      return { ok: false as const, error: "Key galat hai ya expire ho gayi" };
    if (row.kind === "vip" && row.phone !== (data.phone ?? ""))
      return { ok: false as const, error: "Ye VIP key is number ki nahi hai" };
    const until =
      row.kind === "free"
        ? Math.min(Date.now() + 24 * 3600e3, new Date(row.expires_at).getTime())
        : new Date(row.expires_at).getTime();
    return { ok: true as const, kind: row.kind, until };
  });

export const createKey = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        password: z.string().max(100),
        kind: z.enum(["free", "vip"]),
        phone: phoneSchema.optional(),
        days: z.number().int().min(1).max(365),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password)))
      return { ok: false as const, error: "Galat password" };
    if (data.kind === "vip" && !data.phone)
      return { ok: false as const, error: "VIP ke liye number chahiye" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = randomKey(data.kind === "vip" ? "VIP" : "FREE");
    const expires_at = new Date(Date.now() + data.days * 86400e3).toISOString();
    const { error } = await supabaseAdmin.from("access_keys").insert({
      key,
      kind: data.kind,
      phone: data.kind === "vip" ? data.phone! : null,
      expires_at,
    });
    if (error) {
      console.error(error);
      return { ok: false as const, error: "Key save nahi hui" };
    }
    return { ok: true as const, key, expires_at };
  });

export const listKeys = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) return { ok: false as const, items: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("access_keys")
      .select("id, key, kind, phone, expires_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return { ok: true as const, items: rows ?? [] };
  });

export const deleteKey = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(100), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkPassword(data.password))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("access_keys").delete().eq("id", data.id);
    return { ok: !error };
  });
