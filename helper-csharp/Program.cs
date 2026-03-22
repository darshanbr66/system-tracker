using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

class Program
{
    // 🔥 DPI FIX (IMPORTANT)
    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    public struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);

    static string lastInputType = "none";
    static DateTime lastInputTime = DateTime.MinValue;

    static void Main()
    {
        // 🔥 FIX SCALING ISSUE
        SetProcessDPIAware();

        // 📁 Ensure folder exists
        Directory.CreateDirectory("screenshots");

        Console.WriteLine("C# Helper Started...");

        while (true)
        {
            uint idleTime = GetIdleTime();

            DetectInput();

            // 🔥 Reset input after 6 sec
            if ((DateTime.Now - lastInputTime).TotalSeconds > 6)
                lastInputType = "none";

            string screenshotPath = "none";

            // 🔥 ADMIN TRIGGER
            if (File.Exists("trigger.txt"))
            {
                screenshotPath = CaptureScreen();

                try
                {
                    File.Delete("trigger.txt");
                }
                catch { }
            }

            Console.WriteLine($"{idleTime}|{lastInputType}|{screenshotPath}");

            Thread.Sleep(1000);
        }
    }

    // 📸 FULL SCREEN CAPTURE (ALL MONITORS - FINAL FIX)
    static string CaptureScreen()
    {
        try
        {
            // 🔥 Capture full virtual screen (multi-monitor)
            Rectangle bounds = SystemInformation.VirtualScreen;

            using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(bitmap))
                {
                    g.CopyFromScreen(
                        bounds.X,
                        bounds.Y,
                        0,
                        0,
                        bounds.Size,
                        CopyPixelOperation.SourceCopy
                    );
                }

                string fileName = $"screenshots/{DateTime.Now.Ticks}.jpg";

                // 🔥 SAVE (High quality JPEG)
                var encoder = GetEncoder(ImageFormat.Jpeg);
                var encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 90L);

                bitmap.Save(fileName, encoder, encoderParams);

                return fileName;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Screenshot Error: " + ex.Message);
            return "error";
        }
    }

    // 🔧 JPEG Encoder (for quality control)
    static ImageCodecInfo GetEncoder(ImageFormat format)
    {
        ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
        foreach (var codec in codecs)
        {
            if (codec.FormatID == format.Guid)
            {
                return codec;
            }
        }
        return null;
    }

    // 💤 Idle Time
    static uint GetIdleTime()
    {
        LASTINPUTINFO info = new LASTINPUTINFO();
        info.cbSize = (uint)Marshal.SizeOf(info);

        GetLastInputInfo(ref info);

        return (uint)Environment.TickCount - info.dwTime;
    }

    // ⌨️🖱 Input Detection
    static void DetectInput()
    {
        // Keyboard A-Z
        for (int i = 0x41; i <= 0x5A; i++)
        {
            if ((GetAsyncKeyState(i) & 0x8000) != 0)
            {
                lastInputType = "keyboard";
                lastInputTime = DateTime.Now;
                return;
            }
        }

        // Mouse left / right
        if ((GetAsyncKeyState(0x01) & 0x8000) != 0 ||
            (GetAsyncKeyState(0x02) & 0x8000) != 0)
        {
            lastInputType = "mouse";
            lastInputTime = DateTime.Now;
        }
    }
}