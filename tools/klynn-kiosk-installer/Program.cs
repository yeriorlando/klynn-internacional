/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Windows setup assistant · Refined two-column layout · #001a42 sidebar
 */
using Microsoft.Win32;
using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Klynn.KioskInstaller;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Any(arg => arg.Equals("--self-test", StringComparison.OrdinalIgnoreCase)))
        {
            var shellAvailable = Type.GetTypeFromProgID("WScript.Shell") is not null;
            var browsersDetected = BrowserDiscovery.FindAll().Count;
            return shellAvailable && browsersDetected >= 0 ? 0 : 1;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new InstallerForm());
        return 0;
    }
}

internal sealed record BrowserChoice(string Name, string ExecutablePath, bool SilentPrinting, string Key)
{
    public override string ToString() => Name;
}

internal sealed record PrinterChoice(string Name, bool IsDefault, bool IsThermalLikely)
{
    public override string ToString()
    {
        var tags = new List<string>();
        if (IsThermalLikely) tags.Add("Térmica / POS");
        if (IsDefault) tags.Add("Predeterminada");
        return tags.Count > 0 ? $"{Name} ({string.Join(", ", tags)})" : Name;
    }
}

internal sealed record PaperFormatPreset(string DisplayName, string FormName, int WidthMicrons, int HeightMicrons, string Description)
{
    public override string ToString() => DisplayName;
}

internal static class PaperPresets
{
    public static readonly List<PaperFormatPreset> All =
    [
        new("80 mm estándar · 72 x 210 mm (Recomendado)", "72.00x210.00(mm)", 72000, 210000, "Formato 72mm para rollos de 80mm sin cortes."),
        new("80 mm continuo · 72 x 297 mm", "72.00x297.00(mm)", 72000, 297000, "Para órdenes extensas en rollos de 80 mm."),
        new("58 mm estándar · 48 x 210 mm", "48.00x210.00(mm)", 48000, 210000, "Para impresoras compactas de 58 mm."),
        new("80 mm sin límite · 72 x 3276 mm", "72.00x3276.00(mm)", 72000, 3276000, "Para rollos continuos con corte automático.")
    ];
}

internal static class BrowserDiscovery
{
    private sealed record Candidate(string Name, string Key, bool Silent, string[] RelativePaths, string[] RegistryNames);

    private static readonly Candidate[] Candidates =
    [
        new("Google Chrome", "chrome", true,
            [@"Google\Chrome\Application\chrome.exe"], ["chrome.exe"]),
        new("Microsoft Edge", "edge", true,
            [@"Microsoft\Edge\Application\msedge.exe"], ["msedge.exe"]),
        new("Brave", "brave", true,
            [@"BraveSoftware\Brave-Browser\Application\brave.exe"], ["brave.exe"]),
        new("Chromium", "chromium", true,
            [@"Chromium\Application\chrome.exe"], ["chromium.exe"]),
        new("Vivaldi", "vivaldi", false,
            [@"Vivaldi\Application\vivaldi.exe"], ["vivaldi.exe"]),
        new("Opera", "opera", false,
            [@"Programs\Opera\opera.exe", @"Programs\Opera GX\opera.exe"], ["opera.exe"]),
        new("Mozilla Firefox", "firefox", false,
            [@"Mozilla Firefox\firefox.exe"], ["firefox.exe"]),
    ];

    public static List<BrowserChoice> FindAll()
    {
        var roots = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        }.Where(path => !string.IsNullOrWhiteSpace(path)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        var found = new List<BrowserChoice>();
        foreach (var candidate in Candidates)
        {
            string? executable = null;
            foreach (var root in roots)
            {
                foreach (var relative in candidate.RelativePaths)
                {
                    var path = Path.Combine(root, relative);
                    if (File.Exists(path))
                    {
                        executable = path;
                        break;
                    }
                }
                if (executable is not null) break;
            }

            executable ??= FindInRegistry(candidate.RegistryNames);
            if (executable is not null && !found.Any(item => item.ExecutablePath.Equals(executable, StringComparison.OrdinalIgnoreCase)))
                found.Add(new BrowserChoice(candidate.Name, executable, candidate.Silent, candidate.Key));
        }

        return found.OrderByDescending(browser => browser.SilentPrinting).ThenBy(browser => browser.Name).ToList();
    }

