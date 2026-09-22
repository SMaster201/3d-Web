<#
.SYNOPSIS
    Aegis Vision - System Check and Launch Script
.DESCRIPTION
    Checks all prerequisites (Conda, Python, pip, Ollama, GPU, dependencies),
    creates a Conda virtual environment if missing, installs dependencies, 
    and starts Backend + Frontend + Ollama.
    Press Ctrl+C to gracefully shut down all services.
#>

param(
    [switch]$SkipInstall,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5500
)

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Aegis Vision Launcher"

# -- Colors and Helpers -------------------------------------------------------
function Write-Status($icon, $label, $msg, $color) {
    Write-Host "  $icon " -NoNewline -ForegroundColor $color
    Write-Host "$label" -NoNewline -ForegroundColor White
    Write-Host " $msg" -ForegroundColor DarkGray
}
function Write-Pass($label, $msg)  { Write-Status "[OK]" $label $msg Green }
function Write-Fail($label, $msg)  { Write-Status "[XX]" $label $msg Red }
function Write-Warn($label, $msg)  { Write-Status "[!!]" $label $msg Yellow }
function Write-Info($label, $msg)  { Write-Status "[>>]" $label $msg Cyan }

function Write-Banner {
    Write-Host ""
    Write-Host "  =============================================="  -ForegroundColor DarkCyan
    Write-Host "        AEGIS VISION  -  LAUNCH SCRIPT          "  -ForegroundColor Cyan
    Write-Host "     System Check and Service Orchestrator       "  -ForegroundColor DarkCyan
    Write-Host "  =============================================="  -ForegroundColor DarkCyan
    Write-Host ""
}

# -- Kill an entire process tree recursively --
function Stop-ProcessTree($procId) {
    # Kill all child processes first
    Get-CimInstance Win32_Process -Filter "ParentProcessId = $procId" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-ProcessTree $_.ProcessId
    }
    # Then kill the target process
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

# -- Resolve project paths ----------------------------------------------------
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectRoot "backend"
$BackendFile = Join-Path $BackendDir "main.py"
$IndexFile   = Join-Path $ProjectRoot "index.html"
$PidFile     = Join-Path $ProjectRoot ".aegis-pids"

# ==============================================================================
#  PHASE 0 - CLEANUP PREVIOUS SESSION
# ==============================================================================

# Kill any leftover processes from a previous run
if (Test-Path $PidFile) {
    Write-Host "  Cleaning up previous session..." -ForegroundColor DarkGray
    Get-Content $PidFile | ForEach-Object {
        $oldPid = $_.Trim()
        if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
            Stop-ProcessTree $oldPid
            Write-Info "Killed" "Orphan process (PID: $oldPid)"
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# Also kill any python processes occupying our ports
foreach ($port in @($BackendPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $ownerPid = $c.OwningProcess
            $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -match "python|conda") {
                Stop-ProcessTree $ownerPid
                Write-Info "Killed" "Orphan $($proc.ProcessName) on port $port (PID: $ownerPid)"
            }
        }
    }
}

# ==============================================================================
#  PHASE 1 - SYSTEM PREREQUISITES & CONDA ENV
# ==============================================================================
Write-Banner
Write-Host "  [Phase 1] System Prerequisites & Environment" -ForegroundColor Yellow
Write-Host "  ----------------------------------------------" -ForegroundColor DarkGray

$allGood = $true

# -- Conda Virtual Environment Check & Setup --
$condaCmd = Get-Command conda -ErrorAction SilentlyContinue
$HasConda = $null -ne $condaCmd
$CondaEnvName = "aegis-env"

if ($HasConda) {
    Write-Pass "Conda" "$($condaCmd.Source)"
    
    $envs = & conda env list
    if ($envs -match "\b$CondaEnvName\b") {
        Write-Pass "Conda Env" "Environment '$CondaEnvName' already exists"
    } else {
        Write-Info "Conda Env" "Creating environment '$CondaEnvName' (Python 3.10)..."
        & conda create -y -n $CondaEnvName python=3.10 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "Conda Env" "Environment '$CondaEnvName' created successfully"
        } else {
            Write-Fail "Conda Env" "Failed to create environment"
            $allGood = $false
        }
    }
} else {
    Write-Warn "Conda" "Not found. Will use system Python."
}

# -- Wrapper Functions for Python and Pip --
function Invoke-Python {
    param([Parameter(ValueFromRemainingArguments=$true)]$ArgsList)
    if ($HasConda) {
        & conda run --no-capture-output -n $CondaEnvName python $ArgsList
    } else {
        & python $ArgsList
    }
}

function Invoke-Pip {
    param([Parameter(ValueFromRemainingArguments=$true)]$ArgsList)
    if ($HasConda) {
        & conda run --no-capture-output -n $CondaEnvName pip $ArgsList
    } else {
        & pip $ArgsList
    }
}

