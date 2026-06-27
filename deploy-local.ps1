# ============================================================
# GlucoseTracker — Local Network Deploy (Windows PowerShell)
# ============================================================
# Construieste aplicatia si o expune pe reteaua locala WiFi.
# Tableta/telefonul trebuie sa fie pe acelasi WiFi.
# ============================================================

param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'

# 1. Generate icons + build
Write-Host "`n[1/3] Generare iconuri PWA..." -ForegroundColor Cyan
node scripts/generate-icons.mjs

Write-Host "[2/3] Build productie..." -ForegroundColor Cyan
npm run build

# 2. Find local IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.PrefixOrigin -in 'Dhcp','Manual' } |
       Select-Object -First 1).IPAddress

if (-not $ip) { $ip = "127.0.0.1" }

# 3. Start preview server
Write-Host "`n[3/3] Pornire server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  GlucoseTracker rulează!               ║" -ForegroundColor Green
Write-Host "  ║                                       ║" -ForegroundColor Green
Write-Host "  ║  Local:   http://localhost:$Port         ║" -ForegroundColor Green
Write-Host "  ║  Tableta: http://${ip}:$Port      ║" -ForegroundColor Green
Write-Host "  ║                                       ║" -ForegroundColor Green
Write-Host "  ║  Pe tableta/telefon:                  ║" -ForegroundColor Green
Write-Host "  ║  1. Deschide URL-ul de mai sus        ║" -ForegroundColor Green
Write-Host "  ║  2. Browser menu > 'Adauga la ecran   ║" -ForegroundColor Green
Write-Host "  ║     principal' / 'Install app'        ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  ATENTIE: Tableta si PC-ul trebuie sa fie" -ForegroundColor Yellow
Write-Host "  pe ACELASI retea WiFi." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Opreste cu: Ctrl+C" -ForegroundColor Gray
Write-Host ""

# Start vite preview on all interfaces
npx vite preview --host 0.0.0.0 --port $Port