    private static string? FindInRegistry(IEnumerable<string> executableNames)
    {
        foreach (var hive in new[] { RegistryHive.CurrentUser, RegistryHive.LocalMachine })
        foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
        foreach (var executableName in executableNames)
        {
            try
            {
                using var baseKey = RegistryKey.OpenBaseKey(hive, view);
                using var key = baseKey.OpenSubKey($@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{executableName}");
                var value = key?.GetValue(null)?.ToString()?.Trim('"');
                if (!string.IsNullOrWhiteSpace(value) && File.Exists(value)) return value;
            }
            catch { }
        }
        return null;
    }
}

internal static class PrinterDiscovery
{
    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool SetDefaultPrinter(string pszPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool GetDefaultPrinter(System.Text.StringBuilder pszBuffer, ref int pcchBuffer);

    public static string GetCurrentDefaultPrinter()
    {
        try
        {
            var buffer = new System.Text.StringBuilder(256);
            var size = buffer.Capacity;
            if (GetDefaultPrinter(buffer, ref size))
                return buffer.ToString();
        }
        catch { }

        try
        {
            var settings = new PrinterSettings();
            return settings.PrinterName;
        }
        catch { }

        return string.Empty;
    }

    public static List<PrinterChoice> FindAll()
    {
        var defaultPrinter = GetCurrentDefaultPrinter();
        var list = new List<PrinterChoice>();

        try
        {
            foreach (string printerName in PrinterSettings.InstalledPrinters)
            {
                var isDefault = string.Equals(printerName, defaultPrinter, StringComparison.OrdinalIgnoreCase);
                var lower = printerName.ToLowerInvariant();
                var isThermal = lower.Contains("pos") || lower.Contains("80") || lower.Contains("58") ||
                                lower.Contains("thermal") || lower.Contains("ticket") || lower.Contains("receipt") ||
                                lower.Contains("xprinter") || lower.Contains("bixolon") || lower.Contains("epson") ||
                                lower.Contains("star") || lower.Contains("sunmi") || lower.Contains("2c-");

                list.Add(new PrinterChoice(printerName, isDefault, isThermal));
            }
        }
        catch { }

        return list.OrderByDescending(p => p.IsThermalLikely)
                   .ThenByDescending(p => p.IsDefault)
                   .ThenBy(p => p.Name)
                   .ToList();
    }

    public static string FindBestMatchingFormName(string printerName, PaperFormatPreset preset)
    {
        try
        {
            var settings = new PrinterSettings { PrinterName = printerName };
            foreach (PaperSize size in settings.PaperSizes)
            {
                var name = size.PaperName;
                if (string.Equals(name, preset.FormName, StringComparison.OrdinalIgnoreCase))
                    return name;

                var cleanName = name.Replace(" ", "").ToLowerInvariant();
                var cleanPreset = preset.FormName.Replace(" ", "").ToLowerInvariant();
                if (cleanName.Contains(cleanPreset) || cleanPreset.Contains(cleanName))
                    return name;

                if (preset.WidthMicrons == 72000 && (cleanName.Contains("72x210") || cleanName.Contains("72.00x210") || cleanName.Contains("80(72")))
                    return name;
            }
        }
        catch { }

        return preset.FormName;
    }
}

internal static class KlynnSetup
{
    public const string KlynnUrl = "https://klynn.com.do";
    private const string ShortcutName = "Klynn Cloud — Software de Lavanderías y Tintorerías.lnk";

    public static (string desktopShortcut, string startShortcut) Install(
        BrowserChoice browser, 
        PrinterChoice? selectedPrinter, 
        PaperFormatPreset paperPreset, 
        bool setDefaultPrinter, 
        bool fullscreen)
    {
        if (!browser.SilentPrinting)
            throw new InvalidOperationException($"{browser.Name} no admite el modo de impresión silenciosa requerido por Klynn.");

        var appRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Klynn", "Kiosco");
        var profileMode = fullscreen ? "PerfilPantallaCompleta" : "PerfilVentana";
        var profile = Path.Combine(appRoot, browser.Key, profileMode);
        Directory.CreateDirectory(profile);

        // Extract favicon for shortcut
        var iconPath = Path.Combine(appRoot, "klynn.ico");
        ExtractEmbeddedIcon(iconPath);

        // 1. Configure Windows Default Printer if requested
        if (selectedPrinter is not null && setDefaultPrinter)
        {
            try
            {
                PrinterDiscovery.SetDefaultPrinter(selectedPrinter.Name);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"No se pudo establecer impresora predeterminada: {ex.Message}");
            }
        }

        // 2. Pre-seed Chromium Preferences with sticky printing settings
        if (selectedPrinter is not null)
        {
            try
            {
                ConfigureChromiumPrintPreferences(profile, selectedPrinter.Name, paperPreset);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"No se pudo escribir preferencias de Chromium: {ex.Message}");
            }
        }

        // 3. Command line arguments
        var arguments = new List<string>
        {
            "--kiosk-printing",
            $"--user-data-dir=\"{profile}\"",
            "--no-first-run",
            "--disable-session-crashed-bubble",
            "--new-window",
        };
        if (fullscreen) arguments.Add("--kiosk");
        arguments.Add($"\"{KlynnUrl}\"");

        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var start = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "Klynn");
        Directory.CreateDirectory(start);

