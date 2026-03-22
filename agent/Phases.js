// Step 1 — Create Your First Monitoring Agent
// Goal of Experiment 1

console.log("Agent started...");

setInterval(() => {
    console.log("System is running...");
}, 5000);

// xperiment 2
// Making the agent send data to a Node server.
// Agent  →  Server  →  Console log
// server.js

const express = require("express");

const app = express();

app.use(express.json());

app.post("/activity", (req, res) => {
    console.log("Data received from agent:");
    console.log(req.body);

    res.send("Data received");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});


// Update agent.js

const axios = require("axios");

console.log("Agent started...");

setInterval(async () => {

    const data = {
        user: "Darshan",
        status: "System Active",
        time: new Date()
    };

    try {
        await axios.post("http://localhost:5000/activity", data);
        console.log("Data sent to server");
    } catch (error) {
        console.log("Error sending data");
    }

}, 10000);

// Agent running on computer
//         ↓
// Send activity data
//         ↓
// Server receives data
//         ↓
// Dashboard will later show reports

// Experiment 3 — Track Active Window (Real Monitoring Begins)

// Update agent.js
const axios = require("axios");
const activeWin = require("active-win");

console.log("Agent started...");

setInterval(async () => {
    try {
        const window = await activeWin();

        const data = {
            user: "Darshan",
            app: window?.owner?.name,
            title: window?.title,
            time: new Date()
        };

        console.log("Current Activity:", data);

        await axios.post("http://localhost:5000/activity", data);

    } catch (error) {
        console.log("Error:", error.message);
    }

}, 5000);

// Again Update
const axios = require("axios");
const activeWin = require("active-win");

console.log("Agent started...");

setInterval(async () => {
    try {
        const window = await activeWin();

        let title = window?.title || "";
        let app = window?.owner?.name || "";

        // Extract simple website/app name
        let activity = title.split(" - ")[0];

        const data = {
            user: "Darshan",
            app: app,
            activity: activity,
            fullTitle: title,
            time: new Date()
        };

        console.log("Current Activity:", data);

        await axios.post("http://localhost:5000/activity", data);

    } catch (error) {
        console.log("Error:", error.message);
    }

}, 5000);


// Experiment 4 — Detect Idle Time (VERY IMPORTANT)

// This is a core feature in all monitoring tools.
// 🎯 Goal
// Detect:
// User is ACTIVE  ✅
// User is IDLE (not using system) ❌

// desktop-idle and iohook are old / poorly maintained / not compatible properly with modern Node iohook did not install successfully.

/*
using System;
using System.Runtime.InteropServices;
using System.IO;
using System.Threading;

class Program
{
    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    static double GetIdleTime()
    {
        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);

        GetLastInputInfo(ref lii);

        uint idleTime = ((uint)Environment.TickCount - lii.dwTime);

        return idleTime / 1000.0;
    }

    static void Main()
    {
        Console.WriteLine("Idle Tracker Started...");

        while (true)
        {
            double idleSeconds = GetIdleTime();

            // Write to file
            File.WriteAllText("idle.txt", idleSeconds.ToString());

            Thread.Sleep(2000); // every 2 sec
        }
    }
}
*/

// Update Your agent.js