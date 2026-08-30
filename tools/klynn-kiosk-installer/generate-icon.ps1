Add-Type -AssemblyName System.Drawing

$pngPath = "c:\Users\Yeri Orlando\Desktop\Klynn SaaS\Klynn Cloud\Klynn\tools\klynn-kiosk-installer\favicon_source.png"
$icoPath = "c:\Users\Yeri Orlando\Desktop\Klynn SaaS\Klynn Cloud\Klynn\tools\klynn-kiosk-installer\app.ico"

$img = [System.Drawing.Image]::FromFile($pngPath)
$s = 256
$bmp = New-Object System.Drawing.Bitmap $s, $s
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($img, 0, 0, $s, $s)
$g.Dispose()

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Dispose()
$icon.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Standard Win32 ICO created from favicon at: $icoPath"
