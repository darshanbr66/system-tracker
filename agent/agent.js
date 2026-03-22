const { spawn } = require("child_process");
const activeWin = require("active-win");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const { io } = require("socket.io-client");

// 🔥 Start C# helper
const csharp = spawn("dotnet", ["run"], {
  cwd: path.join(__dirname, "..", "helper-csharp")
});

// 🔥 Socket connection
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

// 🔹 Variables
let idleTime = 0;
let lastInputType = "none";
let screenshotPath = "none";

let lastScreenshotTime = 0;
let lastApp = null;
let appStartTime = Date.now();

// 🔹 Read C# output
csharp.stdout.on("data", (data) => {
  const lines = data.toString().trim().split("\n");

  for (let line of lines) {
    const parts = line.split("|");

    if (parts.length >= 2) {
      idleTime = parseInt(parts[0]);
      lastInputType = parts[1];
      screenshotPath = parts[2] || "none";
    }
  }
});

// 🔹 Handle C# errors
csharp.stderr.on("data", (err) => {
  console.error("C# ERROR:", err.toString());
});

// 🔥 Trigger file (for C#)
const triggerScreenshot = () => {
  const triggerPath = path.join(
    __dirname,
    "..",
    "helper-csharp",
    "trigger.txt"
  );

  fs.writeFileSync(triggerPath, "capture");
};

// 📸 Upload screenshot
const uploadScreenshot = async (data) => {
  try {
    const fullPath = path.join(
      __dirname,
      "..",
      "helper-csharp",
      screenshotPath
    );

    if (screenshotPath !== "none" && fs.existsSync(fullPath)) {
      const form = new FormData();

      form.append("file", fs.createReadStream(fullPath));
      form.append("data", JSON.stringify(data));

      await axios.post("http://localhost:5000/upload", form, {
        headers: form.getHeaders()
      });

      console.log("📸 Screenshot uploaded");
    }
  } catch (err) {
    console.error("Upload Error:", err.message);
  }
};

// 🔥 MAIN TRACKING LOOP
setInterval(async () => {
  try {
    const window = await activeWin();
    if (!window) return;

    const now = Date.now();
    const idleSeconds = Math.floor(idleTime / 1000);

    const data = {
      user: "Darshan",
      app: window.owner.name,
      activity: window.title.split(" - ")[0],
      title: window.title,
      idleTimeMs: idleTime,
      idleTimeSec: idleSeconds,
      inputType: lastInputType,
      status: idleSeconds > 5 ? "IDLE" : "ACTIVE",
      timestamp: new Date()
    };

    // 🔥 RULE 1 → Every 1 hour
    if (now - lastScreenshotTime > 60 * 60 * 1000) {
      triggerScreenshot();

      // wait for C# to capture
      setTimeout(async () => {
        await uploadScreenshot(data);
      }, 1500);

      lastScreenshotTime = now;
    }

    // 🔥 RULE 2 → App change tracking
    if (lastApp !== window.owner.name) {
      lastApp = window.owner.name;
      appStartTime = now;
    }

    // 🔥 RULE 3 → Stay 10 min
    if (now - appStartTime > 10 * 60 * 1000) {
      triggerScreenshot();

      setTimeout(async () => {
        await uploadScreenshot(data);
      }, 1500);

      appStartTime = now;
    }

    // 🔹 Always send activity
    await axios.post("http://localhost:5000/activity", data);

    console.log("Tracking:", data);

  } catch (err) {
    console.error("FULL ERROR:", err.message);
  }
}, 3000);

// 🔥 ADMIN TRIGGER (REAL-TIME)
socket.on("trigger-screenshot", async () => {
  try {
    console.log("📸 Admin requested screenshot");

    triggerScreenshot();

    // 🔥 wait for C# to generate screenshot
    setTimeout(async () => {
      if (screenshotPath !== "none") {
        const window = await activeWin();
        if (!window) return;

        const data = {
          user: "Darshan",
          app: window.owner.name,
          activity: window.title,
          title: window.title,
          manual: true,
          timestamp: new Date()
        };

        await uploadScreenshot(data);
      }
    }, 1500);

  } catch (err) {
    console.error("Manual screenshot error:", err.message);
  }
});