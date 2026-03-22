import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

const COLORS = ["#22c55e", "#ef4444", "#f59e0b"];
const INTERVAL = 3;
const GROUP_SIZE = 10;

function App() {
  const [data, setData] = useState([]);
  const [range, setRange] = useState("1h");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [zoom, setZoom] = useState(1);

  const screenshots = data.filter(d => d.screenshot);

  // 🔥 FETCH
  const fetchData = async () => {
    const res = await axios.get(
      `http://localhost:5000/activities?range=${range}`
    );
    setData(res.data);
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  useEffect(() => {
    socket.on("new-activity", (newData) => {
      if (range === "1h") {
        setData(prev => [newData, ...prev].slice(0, 300));
      }
    });

    return () => socket.off("new-activity");
  }, [range]);

  // 🔥 APP USAGE
  const appUsage = {};
  data.forEach(item => {
    appUsage[item.app] = (appUsage[item.app] || 0) + INTERVAL;
  });

  const appChart = Object.keys(appUsage).map(key => ({
    name: key,
    value: Number((appUsage[key] / 60).toFixed(2))
  }));

  // 🔥 STATUS
  let activeTime = 0;
  let idleTime = 0;
  let awayTime = 0;

  data.forEach(item => {
    if (item.status === "ACTIVE") activeTime += INTERVAL;
    if (item.status === "IDLE") idleTime += INTERVAL;
    if (item.status === "AWAY") awayTime += INTERVAL;
  });

  const statusChart = [
    { name: "ACTIVE", value: activeTime },
    { name: "IDLE", value: idleTime },
    { name: "AWAY", value: awayTime }
  ];

  const totalTime = activeTime + idleTime + awayTime;

  const productivity = totalTime
    ? ((activeTime / totalTime) * 100).toFixed(1)
    : 0;

  // 🔥 TIMELINE
  const grouped = [];
  const recentData = data.slice(0, 100).reverse();

  for (let i = 0; i < recentData.length; i += GROUP_SIZE) {
    const chunk = recentData.slice(i, i + GROUP_SIZE);

    const activeCount = chunk.filter(x => x.status === "ACTIVE").length;

    grouped.push({
      time: new Date(chunk[0].timestamp).toLocaleTimeString(),
      value: activeCount / chunk.length
    });
  }

  useEffect(() => {
    axios.get("http://localhost:5000/activities")
      .then(res => setData(res.data));

    socket.on("new-activity", d => {
      setData(prev => [d, ...prev]);
    });

    return () => socket.off("new-activity");
  }, []);

  // 🔥 ZOOM SCROLL
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(prev + (e.deltaY > 0 ? -0.1 : 0.1), 3)));
  };

  // 🔥 DELETE
  const deleteScreenshot = async (id) => {
    await axios.delete(`http://localhost:5000/screenshot/${id}`);
    setData(prev => prev.filter(x => x._id !== id));
    setSelectedIndex(null);
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <h1 className="text-3xl font-bold mb-6">
        🚀 System Tracker Dashboard
      </h1>

      {/* FILTER */}
      <div className="flex gap-4 mb-6">
        {["1h", "today", "all"].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded ${
              range === r ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p>Total</p>
          <p className="text-2xl">{data.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-green-500">Active</p>
          <p>{(activeTime / 60).toFixed(1)} min</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-red-500">Idle</p>
          <p>{(idleTime / 60).toFixed(1)} min</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p>Productivity</p>
          <p>{productivity}%</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-6 mb-6">

        <div className="bg-white p-4 rounded-xl shadow">
          <h2>App Usage</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={appChart}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2>Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusChart} dataKey="value">
                {statusChart.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* TIMELINE */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2>Timeline</h2>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={grouped}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 1]} />
            <Tooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Line dataKey="value" stroke="#22c55e" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SCREENSHOT STRIP */}
      <div className="bg-white/10 backdrop-blur-lg p-4 rounded-xl shadow-lg mb-6">
        <h2 className="mb-3 text-lg">📸 Screenshots</h2>

        <div className="flex gap-3 overflow-x-auto">
          {screenshots.map((item, i) => (
            <div key={i} onClick={() => setSelectedIndex(i)} className="cursor-pointer">
              <img
                src={`http://localhost:5000/screenshots/${item.screenshot}`}
                className="w-36 rounded-lg hover:scale-105 transition"
              />
            </div>
          ))}
        </div>

        <button
          className="mt-4 bg-blue-500 px-4 py-2 rounded"
          onClick={() =>
            axios.post("http://localhost:5000/take-screenshot", {
              user: "Darshan"
            })
          }
        >
          📸 Take Screenshot
        </button>
      </div>

      {/* 🔥 MODAL */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onWheel={handleWheel}
        >
          {/* CLOSE */}
          <button
            className="absolute top-5 right-5 text-2xl"
            onClick={() => {
              setSelectedIndex(null);
              setZoom(1);
            }}
          >
            ✖
          </button>

          {/* IMAGE */}
          <img
            src={`http://localhost:5000/screenshots/${screenshots[selectedIndex].screenshot}`}
            style={{
              transform: `scale(${zoom})`,
              transition: "0.2s"
            }}
            className="max-h-[80vh] rounded-xl"
          />

          {/* CONTROLS */}
          <div className="absolute bottom-5 flex gap-4">

            {/* PREV */}
            <button
              onClick={() =>
                setSelectedIndex(prev => Math.max(prev - 1, 0))
              }
            >
              ◀
            </button>

            {/* NEXT */}
            <button
              onClick={() =>
                setSelectedIndex(prev =>
                  Math.min(prev + 1, screenshots.length - 1)
                )
              }
            >
              ▶
            </button>

            {/* DOWNLOAD */}
            <a
              href={`http://localhost:5000/screenshots/${screenshots[selectedIndex].screenshot}`}
              download
              className="bg-green-500 px-3 py-1 rounded"
            >
              ⬇ Download
            </a>

            {/* DELETE */}
            <button
              onClick={() =>
                deleteScreenshot(screenshots[selectedIndex]._id)
              }
              className="bg-red-500 px-3 py-1 rounded"
            >
              🗑 Delete
            </button>

          </div>

          {/* TIMESTAMP */}
          <div className="absolute top-5 left-5 text-white bg-black/60 px-3 py-1 rounded text-sm">
            {new Date(
              screenshots[selectedIndex].timestamp
            ).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;