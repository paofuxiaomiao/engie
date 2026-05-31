import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const defaultUrl = "http://127.0.0.1:5173/";
const url = process.env.APP_URL ?? defaultUrl;
const shouldStartServer = !process.env.APP_URL;
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const outDir = new URL("../verification/", import.meta.url);

function outPath(fileName) {
  return fileURLToPath(new URL(fileName, outDir));
}

function assert(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

async function waitForServer(targetUrl, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  }
  throw new Error(`dev server did not respond at ${targetUrl}`);
}

function startDevServer() {
  const viteBin = fileURLToPath(new URL("../node_modules/.bin/vite", import.meta.url));
  const child = spawn(viteBin, ["--host", "127.0.0.1", "--port", "5173"], {
    cwd: rootDir,
    stdio: "ignore",
    env: { ...process.env, BROWSER: "none" },
  });

  return child;
}

async function readVisualMetrics(page, selector) {
  const box = await page.locator(selector).boundingBox();
  const buffer = await page.locator(selector).screenshot();
  const png = PNG.sync.read(buffer);
  const left = Math.floor(png.width * 0.16);
  const right = Math.floor(png.width * 0.84);
  const top = Math.floor(png.height * 0.14);
  const bottom = Math.floor(png.height * 0.86);

  let nonWhite = 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = (png.width * y + x) * 4;
      const r = png.data[index];
      const g = png.data[index + 1];
      const b = png.data[index + 2];
      const brightness = (r + g + b) / 3;
      if (Math.abs(r - 255) + Math.abs(g - 255) + Math.abs(b - 255) > 34) {
        nonWhite += 1;
      }
      sum += brightness;
      sumSquares += brightness * brightness;
      count += 1;
    }
  }

  const mean = sum / count;
  const variance = sumSquares / count - mean * mean;

  return {
    width: box?.width ?? png.width,
    height: box?.height ?? png.height,
    nonWhiteRatio: nonWhite / count,
    variance,
  };
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.waitForTimeout(1_200);

  const title = await page.locator(".stage-title h2").innerText();
  const moduleCount = await page.locator(".module-row").count();
  const modeTitles = await page
    .locator(".mode-switcher button")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("title")));
  const engineCardCount = await page.locator(".engine-card").count();
  const visualBox = await page.locator("canvas").boundingBox();
  const cutawayBox = await page.locator(".cutaway-panel img").boundingBox();
  const firstEngineBox = await page.locator(".engine-card img").first().boundingBox();
  const metrics = await readVisualMetrics(page, "canvas");

  await page.screenshot({ path: outPath(`${name}.png`), fullPage: true });
  await page.locator("canvas").screenshot({ path: outPath(`${name}-visual.png`) });

  assert(title.includes("SU7 风格纯电轿跑"), `${name}: vehicle title mismatch`);
  assert(moduleCount === 6, `${name}: expected 6 modules, received ${moduleCount}`);
  assert(
    modeTitles.includes("整车") && modeTitles.includes("透视") && modeTitles.includes("聚焦"),
    `${name}: missing view mode controls`,
  );
  assert(engineCardCount === 4, `${name}: expected 4 engine learning cards, received ${engineCardCount}`);
  assert(visualBox && visualBox.width > 260 && visualBox.height > 220, `${name}: visual is too small`);
  assert(cutawayBox && cutawayBox.width > 260 && cutawayBox.height > 130, `${name}: cutaway image is too small`);
  assert(firstEngineBox && firstEngineBox.width > 260 && firstEngineBox.height > 130, `${name}: engine image is too small`);
  assert(metrics.nonWhiteRatio > 0.035, `${name}: 3D visual appears blank`);
  assert(metrics.variance > 80, `${name}: 3D visual has too little pixel variation`);

  await page.close();

  return { name, title, moduleCount, modeTitles, engineCardCount, visualBox, cutawayBox, firstEngineBox, metrics };
}

async function verifyInteractions(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.waitForTimeout(700);

  for (const label of ["电池与 CTB 底盘", "电驱与电控", "智能驾驶感知"]) {
    await page.locator(".module-row").filter({ hasText: label }).click();
    await page.waitForTimeout(400);
    const detailTitle = await page.locator(".detail-hero h3").innerText();
    assert(detailTitle.includes(label), `detail panel did not update for ${label}`);
    const bannerText = await page.locator(".selected-banner").innerText();
    assert(bannerText.includes(label), `stage banner did not update for ${label}`);
  }

  for (const mode of ["透视", "聚焦", "整车"]) {
    await page.locator(".mode-switcher button").filter({ hasText: mode }).click();
    await page.waitForTimeout(500);
    const activeMode = await page.locator(".mode-switcher button.is-active").getAttribute("title");
    assert(activeMode === mode, `active mode mismatch for ${mode}`);
    const metrics = await readVisualMetrics(page, "canvas");
    assert(metrics.nonWhiteRatio > 0.03, `${mode}: visual appears blank after mode switch`);
  }

  await page.screenshot({ path: outPath("interaction.png"), fullPage: true });
  await page.locator("canvas").screenshot({ path: outPath("interaction-canvas.png") });
  await page.close();

  return { ok: true };
}

await mkdir(outDir, { recursive: true });

let server;
if (shouldStartServer) {
  server = startDevServer();
  await waitForServer(url);
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const desktop = await verifyViewport(browser, "desktop", { width: 1440, height: 1000 });
  const compact = await verifyViewport(browser, "compact", { width: 1280, height: 720 });
  const mobile = await verifyViewport(browser, "mobile", { width: 390, height: 900 });
  const interactions = await verifyInteractions(browser);

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        screenshots: [
          "verification/desktop.png",
          "verification/desktop-visual.png",
          "verification/compact.png",
          "verification/compact-visual.png",
          "verification/mobile.png",
          "verification/mobile-visual.png",
          "verification/interaction.png",
          "verification/interaction-canvas.png",
        ],
        desktop,
        compact,
        mobile,
        interactions,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  if (server) {
    server.kill("SIGTERM");
  }
}
