const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const connectDB = require("./db");
const Activity = require("./models/Activity");

require("dotenv").config();

const app = express();

// 🔥 Middlewares
app.use(express.json());
app.use(cors());

// 🔥 DB
connectDB();

// 🔥 Serve screenshots
app.use("/screenshots", express.static(path.join(__dirname, "screenshots")));

// 🔥 HTTP + Socket
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// 🔥 Socket
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// 🔥 Multer (upload)
const storage = multer.diskStorage({
  destination: "screenshots/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".jpg");
  }
});

const upload = multer({ storage });

// ===============================
// 🔥 API ROUTES
// ===============================

// 🔹 Activity (no screenshot)
app.post("/activity", async (req, res) => {
  try {
    const activity = await Activity.create(req.body);
    io.emit("new-activity", activity);
    res.send(activity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// 🔹 Upload screenshot
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    data.screenshot = req.file.filename;

    const activity = await Activity.create(data);

    io.emit("new-activity", activity);

    res.send(activity);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// 🔹 Admin trigger screenshot
app.post("/take-screenshot", async (req, res) => {
  io.emit("trigger-screenshot", req.body);
  res.send("Triggered");
});

// 🔹 Get data (filters)
app.get("/activities", async (req, res) => {
  try {
    const { range } = req.query;

    let filter = {};
    const now = new Date();

    if (range === "1h") {
      filter.timestamp = {
        $gte: new Date(now.getTime() - 60 * 60 * 1000)
      };
    }

    if (range === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.timestamp = { $gte: start };
    }

    const data = await Activity.find(filter)
      .sort({ timestamp: -1 })
      .limit(300);

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// ===============================

server.listen(5000, () => {
  console.log("🚀 Server + Socket running on port 5000");
});