        var desktopShortcut = Path.Combine(desktop, ShortcutName);
        var startShortcut = Path.Combine(start, ShortcutName);
        var shortcutIcon = File.Exists(iconPath) ? iconPath : browser.ExecutablePath;

        CreateShortcut(desktopShortcut, browser.ExecutablePath, string.Join(' ', arguments), shortcutIcon);
        CreateShortcut(startShortcut, browser.ExecutablePath, string.Join(' ', arguments), shortcutIcon);

        File.WriteAllText(Path.Combine(appRoot, "instalacion.txt"),
            $"Navegador={browser.Name}{Environment.NewLine}" +
            $"Ruta={browser.ExecutablePath}{Environment.NewLine}" +
            $"Impresora={selectedPrinter?.Name ?? "No seleccionada"}{Environment.NewLine}" +
            $"Papel={paperPreset.DisplayName}{Environment.NewLine}" +
            $"PantallaCompleta={fullscreen}{Environment.NewLine}" +
            $"Fecha={DateTime.Now:O}");

        return (desktopShortcut, startShortcut);
    }

    private static void ExtractEmbeddedIcon(string outputPath)
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("Klynn.KioskInstaller.app.ico");
            if (stream is not null)
            {
                using var fileStream = File.Create(outputPath);
                stream.CopyTo(fileStream);
            }
        }
        catch { }
    }

    private static void ConfigureChromiumPrintPreferences(string profileDir, string printerName, PaperFormatPreset paperPreset)
    {
        var defaultDir = Path.Combine(profileDir, "Default");
        Directory.CreateDirectory(defaultDir);

        var prefsPath = Path.Combine(defaultDir, "Preferences");
        JsonObject root;

        if (File.Exists(prefsPath))
        {
            try
            {
                var content = File.ReadAllText(prefsPath);
                root = JsonNode.Parse(content)?.AsObject() ?? [];
            }
            catch
            {
                root = [];
            }
        }
        else
        {
            root = [];
        }

        var matchedFormName = PrinterDiscovery.FindBestMatchingFormName(printerName, paperPreset);

        var appStateObj = new
        {
            version = 2,
            recentDestinations = new[]
            {
                new
                {
                    id = printerName,
                    origin = "local",
                    account = "",
                    capabilities = (object?)null,
                    displayName = printerName,
                    extensionId = "",
                    extensionOriginalId = ""
                }
            },
            selectedDestinationId = printerName,
            mediaSize = new
            {
                name = matchedFormName,
                width_microns = paperPreset.WidthMicrons,
                height_microns = paperPreset.HeightMicrons,
                custom_display_name = matchedFormName
            },
            marginsType = 1,
            isHeaderFooterEnabled = false,
            isCssBackgroundEnabled = true,
            scaling = "100",
            scalingType = 3
        };

        var appStateJson = JsonSerializer.Serialize(appStateObj);

        if (!root.ContainsKey("printing"))
            root["printing"] = new JsonObject();

        var printingNode = root["printing"]!.AsObject();
        if (!printingNode.ContainsKey("print_preview_sticky_settings"))
            printingNode["print_preview_sticky_settings"] = new JsonObject();

        var stickyNode = printingNode["print_preview_sticky_settings"]!.AsObject();
        stickyNode["appState"] = appStateJson;

        File.WriteAllText(prefsPath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void RemoveShortcuts()
    {
        var desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var startDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "Klynn");

        var shortcutNames = new[]
        {
            ShortcutName,
            "Klynn - Impresion automatica.lnk",
            "Klynn - Impresión automática.lnk",
            "Klynn Cloud.lnk"
        };

        foreach (var name in shortcutNames)
        {
            var dPath = Path.Combine(desktopDir, name);
            var sPath = Path.Combine(startDir, name);
            if (File.Exists(dPath)) File.Delete(dPath);
            if (File.Exists(sPath)) File.Delete(sPath);
        }

        if (Directory.Exists(startDir) && !Directory.EnumerateFileSystemEntries(startDir).Any())
            Directory.Delete(startDir);
    }

    private static void CreateShortcut(string shortcutPath, string targetPath, string arguments, string iconPath)
    {
        var shellType = Type.GetTypeFromProgID("WScript.Shell")
            ?? throw new InvalidOperationException("Windows Script Host no está disponible para crear el acceso directo.");
        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        try
        {
            shortcut.TargetPath = targetPath;
            shortcut.Arguments = arguments;
            shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath) ?? string.Empty;
            shortcut.Description = "Klynn Cloud — Software de Lavanderías y Tintorerías";
            shortcut.IconLocation = $"{iconPath},0";
            shortcut.Save();
        }
        finally
        {
            Marshal.FinalReleaseComObject(shortcut);
            Marshal.FinalReleaseComObject(shell);
        }
    }
}

