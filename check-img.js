const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  
  // Check the reference image file to understand dimensions
  const fs = require("fs");
  const path = require("path");
  const imgPath = "C:\\Users\\User\\Downloads\\stitch_visual_prototype_implementation\\a_professional_and_modern_abstract_ui_illustration_for_a_cloud_storage\\screen.png";
  const stats = fs.statSync(imgPath);
  console.log("File size:", stats.size, "bytes");
  
  console.log("File exists:", fs.existsSync(imgPath));
})();