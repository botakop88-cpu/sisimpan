const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

  // ========== LOGIN PAGE DEEP INSPECTION ==========
  await p.goto("https://sisimpan-six.vercel.app/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);

  const info = await p.evaluate(() => {
    const results = [];

    // Check all images
    const imgs = document.querySelectorAll("img");
    imgs.forEach(img => {
      results.push({
        type: "img",
        src: img.src,
        visible: img.offsetParent !== null,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rect: img.getBoundingClientRect(),
        alt: img.alt
      });
    });

    // Check material symbols rendering
    const symbols = document.querySelectorAll(".material-symbols-outlined");
    symbols.forEach(s => {
      const style = getComputedStyle(s);
      results.push({
        type: "material-icon",
        text: s.textContent.trim(),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        color: style.color,
        visible: s.offsetParent !== null
      });
    });

    // Check left panel text content
    const leftPanel = document.querySelector(".lg\\:flex");
    results.push({
      type: "panel",
      panel: "left",
      text: leftPanel?.innerText?.substring(0, 300)
    });

    // Check right panel
    const rightPanel = document.querySelector(".lg\\:w-1\\/2");
    results.push({
      type: "panel",
      panel: "right",
      text: rightPanel?.innerText?.substring(0, 300)
    });

    // Body background color
    results.push({
      type: "style",
      bodyBg: getComputedStyle(document.body).backgroundColor,
      surfaceColor: getComputedStyle(document.documentElement).getPropertyValue("--color-surface")
    });

    return results;
  });

  console.log(JSON.stringify(info, null, 2));
  await p.screenshot({ path: "login-fullpage.png", fullPage: true });

  // ========== UPLOAD PAGE ==========
  await p.goto("https://sisimpan-six.vercel.app/upload", { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  
  const uploadInfo = await p.evaluate(() => {
    const results = [];
    
    // Check sidebar rendering
    const nav = document.querySelector("nav");
    results.push({ type: "sidebar", navItems: nav?.querySelectorAll("a")?.length });

    // Check main content
    const main = document.querySelector("main");
    results.push({ type: "main", text: main?.innerText?.substring(0, 200) });

    // Check for any broken elements
    const allImgs = document.querySelectorAll("img");
    allImgs.forEach(img => {
      results.push({
        type: "upload-img",
        src: img.src,
        loaded: img.complete && img.naturalWidth > 0
      });
    });

    return results;
  });

  console.log("\n=== UPLOAD PAGE ===");
  console.log(JSON.stringify(uploadInfo, null, 2));
  await p.screenshot({ path: "upload-fullpage.png", fullPage: true });

  await b.close();
})();