# -- Python --
try {
    $pyVer = Invoke-Python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Pass "Python" "$pyVer"
    } else {
        Write-Fail "Python" "Execution failed"
        $allGood = $false
    }
} catch {
    Write-Fail "Python" "Not found. Please install Python or Conda."
    $allGood = $false
}

# -- pip --
try {
    $pipVer = Invoke-Pip --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pipShort = ($pipVer -split " ")[1]
        Write-Pass "pip" "v$pipShort"
    } else {
        Write-Fail "pip" "Execution failed"
        $allGood = $false
    }
} catch {
    Write-Fail "pip" "Not found."
    $allGood = $false
}

# -- Ollama --
$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollamaCmd) {
    Write-Pass "Ollama" "$($ollamaCmd.Source)"
} else {
    Write-Warn "Ollama" "Not installed. AI Chat will be unavailable."
}

# -- GPU / CUDA --
$TorchIndexUrl = "https://download.pytorch.org/whl/cpu"
$nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($nvidiaSmi) {
    $TorchIndexUrl = "https://download.pytorch.org/whl/cu124"
    try {
        $gpuInfo = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>&1
        $gpuName = ($gpuInfo -split ",")[0].Trim()
        $gpuMem  = ($gpuInfo -split ",")[1].Trim()
        $gpuMsg = "${gpuName} (${gpuMem} MB VRAM)"
        Write-Pass "GPU" "$gpuMsg (CUDA 12.4)"
    } catch {
        Write-Pass "GPU" "NVIDIA GPU detected (CUDA 12.4)"
    }
} else {
    Write-Warn "GPU" "nvidia-smi not found. Will use CPU for inference."
}

# -- Backend file --
if (Test-Path $BackendFile) {
    Write-Pass "Backend" "main.py found"
} else {
    Write-Fail "Backend" "main.py not found at $BackendFile"
    $allGood = $false
}

# -- Frontend file --
if (Test-Path $IndexFile) {
    Write-Pass "Frontend" "index.html found"
} else {
    Write-Fail "Frontend" "index.html not found at $IndexFile"
    $allGood = $false
}

if (-not $allGood) {
    Write-Host ""
    Write-Host "  Critical prerequisites missing. Please fix the errors above." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

# ==============================================================================
#  PHASE 2 - DEPENDENCY CHECK AND INSTALL
# ==============================================================================
Write-Host ""
Write-Host "  [Phase 2] Python Dependencies" -ForegroundColor Yellow
Write-Host "  ----------------------------------------------" -ForegroundColor DarkGray

$requiredPackages = @(
    @{ Name = "torch";             Import = "torch" },
    @{ Name = "torchvision";       Import = "torchvision" },
    @{ Name = "fastapi";           Import = "fastapi" },
    @{ Name = "uvicorn[standard]"; Import = "uvicorn" },
    @{ Name = "opencv-python";     Import = "cv2" },
    @{ Name = "numpy";             Import = "numpy" },
    @{ Name = "psutil";            Import = "psutil" },
    @{ Name = "pydantic";          Import = "pydantic" },
    @{ Name = "ultralytics";       Import = "ultralytics" },
    @{ Name = "pynvml";            Import = "pynvml" }
)

$missingPackages = @()

foreach ($pkg in $requiredPackages) {
    Invoke-Python -c "import $($pkg.Import)" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Pass $pkg.Name "installed"
    } else {
        Write-Warn $pkg.Name "missing"
        $missingPackages += $pkg.Name
    }
}

if ($missingPackages.Count -gt 0 -and -not $SkipInstall) {
    Write-Host ""
    Write-Info "Installing" "$($missingPackages.Count) missing package(s)..."
    Write-Host ""

    foreach ($pkg in $missingPackages) {
        if ($pkg -match "torch") {
            Write-Host "    pip install $pkg --index-url $TorchIndexUrl" -ForegroundColor DarkGray
            Invoke-Pip install $pkg --index-url $TorchIndexUrl 2>&1 | Out-Null
        } else {
            Write-Host "    pip install $pkg" -ForegroundColor DarkGray
            Invoke-Pip install $pkg 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Pass $pkg "installed successfully"
        } else {
            Write-Fail $pkg "installation failed"
        }
    }
} elseif ($missingPackages.Count -gt 0 -and $SkipInstall) {
    Write-Warn "Skipped" "Use without -SkipInstall to auto-install missing packages"
}

# ==============================================================================
#  PHASE 3 - PORT CHECK
# ==============================================================================
Write-Host ""
Write-Host "  [Phase 3] Port Availability" -ForegroundColor Yellow
Write-Host "  ----------------------------------------------" -ForegroundColor DarkGray

function Test-PortFree($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -eq $conn -or $conn.Count -eq 0)
}

if (Test-PortFree $BackendPort) {
    Write-Pass "Port $BackendPort" "available (Backend)"
} else {
    Write-Warn "Port $BackendPort" "in use - backend may fail to start"
}

