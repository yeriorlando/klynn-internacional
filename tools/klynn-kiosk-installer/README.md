# Klynn — instalador de impresión automática

Asistente para Windows que detecta navegadores instalados y crea un acceso directo de Klynn con impresión kiosco.

## Compatibilidad

- Google Chrome, Microsoft Edge, Brave y Chromium: compatibles.
- Vivaldi, Opera y Firefox: se detectan e informan, pero se bloquea la instalación porque no ofrecen una garantía estable de `--kiosk-printing`.

El asistente utiliza un perfil aislado bajo `%LOCALAPPDATA%\Klynn\Kiosco`, crea accesos directos en el escritorio y menú Inicio, y no requiere permisos administrativos.

## Compilar

```powershell
dotnet publish .\tools\klynn-kiosk-installer\KlynnKioskInstaller.csproj -c Release -r win-x64 --self-contained true -o .\public\downloads\klynn-kiosk-build
```

El archivo distribuible es `Klynn-Kiosco-Setup.exe`.