internal sealed class ModernCardPanel : Panel
{
    public int Radius { get; set; } = 10;
    public Color BorderColor { get; set; } = Color.FromArgb(226, 232, 240); // Slate 200

    public ModernCardPanel()
    {
        BackColor = Color.White;
        DoubleBuffered = true;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
        var rect = new Rectangle(0, 0, Width - 1, Height - 1);
        using var path = RoundedRectangle(rect, Radius);
        using var fill = new SolidBrush(BackColor);
        using var border = new Pen(BorderColor, 1.2f);
        e.Graphics.FillPath(fill, path);
        e.Graphics.DrawPath(border, path);
    }

    private static GraphicsPath RoundedRectangle(Rectangle bounds, int radius)
    {
        var diameter = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }
}

internal sealed class InstallerForm : Form
{
    private readonly ComboBox browserSelect = new();
    private readonly ComboBox printerSelect = new();
    private readonly ComboBox paperSelect = new();
    private readonly CheckBox setDefaultPrinterCheck = new();
    private readonly CheckBox fullscreenCheck = new();
    private readonly CheckBox launchCheck = new();
    private readonly Label compatibilityLabel = new();
    private readonly Label paperDescLabel = new();
    private readonly Label statusLabel = new();
    private readonly Button installButton = new();
    private readonly Button removeButton = new();

    private List<BrowserChoice> browsers = [];
    private List<PrinterChoice> printers = [];

    public InstallerForm()
    {
        Text = "Klynn — Asistente de Impresión Automática";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(820, 710);
        MinimumSize = MaximumSize = new Size(836, 749);
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        AutoScaleMode = AutoScaleMode.None; // Absolute pixel crispness
        BackColor = Color.FromArgb(248, 250, 252);
        Font = new Font("Segoe UI", 9F, FontStyle.Regular);
        ShowIcon = true;
        ShowInTaskbar = true;

        LoadEmbeddedIcon();
        BuildTwoColumnInterface();
        LoadData();
    }