if (Test-PortFree $FrontendPort) {
    Write-Pass "Port $FrontendPort" "available (Frontend)"
} else {
    Write-Warn "Port $FrontendPort" "in use - trying alternate port"
    $FrontendPort = 5501
}

$ollamaPort = 11434
$ollamaRunning = $false
try {
    $null = Invoke-WebRequest -Uri "http://localhost:$ollamaPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $ollamaRunning = $true
    Write-Pass "Ollama API" "already running on port $ollamaPort"
} catch {
    Write-Info "Ollama API" "not running, will attempt to start"
}

# ==============================================================================
#  PHASE 4 - LAUNCH SERVICES
# ==============================================================================
Write-Host ""
Write-Host "  [Phase 4] Starting Services" -ForegroundColor Yellow
Write-Host "  ----------------------------------------------" -ForegroundColor DarkGray

$launchedPids = @()

# -- Start Ollama (if installed and not running) --
if ($ollamaCmd -and -not $ollamaRunning) {
    Write-Info "Ollama" "Starting Ollama serve..."
    $ollamaJob = Start-Process -FilePath "ollama" -ArgumentList "serve" -PassThru
    $launchedPids += $ollamaJob.Id
    Start-Sleep -Seconds 2

    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$ollamaPort" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Pass "Ollama" "Service started (PID: $($ollamaJob.Id))"
    } catch {
        Write-Warn "Ollama" "Started but may need a moment to initialize"
    }
}

# -- Start Backend (FastAPI + Uvicorn) --
Write-Info "Backend" "Starting FastAPI on port $BackendPort..."
if ($HasConda) {
    $backendArgs = @("run", "--no-capture-output", "-n", $CondaEnvName, "python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$BackendPort", "--reload")
    $backendJob = Start-Process -FilePath "conda" -ArgumentList $backendArgs -WorkingDirectory $BackendDir -PassThru
} else {
    $backendArgs = @("-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$BackendPort", "--reload")
    $backendJob = Start-Process -FilePath "python" -ArgumentList $backendArgs -WorkingDirectory $BackendDir -PassThru
}
$launchedPids += $backendJob.Id

Start-Sleep -Seconds 3
try {
    $null = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Pass "Backend" "Online at http://localhost:$BackendPort (PID: $($backendJob.Id))"
} catch {
    Write-Warn "Backend" "Started (PID: $($backendJob.Id)) - may need a moment to load YOLO model"
}

# -- Start Frontend (Python HTTP Server) --
Write-Info "Frontend" "Starting HTTP server on port $FrontendPort..."
if ($HasConda) {
    $frontendArgs = @("run", "--no-capture-output", "-n", $CondaEnvName, "python", "-m", "http.server", "$FrontendPort", "--bind", "127.0.0.1")
    $frontendJob = Start-Process -FilePath "conda" -ArgumentList $frontendArgs -WorkingDirectory $ProjectRoot -PassThru
} else {
    $frontendArgs = @("-m", "http.server", "$FrontendPort", "--bind", "127.0.0.1")
    $frontendJob = Start-Process -FilePath "python" -ArgumentList $frontendArgs -WorkingDirectory $ProjectRoot -PassThru
}
$launchedPids += $frontendJob.Id

Start-Sleep -Seconds 1
Write-Pass "Frontend" "Online at http://localhost:$FrontendPort (PID: $($frontendJob.Id))"

# -- Save PIDs to file for cleanup on next run --
$launchedPids | Out-File -FilePath $PidFile -Encoding ascii

# ==============================================================================
#  PHASE 5 - SUMMARY AND MONITOR
# ==============================================================================
Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host "           ALL SERVICES RUNNING                 " -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "    Frontend : http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "    Backend  : http://localhost:$BackendPort" -ForegroundColor Cyan

if ($ollamaCmd) {
    Write-Host "    Ollama   : http://localhost:$ollamaPort" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Opening browser..." -ForegroundColor DarkGray
Start-Process "http://localhost:$FrontendPort"
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host ""

# -- Graceful shutdown on Ctrl+C --
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host ""
    Write-Host "  Shutting down services..." -ForegroundColor Yellow

    # Kill entire process trees for each launched PID
    foreach ($lpid in $launchedPids) {
        $proc = Get-Process -Id $lpid -ErrorAction SilentlyContinue
        if ($proc) {
            $procName = $proc.ProcessName
            Stop-ProcessTree $lpid
            Write-Info "Stopped" "$procName and children (PID: $lpid)"
        }
    }

    # Also kill any remaining processes on our ports (belt and suspenders)
    foreach ($port in @($BackendPort, $FrontendPort)) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                $ownerPid = $c.OwningProcess
                $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-ProcessTree $ownerPid
                    Write-Info "Stopped" "Remaining $($proc.ProcessName) on port $port (PID: $ownerPid)"
                }
            }
        }
    }

    # Remove PID file
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Pass "Cleanup" "All services stopped."
    Write-Host ""
}
