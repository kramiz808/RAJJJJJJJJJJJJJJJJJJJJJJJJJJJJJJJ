import { createFileRoute } from "@tanstack/react-router";
import { beeOrigin, isBeeHost } from "@/lib/platforms";

// Same-origin passthrough for the class player so it runs on our site with our own name and logo.
// Our KeyGate already unlocked the student, so the upstream key/OTP screen is pre-cleared here.
const pre = (
  host: string,
) => `<script>(function(){var P="/api/public/bee/${host}";try{localStorage.setItem("smex_key_expiry",String(Date.now()+31536e6))}catch(e){}
window.__ssHome=function(){if(window.parent&&window.parent!==window){window.parent.postMessage("ss-close","*");window.top.location.assign("/study");}else{location.assign("/study");}};
function fx(u){return typeof u==="string"&&u.charAt(0)==="/"&&u.charAt(1)!=="/"&&u.indexOf("/api/public/")!==0?P+u:u}
var f=window.fetch;window.fetch=function(u,o){if(typeof u==="string")u=fx(u);return f.call(this,u,o)};
var x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=fx(u);return x.apply(this,arguments)};})();</script>`;

const BRAND = `<style>
  img[src*="logo"], img[alt*="logo" i], img[src*="bee" i], img[src*="panda" i] {
    content: url("/favicon.png") !important;
    max-height: 42px !important;
  }
</style>
<script>(function(){
  var L="/favicon.png";
  function fix(){
    document.querySelectorAll("img").forEach(function(i){
      var s=(i.getAttribute("src")||"")+" "+(i.alt||"");
      if(/logo|bee|panda|studypanda|studybeepro/i.test(s)&&i.src.indexOf(L)<0){
        i.src=L; i.alt="Student Study";
      }
    });
    var w=document.createTreeWalker(document.body||document.documentElement,4),n;
    while(n=w.nextNode()){
      if(/study\\s*(bee|panda)/i.test(n.nodeValue)){
        n.nodeValue=n.nodeValue.replace(/study\\s*(bee|panda)(\\s*pro)?/gi,"Student Study");
      }
    }
    if(/study\\s*(bee|panda)/i.test(document.title)) document.title="Student Study";
  }
  document.addEventListener("DOMContentLoaded",function(){
    fix();
    new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  });
})();</script>`;

const rewrite = (t: string, host: string) =>
  t
    // Their logo images -> our logo, before the page ever paints.
    .replace(/https?:\/\/i\.ibb\.co\/yF4mhNPB\/[^"'\s)]+/gi, "/favicon.png")
    .replace(/https?:\/\/(www\.)?studybeepro\.(site|in)\/logo\/?[a-z]*/gi, "/favicon.png")
    .replace(/https?:\/\/(www\.)?studypanda\.(live|site)\/logo\/?[a-z]*/gi, "/favicon.png")
    .replace(/(["'(])\/logo\/[a-z]*/gi, "$1/favicon.png")
    // Split headings like STUDY<span>BEE</span>.
    .replace(/STUDY(\s*<span[^>]*>)\s*BEE(\s*<\/span>)/g, "STUDENT$1STUDY$2")
    .replace(/STUDY(\s*<span[^>]*>)\s*PANDA(\s*<\/span>)/g, "STUDENT$1STUDY$2")
    // Anti-devtools traps kick students to an error page on slow phones — disable them.
    .replace(/\bdebugger\s*;/g, ";")
    .replace(/(window\.)?location\.href\s*=\s*(['"])error\.html\2/g, "void 0")
    // Back-to-home buttons close the player on our site instead of opening their home page.
    .replace(/(window\.)?location\.href\s*=\s*(['"])index\.html\2/g, "window.__ssHome()")
    // Their absolute links -> our proxy.
    .replace(/https?:\/\/([a-z]{2,20})\.studybeepro\.site/gi, "/api/public/bee/$1")
    .replace(/https?:\/\/studybeepro\.site/gi, "/api/public/bee/www")
    .replace(/https?:\/\/studybeepro\.in/gi, "/api/public/bee/studybee")
    .replace(/https?:\/\/studypanda\.live/gi, "/api/public/bee/studypanda")
    .replace(/https?:\/\/nexthope\.pages\.dev/gi, "/api/public/bee/nexthope")
    .replace(/https?:\/\/learnbyakp\.site/gi, "/api/public/bee/learnbyakp")
    .replace(/https?:\/\/eduvibe-mj\.pages\.dev/gi, "/api/public/bee/eduvibemj")
    // Root-relative API calls and HTML attributes stay inside this platform's proxy.
    .replace(/(['"`])\/api\/(?!public\/)/g, `$1/api/public/bee/${host}/api/`)
    .replace(
      /((?:src|href|action)=["'])\/(?!\/|api\/public\/|favicon)/gi,
      `$1/api/public/bee/${host}/`,
    )
    .replace(/study\s*bee(\s*pro)?(\s*🐝)?/gi, "Student Study")
    .replace(/study\s*panda(\s*🐼)?/gi, "Student Study");

export const Route = createFileRoute("/api/public/bee/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const m = /^([a-z0-9-]{2,30})\/?(.*)$/.exec(params._splat ?? "");
        if (!m || !isBeeHost(m[1]!)) return new Response("Not found", { status: 404 });
        const host = m[1]!;
        const path = m[2] ?? "";
        const u = new URL(request.url);
        try {
          const r = await fetch(`${beeOrigin(host)}/${path}${u.search}`, {
            headers: {
              "user-agent": request.headers.get("user-agent") ?? "Mozilla/5.0",
              accept: request.headers.get("accept") ?? "*/*",
            },
            signal: AbortSignal.timeout(6000),
          });
          const type = r.headers.get("content-type") ?? "";
          const isApi = path.startsWith("api/") || type.includes("json");
          const h = new Headers({
            "content-type": type || "application/octet-stream",
            "cache-control": isApi
              ? "no-store"
              : /html/.test(type)
                ? "public, max-age=120"
                : "public, max-age=86400",
          });
          if (/html|javascript|css|json/.test(type)) {
            let body = rewrite(await r.text(), host);
            if (type.includes("html"))
              body = body.replace(/<head[^>]*>/i, (x) => x + pre(host) + BRAND);
            return new Response(body, { status: r.status, headers: h });
          }
          return new Response(r.body, { status: r.status, headers: h });
        } catch {
          return new Response("Gateway upstream temporarily unavailable", { status: 502 });
        }
      },
    },
  },
});