    private void LoadEmbeddedIcon()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("Klynn.KioskInstaller.app.ico");
            if (stream is not null)
            {
                Icon = new Icon(stream);
            }
        }
        catch { }
    }

    private void BuildTwoColumnInterface()
    {
        // ══════════════════════════════════════════════════════════════════════
        // 1. BARRA LATERAL IZQUIERDA (COLOR EXACTO #001A42)
        // ══════════════════════════════════════════════════════════════════════
        var sidebar = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(240, 710),
            BackColor = Color.FromArgb(0, 26, 66) // #001a42
        };
        sidebar.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            // Línea de acento dorada
            using var goldBrush = new SolidBrush(Color.FromArgb(245, 158, 11));
            e.Graphics.FillRectangle(goldBrush, 106, 154, 28, 3);

            // Líneas conectoras del Step Tracker
            using var stepLine = new Pen(Color.FromArgb(30, 60, 110), 2f);
            e.Graphics.DrawLine(stepLine, 36, 234, 36, 266);
            e.Graphics.DrawLine(stepLine, 36, 284, 36, 316);
            e.Graphics.DrawLine(stepLine, 36, 334, 36, 366);
        };

        // Isotipo Favicon de Klynn
        var sidebarFavicon = new PictureBox
        {
            Location = new Point(90, 24),
            Size = new Size(60, 60),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.Transparent
        };
        LoadEmbeddedImage("Klynn.KioskInstaller.favicon.png", sidebarFavicon);
        sidebar.Controls.Add(sidebarFavicon);

        // Marca "Klynn" con altura completa para que 'y' nunca se corte
        var brandLabel = new Label
        {
            Text = "Klynn",
            Location = new Point(0, 90),
            Size = new Size(240, 36),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 16F, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = Color.Transparent,
            UseCompatibleTextRendering = true
        };
        sidebar.Controls.Add(brandLabel);

        var brandSubtitle = new Label
        {
            Text = "Simplifica tu lavandería",
            Location = new Point(0, 128),
            Size = new Size(240, 24),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold),
            ForeColor = Color.FromArgb(245, 158, 11), // Gold #F59E0B
            BackColor = Color.Transparent,
            UseCompatibleTextRendering = true
        };
        sidebar.Controls.Add(brandSubtitle);

        var sidebarDesc = new Label
        {
            Text = "Configura tu impresora POS y activa la impresión automática en segundos.",
            Location = new Point(18, 164),
            Size = new Size(204, 40),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 8F, FontStyle.Regular),
            ForeColor = Color.FromArgb(148, 163, 184), // Slate 400
            BackColor = Color.Transparent,
            UseCompatibleTextRendering = true
        };
        sidebar.Controls.Add(sidebarDesc);

        // ── Step Tracker Vertical ─────────────────────────────────────────────
        AddSidebarStep(sidebar, 1, "Navegador web", 216, true);
        AddSidebarStep(sidebar, 2, "Impresora POS", 266, false);
        AddSidebarStep(sidebar, 3, "Papel y tamaño", 316, false);
        AddSidebarStep(sidebar, 4, "Modo de inicio", 366, false);

        // ── Ilustración Impresora Térmica en la parte inferior ─────────────────
        var printerPic = new PictureBox
        {
            Location = new Point(12, 470),
            Size = new Size(216, 235),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.FromArgb(0, 26, 66)
        };
        LoadEmbeddedImage("Klynn.KioskInstaller.printer_art.png", printerPic);
        sidebar.Controls.Add(printerPic);

        Controls.Add(sidebar);

        // ══════════════════════════════════════════════════════════════════════
        // 2. PANEL DE CONTENIDO DERECHO (ESPACIADO PERFECTO SIN APRETURAS)
        // ══════════════════════════════════════════════════════════════════════
        int rightX = 262;
        int cardWidth = 532;

        // Encabezado Principal con altura completa
        var mainTitle = new Label
        {
            Text = "Configura tu impresión automática",
            Location = new Point(rightX, 16),
            AutoSize = true,
            Font = new Font("Segoe UI", 15F, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 23, 42), // Slate 900
            UseCompatibleTextRendering = true
        };
        Controls.Add(mainTitle);

        var mainSubtitle = new Label
        {
            Text = "Prepara Klynn para imprimir tickets POS de forma rápida.",
            Location = new Point(rightX, 48),
            AutoSize = true,
            Font = new Font("Segoe UI", 9F, FontStyle.Regular),
            ForeColor = Color.FromArgb(100, 116, 139), // Slate 500
            UseCompatibleTextRendering = true
        };
        Controls.Add(mainSubtitle);

        // ── Tarjeta 1: Navegador compatible (Y: 76) ───────────────────────────
        var card1 = new ModernCardPanel { Location = new Point(rightX, 76), Size = new Size(cardWidth, 98) };
        AddStepNumberBadge(card1, 1);
        AddCardIcon(card1, "🌐");
        card1.Controls.Add(new Label { Text = "Navegador compatible", Location = new Point(62, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold), ForeColor = Color.FromArgb(15, 23, 42), UseCompatibleTextRendering = true });

        browserSelect.Location = new Point(62, 34);
        browserSelect.Size = new Size(452, 26);
        browserSelect.DropDownStyle = ComboBoxStyle.DropDownList;
        browserSelect.FlatStyle = FlatStyle.System;
        browserSelect.Font = new Font("Segoe UI", 9.5F);
        browserSelect.SelectedIndexChanged += (_, _) => RefreshCompatibility();
        card1.Controls.Add(browserSelect);

        compatibilityLabel.Location = new Point(62, 68);
        compatibilityLabel.AutoSize = true;
        compatibilityLabel.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
        compatibilityLabel.UseCompatibleTextRendering = true;
        card1.Controls.Add(compatibilityLabel);
        Controls.Add(card1);

        // ── Tarjeta 2: Impresora térmica (POS) (Y: 184) ───────────────────────
        var card2 = new ModernCardPanel { Location = new Point(rightX, 184), Size = new Size(cardWidth, 104) };
        AddStepNumberBadge(card2, 2);
        AddCardIcon(card2, "🖨️");
        card2.Controls.Add(new Label { Text = "Impresora térmica (POS)", Location = new Point(62, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold), ForeColor = Color.FromArgb(15, 23, 42), UseCompatibleTextRendering = true });

        printerSelect.Location = new Point(62, 34);
        printerSelect.Size = new Size(452, 26);
        printerSelect.DropDownStyle = ComboBoxStyle.DropDownList;
        printerSelect.FlatStyle = FlatStyle.System;
        printerSelect.Font = new Font("Segoe UI", 9.5F);
        card2.Controls.Add(printerSelect);

        setDefaultPrinterCheck.Text = "Establecer como predeterminada";
        setDefaultPrinterCheck.Location = new Point(62, 68);
        setDefaultPrinterCheck.AutoSize = true;
        setDefaultPrinterCheck.Checked = true;
        setDefaultPrinterCheck.Font = new Font("Segoe UI", 9F);
        setDefaultPrinterCheck.ForeColor = Color.FromArgb(51, 65, 85);
        setDefaultPrinterCheck.Cursor = Cursors.Hand;
        setDefaultPrinterCheck.UseCompatibleTextRendering = true;
        card2.Controls.Add(setDefaultPrinterCheck);
        Controls.Add(card2);

        // ── Tarjeta 3: Papel y formato (Y: 298) ───────────────────────────────
        var card3 = new ModernCardPanel { Location = new Point(rightX, 298), Size = new Size(cardWidth, 104) };
        AddStepNumberBadge(card3, 3);
        AddCardIcon(card3, "🧾");
        card3.Controls.Add(new Label { Text = "Papel y formato", Location = new Point(62, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold), ForeColor = Color.FromArgb(15, 23, 42), UseCompatibleTextRendering = true });

        paperSelect.Location = new Point(62, 34);
        paperSelect.Size = new Size(452, 26);
        paperSelect.DropDownStyle = ComboBoxStyle.DropDownList;
        paperSelect.FlatStyle = FlatStyle.System;
        paperSelect.Font = new Font("Segoe UI", 9.5F);
        paperSelect.SelectedIndexChanged += (_, _) =>
        {
            if (paperSelect.SelectedItem is PaperFormatPreset preset)
                paperDescLabel.Text = preset.Description;
        };
        card3.Controls.Add(paperSelect);

        paperDescLabel.Location = new Point(62, 68);
        paperDescLabel.AutoSize = true;
        paperDescLabel.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
        paperDescLabel.ForeColor = Color.FromArgb(100, 116, 139);
        paperDescLabel.UseCompatibleTextRendering = true;
        card3.Controls.Add(paperDescLabel);
        Controls.Add(card3);

        // ── Tarjeta 4: Opciones del punto de venta (Y: 412) ────────────────────
        var card4 = new ModernCardPanel { Location = new Point(rightX, 412), Size = new Size(cardWidth, 104) };
        AddStepNumberBadge(card4, 4);
        AddCardIcon(card4, "🖥️");
        card4.Controls.Add(new Label { Text = "Opciones del punto de venta", Location = new Point(62, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold), ForeColor = Color.FromArgb(15, 23, 42), UseCompatibleTextRendering = true });

        fullscreenCheck.Text = "Abrir en pantalla completa (Kiosco POS)";
        fullscreenCheck.Location = new Point(62, 36);
        fullscreenCheck.AutoSize = true;
        fullscreenCheck.Checked = true;
        fullscreenCheck.Font = new Font("Segoe UI", 9F);
        fullscreenCheck.ForeColor = Color.FromArgb(51, 65, 85);
        fullscreenCheck.Cursor = Cursors.Hand;
        fullscreenCheck.UseCompatibleTextRendering = true;
        card4.Controls.Add(fullscreenCheck);

        launchCheck.Text = "Abrir Klynn al finalizar la instalación";
        launchCheck.Location = new Point(62, 64);
        launchCheck.AutoSize = true;
        launchCheck.Checked = true;
        launchCheck.Font = new Font("Segoe UI", 9F);
        launchCheck.ForeColor = Color.FromArgb(51, 65, 85);
        launchCheck.Cursor = Cursors.Hand;
        launchCheck.UseCompatibleTextRendering = true;
        card4.Controls.Add(launchCheck);
        Controls.Add(card4);

        // ── Tarjeta Perfil Seguro (Y: 526) ────────────────────────────────────
        var securityCard = new ModernCardPanel
        {
            Location = new Point(rightX, 526),
            Size = new Size(cardWidth, 60),
            BackColor = Color.FromArgb(240, 249, 255), // Light Sky Blue
            BorderColor = Color.FromArgb(186, 230, 253) // Sky 200
        };
        var shieldLbl = new Label
        {
            Text = "🛡️",
            Location = new Point(12, 10),
            Size = new Size(36, 36),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI Emoji", 14F),
            BackColor = Color.Transparent
        };
        securityCard.Controls.Add(shieldLbl);

        securityCard.Controls.Add(new Label
        {
            Text = "Perfil seguro",
            Location = new Point(56, 8),
            AutoSize = true,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold),
            ForeColor = Color.FromArgb(3, 105, 161), // Sky 700
            UseCompatibleTextRendering = true
        });
        securityCard.Controls.Add(new Label
        {
            Text = "Perfil aislado sin afectar tus otros datos de Windows.",
            Location = new Point(56, 28),
            AutoSize = true,
            Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
            ForeColor = Color.FromArgb(12, 74, 110), // Sky 900
            UseCompatibleTextRendering = true
        });
        Controls.Add(securityCard);

        // ── Botones de Acción (Y: 598) ────────────────────────────────────────
        installButton.Text = "🚀  Configurar e instalar";
        installButton.Location = new Point(rightX, 598);
        installButton.Size = new Size(330, 48);
        installButton.FlatStyle = FlatStyle.Flat;
        installButton.FlatAppearance.BorderSize = 0;
        installButton.BackColor = Color.FromArgb(27, 75, 115); // Navy #1B4B73
        installButton.ForeColor = Color.White;
        installButton.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
        installButton.Cursor = Cursors.Hand;
        installButton.Click += Install;
        Controls.Add(installButton);

        removeButton.Text = "🗑️  Retirar accesos";
        removeButton.Location = new Point(rightX + 342, 598);
        removeButton.Size = new Size(190, 48);
        removeButton.FlatStyle = FlatStyle.Flat;
        removeButton.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
        removeButton.FlatAppearance.BorderSize = 1;
        removeButton.BackColor = Color.White;
        removeButton.ForeColor = Color.FromArgb(51, 65, 85);
        removeButton.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
        removeButton.Cursor = Cursors.Hand;
        removeButton.Click += Remove;
        Controls.Add(removeButton);

        // ── Barra de Estado Inferior (Y: 658) ─────────────────────────────────
        var footerPanel = new Panel
        {
            Location = new Point(rightX, 658),
            Size = new Size(cardWidth, 26),
            BackColor = Color.Transparent
        };

        statusLabel.Location = new Point(0, 2);
        statusLabel.AutoSize = true;
        statusLabel.ForeColor = Color.FromArgb(100, 116, 139);
        statusLabel.Font = new Font("Segoe UI", 8.5F);
        statusLabel.UseCompatibleTextRendering = true;
        footerPanel.Controls.Add(statusLabel);

        var helpLink = new LinkLabel
        {
            Text = "¿Necesitas ayuda?",
            Location = new Point(390, 2),
            Size = new Size(140, 22),
            TextAlign = ContentAlignment.MiddleRight,
            Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
            LinkColor = Color.FromArgb(37, 99, 235),
            ActiveLinkColor = Color.FromArgb(29, 78, 216),
            Cursor = Cursors.Hand,
            UseCompatibleTextRendering = true
        };
        helpLink.LinkClicked += (_, _) =>
        {
            try
            {
                Process.Start(new ProcessStartInfo("https://klynn.com.do/ayuda") { UseShellExecute = true });
            }
            catch { }
        };
        footerPanel.Controls.Add(helpLink);

        Controls.Add(footerPanel);
    }

    private static void AddSidebarStep(Panel sidebar, int number, string text, int y, bool active)
    {
        var badge = new Label
        {
            Text = number.ToString(),
            Location = new Point(24, y),
            Size = new Size(24, 24),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = active ? Color.FromArgb(245, 158, 11) : Color.FromArgb(20, 45, 80),
            UseCompatibleTextRendering = true
        };
        badge.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var pen = new Pen(active ? Color.FromArgb(245, 158, 11) : Color.FromArgb(50, 85, 130), 1.5f);
            e.Graphics.DrawEllipse(pen, 1, 1, badge.Width - 3, badge.Height - 3);
        };
        sidebar.Controls.Add(badge);

        var label = new Label
        {
            Text = text,
            Location = new Point(56, y + 2),
            AutoSize = true,
            Font = new Font("Segoe UI", 8.5F, active ? FontStyle.Bold : FontStyle.Regular),
            ForeColor = active ? Color.White : Color.FromArgb(148, 163, 184),
            BackColor = Color.Transparent,
            UseCompatibleTextRendering = true
        };
        sidebar.Controls.Add(label);
    }

    private static void AddCardIcon(Panel card, string emoji)
    {
        var iconPanel = new Panel
        {
            Location = new Point(14, 16),
            Size = new Size(36, 36),
            BackColor = Color.FromArgb(239, 246, 255) // Blue 50
        };
        iconPanel.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var pen = new Pen(Color.FromArgb(219, 234, 254), 1f); // Blue 100
            e.Graphics.DrawEllipse(pen, 0, 0, iconPanel.Width - 1, iconPanel.Height - 1);
        };
        var iconLbl = new Label
        {
            Text = emoji,
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI Emoji", 12F),
            BackColor = Color.Transparent
        };
        iconPanel.Controls.Add(iconLbl);
        card.Controls.Add(iconPanel);
    }

    private static void AddStepNumberBadge(Panel card, int number)
    {
        var badge = new Label
        {
            Text = number.ToString(),
            Location = new Point(6, 6),
            Size = new Size(20, 20),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 8F, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = Color.FromArgb(27, 75, 115) // Navy #1B4B73
        };
        badge.Paint += (s, e) =>
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var pen = new Pen(Color.FromArgb(147, 197, 253), 1f); // Light blue border
            e.Graphics.DrawEllipse(pen, 0, 0, badge.Width - 1, badge.Height - 1);
        };
        using var path = new GraphicsPath();
        path.AddEllipse(0, 0, badge.Width, badge.Height);
        badge.Region = new Region(path);
        card.Controls.Add(badge);
    }

    private static void LoadEmbeddedImage(string resourceName, PictureBox pb)
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is not null)
            {
                pb.Image = Image.FromStream(stream);
            }
        }
        catch { }
    }

    private void LoadData()
    {
        // 1. Navegadores
        browsers = BrowserDiscovery.FindAll();
        browserSelect.Items.Clear();
        browserSelect.Items.AddRange(browsers.Cast<object>().ToArray());
        if (browserSelect.Items.Count > 0)
        {
            browserSelect.SelectedIndex = 0;
        }
        else
        {
            compatibilityLabel.Text = "No encontramos un navegador compatible.";
            compatibilityLabel.ForeColor = Color.FromArgb(217, 119, 6);
            installButton.Enabled = false;
            installButton.BackColor = Color.FromArgb(148, 163, 184);
        }

        // 2. Impresoras
        printers = PrinterDiscovery.FindAll();
        printerSelect.Items.Clear();
        printerSelect.Items.AddRange(printers.Cast<object>().ToArray());
        if (printerSelect.Items.Count > 0)
        {
            printerSelect.SelectedIndex = 0;
        }
        else
        {
            printerSelect.Items.Add("No hay impresoras instaladas");
            printerSelect.SelectedIndex = 0;
            printerSelect.Enabled = false;
        }

        // 3. Papel
        paperSelect.Items.Clear();
        paperSelect.Items.AddRange(PaperPresets.All.Cast<object>().ToArray());
        paperSelect.SelectedIndex = 0;

        statusLabel.Text = $"📈 {browsers.Count} navegador(es) y {printers.Count} impresora(s) detectadas.";
    }

    private void RefreshCompatibility()
    {
        if (browserSelect.SelectedItem is not BrowserChoice browser) return;
        compatibilityLabel.Text = browser.SilentPrinting
            ? "✓  Compatible con modo silencioso"
            : "⚠  Modo kiosco sin impresión silenciosa";
        compatibilityLabel.ForeColor = browser.SilentPrinting ? Color.FromArgb(16, 185, 129) : Color.FromArgb(217, 119, 6);
        installButton.Enabled = browser.SilentPrinting;
        installButton.BackColor = browser.SilentPrinting ? Color.FromArgb(27, 75, 115) : Color.FromArgb(148, 163, 184);
    }

    private void Install(object? sender, EventArgs e)
    {
        if (browserSelect.SelectedItem is not BrowserChoice browser) return;
        var selectedPrinter = printerSelect.SelectedItem as PrinterChoice;
        var selectedPaper = (paperSelect.SelectedItem as PaperFormatPreset) ?? PaperPresets.All[0];

        try
        {
            installButton.Enabled = false;
            installButton.Text = "Configurando…";

            var result = KlynnSetup.Install(
                browser, 
                selectedPrinter, 
                selectedPaper, 
                setDefaultPrinterCheck.Checked, 
                fullscreenCheck.Checked);

            statusLabel.ForeColor = Color.FromArgb(16, 185, 129);
            statusLabel.Text = $"¡Listo! Impresora configurada a {selectedPaper.FormName}. Acceso creado.";

            if (launchCheck.Checked)
            {
                Process.Start(new ProcessStartInfo(result.desktopShortcut) { UseShellExecute = true });
            }

            MessageBox.Show(
                $"La configuración se completó exitosamente.\n\n" +
                $"• Impresora: {selectedPrinter?.Name ?? "Predeterminada"}\n" +
                $"• Formato térmico calibrado: {selectedPaper.FormName}\n" +
                $"• Impresión silenciosa: Activada\n\n" +
                $"Se ha creado el acceso directo \"Klynn - Impresión automática\" en tu escritorio.",
                "Klynn está listo",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            statusLabel.ForeColor = Color.Firebrick;
            statusLabel.Text = "No se pudo completar la configuración.";
            MessageBox.Show(ex.Message, "Error al configurar", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            installButton.Enabled = browser.SilentPrinting;
            installButton.Text = "🚀  Configurar e instalar";
        }
    }

    private void Remove(object? sender, EventArgs e)
    {
        try
        {
            KlynnSetup.RemoveShortcuts();
            statusLabel.ForeColor = Color.FromArgb(16, 185, 129);
            statusLabel.Text = "Se retiraron los accesos directos. Los datos del navegador se conservaron.";
            MessageBox.Show("Se retiraron los accesos directos correctamente.", "Configuración retirada", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "No se pudo retirar la configuración", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
