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