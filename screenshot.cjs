const puppeteer = require("puppeteer-core");
const path = require("path");
const dir =
  "C:\\Users\\Windows 10\\.gemini\\antigravity\\brain\\0a93d833-b573-4324-871f-817cbf53ee64";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const shots = [
    ["study_all", "http://localhost:8080/study"],
    ["batches_mj", "http://localhost:8080/batches/mj"],
    ["batches_rwa", "http://localhost:8080/batches/rwa"],
    ["batches_ua", "http://localhost:8080/batches/ua-on"],
    ["batches_nt", "http://localhost:8080/batches/nt"],
  ];

  for (const [name, url] of shots) {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    const outPath = path.join(dir, `${name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log("saved " + name + ".png");
  }

  await browser.close();
  console.log("DONE");
})();
