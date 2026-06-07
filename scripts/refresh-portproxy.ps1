# SamFin — odswiezanie regul portproxy po restarcie WSL2
# Uruchom jako administrator: Right-click → "Run with PowerShell" (lub z terminala admin)
#
# Dlaczego potrzebny:
#   WSL2 korzysta z wirtualnego switcha Hyper-V. Przy kazdym restarcie WSL2
#   VM dostaje nowe IP (z puli 172.x.x.x). netsh portproxy ma wpisane stare IP,
#   wiec nalezy odswiezac reguly po kazdym "wsl --shutdown" / restarcie.
#
# Rozwiazanie trwale (bez skryptu):
#   Dodaj do %USERPROFILE%\.wslconfig:
#     [wsl2]
#     networkingMode=mirrored
#   Potem: wsl --shutdown, uruchom WSL ponownie.
#   Dziala tylko na Windows 11 22H2+ z WSL 2.0+.

$PORTS = @(3001, 5173)

# Pobierz aktualne IP WSL2
$WSL_IP = (wsl hostname -I).Split(" ")[0].Trim()

if (-not $WSL_IP) {
    Write-Error "Nie mozna uzyskac IP WSL2. Upewnij sie, ze WSL2 jest uruchomiony."
    exit 1
}

Write-Host "WSL2 IP: $WSL_IP" -ForegroundColor Cyan

foreach ($PORT in $PORTS) {
    # Usun stara regule jesli istnieje
    netsh interface portproxy delete v4tov4 listenport=$PORT listenaddress=0.0.0.0 2>$null | Out-Null

    # Dodaj nowa regule
    netsh interface portproxy add v4tov4 `
        listenport=$PORT `
        listenaddress=0.0.0.0 `
        connectport=$PORT `
        connectaddress=$WSL_IP

    # Regula firewalla (pomija jesli juz istnieje)
    $ruleName = "SamFin port $PORT"
    $existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
    if ($LASTEXITCODE -ne 0) {
        netsh advfirewall firewall add rule `
            name="$ruleName" `
            dir=in `
            action=allow `
            protocol=TCP `
            localport=$PORT | Out-Null
        Write-Host "Dodano regule firewalla: $ruleName" -ForegroundColor Green
    }

    Write-Host "Portproxy: 0.0.0.0:$PORT -> ${WSL_IP}:$PORT" -ForegroundColor Green
}

Write-Host ""
Write-Host "Aktualne reguly portproxy:" -ForegroundColor Yellow
netsh interface portproxy show all

Write-Host ""
$WIN_IP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" } |
    Where-Object { $_.IPAddress -notlike "172.*" } |
    Select-Object -First 1).IPAddress

if ($WIN_IP) {
    Write-Host "Aplikacja dostepna z sieci lokalnej:" -ForegroundColor Cyan
    Write-Host "  Dev (Vite HMR): http://${WIN_IP}:5173/app/" -ForegroundColor White
    Write-Host "  Prod (Apache):  http://${WIN_IP}:3001/app/" -ForegroundColor White
}
