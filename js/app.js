/* ============================================
   Aegis Vision — Shared JavaScript
   Sidebar toggle, nav highlighting, terminal
   auto-scroll, dynamic clock, slider updates,
   language selector, notifications, system status,
   camera detection, model loading, confirm settings
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    let recState = 'IDLE'; // 'IDLE' | 'RECORDING' | 'PAUSED'
    let recElapsedSeconds = 0;
    let recInterval = null;
    let sessionDefectCounts = {};
    let mediaRecorder = null;
    let recordedChunks = [];
    let sessionPeakVram = 0;
    let sessionThumbnail = '';
    let settingsConfirmed = false;
    let historyCurrentPage = 1;
    let historyViewMode = 'grid'; // 'grid' | 'list'
    let selectedRecord = null;
    let currentSessionScreenshots = [];
    let recordCanvas = document.createElement('canvas');
    let recordCtx = recordCanvas.getContext('2d');
    let recordAnimFrame = null;

    function recordCompositeLoop() {
        if (recState === 'RECORDING' || recState === 'PAUSED') {
            if (cameraVideo && !cameraVideo.classList.contains('hidden') && cameraVideo.videoWidth > 0) {
                recordCanvas.width = cameraVideo.videoWidth;
                recordCanvas.height = cameraVideo.videoHeight;
                recordCtx.drawImage(cameraVideo, 0, 0, recordCanvas.width, recordCanvas.height);

                if (detectionCanvas && !detectionCanvas.classList.contains('hidden') && detectionCanvas.width > 0) {
                    recordCtx.drawImage(detectionCanvas, 0, 0, recordCanvas.width, recordCanvas.height);
                }
            }
            recordAnimFrame = requestAnimationFrame(recordCompositeLoop);
        }
    }

    // ─── Sidebar Toggle ────────────────────────────
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menu-toggle');
    const header = document.getElementById('top-header');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (mainContent) mainContent.classList.toggle('collapsed');
            if (header) header.classList.toggle('collapsed');
        });
    }

    // ─── Active Nav Highlighting logic removed (handled by router.js) ────────────

    // ─── Dynamic System Clock (TopAppBar) ──────────
    const clockEl = document.getElementById('system-clock');
    if (clockEl) {
        const updateClock = () => {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hh}:${mm}:${ss}`;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // ─── Language Selector ─────────────────────────
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const langDropdown = document.getElementById('lang-dropdown');
    const langCurrentLabel = document.getElementById('lang-current');
    const langOptions = document.querySelectorAll('.lang-option');

    if (langToggleBtn && langDropdown) {
        langToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = langDropdown.classList.contains('lang-dropdown-open');
            if (isOpen) {
                langDropdown.classList.remove('lang-dropdown-open');
                langDropdown.style.opacity = '0';
                langDropdown.style.visibility = 'hidden';
            } else {
                langDropdown.classList.add('lang-dropdown-open');
                langDropdown.style.opacity = '1';
                langDropdown.style.visibility = 'visible';
            }
        });

        langOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedLang = btn.getAttribute('data-lang');
                langOptions.forEach(b => b.classList.remove('lang-btn-active'));
                btn.classList.add('lang-btn-active');
                if (langCurrentLabel) {
                    langCurrentLabel.textContent = selectedLang;
                }
                langDropdown.classList.remove('lang-dropdown-open');
                langDropdown.style.opacity = '0';
                langDropdown.style.visibility = 'hidden';
            });
        });

        document.addEventListener('click', (e) => {
            if (!langToggleBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.classList.remove('lang-dropdown-open');
                langDropdown.style.opacity = '0';
                langDropdown.style.visibility = 'hidden';
            }
        });
    }

    // ─── Terminal Logging Helper ────────────────────
    const terminal = document.getElementById('terminal-log');

        function termLog(message, type = 'info') {
        if (!terminal) return;
        const logContainer = terminal.querySelector('.flex.flex-col');
        if (!logContainer) return;

        // Remove "Awaiting" message if present
        const awaiting = logContainer.querySelector('.animate-pulse');
        if (awaiting) awaiting.remove();

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const p = document.createElement('p');
        let colorClass = '';
        if (type === 'success') colorClass = ' class="text-secondary"';
        else if (type === 'error') colorClass = ' class="text-error"';
        else if (type === 'warning') colorClass = ' class="text-[#ffb74d]"';

        p.innerHTML = `<span class="text-primary/70">[${timeStr}]</span> <span${colorClass}>${message}</span>`;
        logContainer.appendChild(p);

        terminal.scrollTop = terminal.scrollHeight;

        // Keep only last 50 entries
        const entries = logContainer.querySelectorAll('p');
        if (entries.length > 50) {
            entries[0].remove();
        }

        // --- Auto route to Notification Bell ---
        if (window.addNotification) {
            // Ignore decorative lines
            if (message.includes('═════') || message.trim().startsWith('→')) return;

            let notifId = null;
            let icon = 'info';
            let cleanMsg = message;

            if (message.includes('CAM_SCAN:') || message.includes('SYS: Scanning') || message.includes('CAM_LOAD:')) {
                notifId = type === 'error' ? 'notif-cam-failed' : 'notif-cam-connected';
                icon = type === 'error' ? 'videocam_off' : 'videocam';
                cleanMsg = message.replace(/^(CAM_SCAN|SYS|CAM_LOAD):\s*/, '');
            } else if (message.includes('MDL_ADD:') || message.includes('SYS: Restored')) {
                notifId = 'notif-model-added';
                icon = 'memory';
                cleanMsg = message.replace(/^(MDL_ADD|SYS):\s*/, '');
            } else if (message.includes('MDL_LOAD:') || message.includes('DETECT:') || message.includes('RE-ID:')) {
                notifId = type === 'error' ? 'notif-model-failed' : 'notif-model-loaded';
                if (message.includes('No model detected') || message.includes('Please select')) notifId = 'notif-model-failed';
                icon = type === 'error' ? 'model_training' : 'check_circle';
                cleanMsg = message.replace(/^(MDL_LOAD|DETECT|RE-ID):\s*/, '');
            } else if (message.includes('PRINTER_ADD:')) {
                notifId = 'notif-printer-added';
                icon = 'print';
                cleanMsg = message.replace(/^PRINTER_ADD:\s*/, '');
            } else if (message.includes('SCREENSHOT:')) {
                notifId = type === 'error' ? 'notif-media-error' : 'notif-screenshot-saved';
                icon = type === 'error' ? 'broken_image' : 'photo_camera';
                cleanMsg = message.replace(/^SCREENSHOT( ERROR)?:\s*/, '');
            } else if (message.includes('SESSION:')) {
                notifId = type === 'error' ? 'notif-media-error' : 'notif-session-state';
                icon = 'fiber_manual_record';
                if (message.includes('paused')) icon = 'pause';
                if (message.includes('resumed')) icon = 'play_arrow';
                if (message.includes('finished')) icon = 'dns';
                cleanMsg = message.replace(/^SESSION:\s*/, '');
            } else if (message.includes('ROI:')) {
                notifId = 'notif-roi-updated';
                icon = 'crop';
                cleanMsg = message.replace(/^ROI:\s*/, '');
            } else if (message.includes('LOCAL SAVE:') || message.includes('ZIP EXPORT:') || message.includes('ZIP ERROR:')) {
                notifId = type === 'error' ? 'notif-export-failed' : 'notif-export-success';
                icon = type === 'error' ? 'error' : 'save';
                cleanMsg = message.replace(/^(LOCAL SAVE|ZIP EXPORT|ZIP ERROR):\s*/, '');
            } else if (message.includes('CONFIRM:') || message.includes('Settings') || message.includes('parameters') || message.includes('Camera video') || message.includes('Camera FPS') || message.includes('Notification') || message.includes('Warning: Could not reach backend')) {
                notifId = (type === 'error' || type === 'warning') ? 'notif-settings-invalid' : 'notif-settings-saved';
                if (message.includes('reverted')) notifId = 'notif-settings-reverted';
                icon = 'settings';
                cleanMsg = message.replace(/^CONFIRM:\s*/, '');
            }

            if (notifId) {
                // simple deduplication (within 100ms)
                const _now = Date.now();
                window._lastAutoNotifTime = window._lastAutoNotifTime || 0;
                window._lastAutoNotifMsg = window._lastAutoNotifMsg || '';
                
                if (_now - window._lastAutoNotifTime < 100 && window._lastAutoNotifMsg === cleanMsg) {
                    return; // skip duplicate
                }
                
                window._lastAutoNotifTime = _now;
                window._lastAutoNotifMsg = cleanMsg;
                
                // Add without creating an infinite loop
                window.addNotification(cleanMsg, type, icon, notifId);
            }
        }
    }

    // Expose globally
    window.termLog = termLog;

    // ─── System Status (Camera & Model detection) ──
    const statusDot = document.getElementById('system-status-dot');
    const statusText = document.getElementById('system-status-text');

    window.aegisSystemState = {
        cameraOnline: false,
        modelOnline: false,
        loadedModelName: '',
    };

    function updateSystemStatus() {
        const { cameraOnline, modelOnline } = window.aegisSystemState;

        if (!statusDot || !statusText) return;

        if (cameraOnline && modelOnline) {
            statusDot.className = 'w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.6)]';
            statusText.className = 'font-label-mono text-[10px] text-secondary tracking-widest uppercase';
            statusText.textContent = 'System Online';
        } else if (cameraOnline && !modelOnline) {
            statusDot.className = 'w-2 h-2 rounded-full bg-[#ffb74d] animate-pulse shadow-[0_0_8px_rgba(255,183,77,0.6)]';
            statusText.className = 'font-label-mono text-[10px] text-[#ffb74d] tracking-widest uppercase';
            statusText.textContent = 'Camera Online';
        } else if (!cameraOnline && modelOnline) {
            statusDot.className = 'w-2 h-2 rounded-full bg-[#ffb74d] animate-pulse shadow-[0_0_8px_rgba(255,183,77,0.6)]';
            statusText.className = 'font-label-mono text-[10px] text-[#ffb74d] tracking-widest uppercase';
            statusText.textContent = 'Model Online';
        } else {
            statusDot.className = 'w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(255,68,68,0.6)]';
            statusText.className = 'font-label-mono text-[10px] text-error tracking-widest uppercase';
            statusText.textContent = 'System Offline';
        }
    }

    window.updateSystemStatus = (cameraOnline, modelOnline) => {
        window.aegisSystemState.cameraOnline = cameraOnline;
        window.aegisSystemState.modelOnline = modelOnline;
        updateSystemStatus();
    };

    // ─── Resource Usage Monitor ────────────────────
    const computeLoadVal = document.getElementById('compute-load-val');
    const computeLoadSub = document.getElementById('compute-load-sub');
    const computeAppBar = document.getElementById('compute-app-bar');
    const computeOtherBar = document.getElementById('compute-other-bar');

    const vramUsageVal = document.getElementById('vram-usage-val');
    const vramUsageSub = document.getElementById('vram-usage-sub');
    const vramAppBar = document.getElementById('vram-app-bar');
    const vramOtherBar = document.getElementById('vram-other-bar');

    let telemetryWS = null;
    function connectTelemetryWS() {
        try {
            telemetryWS = new WebSocket('ws://localhost:8000/ws/telemetry');
            telemetryWS.onmessage = (event) => {
                if (!computeLoadVal || !computeAppBar || !computeOtherBar || !vramUsageVal || !vramAppBar || !vramOtherBar) return;
                const data = JSON.parse(event.data);
                const { appCpu, otherCpu, totalCpu, appVram, otherVram, totalVramUsed, totalVramCap } = data;

                window.aegisSystemState.vramUsage = totalVramUsed;

                computeLoadVal.textContent = `${totalCpu}%`;
                if (computeLoadSub) computeLoadSub.textContent = `Other ${otherCpu}% | Aegis ${appCpu}%`;
                computeAppBar.style.width = `${appCpu}%`;
                computeOtherBar.style.width = `${otherCpu}%`;

                vramUsageVal.innerHTML = `${totalVramUsed}<span class="text-[12px] text-on-surface-variant">GB</span>`;
                if (vramUsageSub) vramUsageSub.textContent = `Other ${otherVram}G | Aegis ${appVram}G`;

                const appVramPct = (appVram / totalVramCap) * 100;
                const otherVramPct = (otherVram / totalVramCap) * 100;
                vramAppBar.style.width = `${Math.min(100, appVramPct)}%`;
                vramOtherBar.style.width = `${Math.min(100, otherVramPct)}%`;
            };
            telemetryWS.onclose = () => {
                setTimeout(connectTelemetryWS, 5000); // Reconnect
            };
        } catch (e) {
            console.error("Telemetry WS Error:", e);
        }
    }

    updateSystemStatus();
    connectTelemetryWS();

    // ─── Notification Bell & Panel ─────────────────
    const notifBell = document.getElementById('notification-bell');
    const notifPanel = document.getElementById('notification-panel');
    const notifBadge = document.getElementById('notification-badge');
    const notifList = document.getElementById('notif-list');
    const notifCount = document.getElementById('notif-count');

    const notifications = [];

    function renderNotifications() {
        if (!notifList || !notifCount || !notifBadge) return;

        const unreadCount = notifications.filter(n => !n.read).length;
        notifCount.textContent = notifications.length;

        if (notifications.length === 0) {
            notifList.innerHTML = `
                <div class="notif-empty">
                    <span class="material-symbols-outlined text-[24px] text-outline mb-2 block">notifications_off</span>
                    No new notifications
                </div>`;
            notifBadge.classList.remove('has-notif');
        } else {
            // Show red badge only if there are unread notifications
            if (unreadCount > 0) {
                notifBadge.classList.add('has-notif');
            } else {
                notifBadge.classList.remove('has-notif');
            }
            notifList.innerHTML = notifications.map((n, i) => `
                <div class="notif-item ${!n.read ? 'notif-unread' : ''}" data-notif-index="${i}">
                    <div class="flex items-center gap-2 mb-1">
                        ${!n.read ? '<span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>' : ''}
                        <span class="material-symbols-outlined text-[14px] ${n.type === 'error' ? 'text-error' : n.type === 'warning' ? 'text-[#ffb74d]' : 'text-primary'}">${n.icon || 'info'}</span>
                        <span class="font-label-mono text-[10px] text-on-surface-variant tracking-wider">${n.time}</span>
                    </div>
                    <p class="text-[12px] text-on-surface leading-snug">${n.message}</p>
                </div>
            `).join('');
        }
    }

    if (notifBell && notifPanel) {
        // Helper to mark all as read and re-render
        function markAllNotificationsRead() {
            const hadUnread = notifications.some(n => !n.read);
            if (hadUnread) {
                notifications.forEach(n => n.read = true);
                renderNotifications();
            }
        }

        notifBell.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = notifPanel.classList.contains('open');
            notifPanel.classList.toggle('open');

            // Mark as read when panel is CLOSED
            if (wasOpen) {
                markAllNotificationsRead();
            }
        });

        document.addEventListener('click', (e) => {
            if (!notifBell.contains(e.target) && !notifPanel.contains(e.target)) {
                if (notifPanel.classList.contains('open')) {
                    notifPanel.classList.remove('open');
                    markAllNotificationsRead();
                }
            }
        });
    }

    window.addNotification = (message, type = 'info', icon = 'info', notifId = null) => {
        console.log(`addNotification called: ${message} (notifId: ${notifId})`);
        if (notifId) {
            let config = {};
            try {
                config = JSON.parse(localStorage.getItem('aegis_settings_notif') || '{}');
            } catch(e) {
                config = {};
            }
            if (config[notifId] === false || config[notifId] === 'false') {
                console.log(`Notification ${notifId} blocked by settings.`);
                return; // User has disabled this notification
            }
        }
        console.log(`Adding notification to array.`);
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        notifications.unshift({ message, type, icon, time: timeStr, read: false });
        if (notifications.length > 20) notifications.pop();
        renderNotifications();
    };

    window.clearNotifications = () => {
        notifications.length = 0;
        renderNotifications();
    };

    renderNotifications();

    // ─── Camera Detection & Loading ────────────────
    const cameraSelect = document.getElementById('camera-select');
    const loadCameraBtn = document.getElementById('load-camera-btn');
    const cameraVideo = document.getElementById('camera-video');
    const noCameraPlaceholder = document.getElementById('no-camera-placeholder');
    const recBadge = document.getElementById('rec-badge');
    const camLabel = document.getElementById('cam-label');
    const feedStats = document.getElementById('feed-stats');
    const engineStatus = document.getElementById('engine-status');

    // Store detected cameras
    let detectedCameras = [];
    let activeCameraStream = null;
    const detectionCanvas = document.getElementById('detection-canvas');
    let detectionAnimationId = null;

    async function detectCameras() {
        termLog('SYS: Scanning for connected cameras...');

        try {
            // Request permission first (needed to get labels)
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(t => t.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            if (videoDevices.length === 0) {
                termLog('CAM_SCAN: No cameras detected.', 'warning');
                return;
            }

            detectedCameras = videoDevices;
            termLog(`CAM_SCAN: Found ${videoDevices.length} camera(s).`, 'success');

            // Populate camera select
            if (cameraSelect) {
                // Clear existing options except placeholder
                cameraSelect.innerHTML = '<option value="">-- Select Camera --</option>';

                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                    termLog(`  → [${index + 1}] ${device.label || `Camera ${index + 1}`} (ID: ${device.deviceId.substring(0, 8)}...)`);
                });

            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                termLog('CAM_SCAN: Camera access denied by user.', 'error');
            } else if (err.name === 'NotFoundError') {
                termLog('CAM_SCAN: No cameras found on this device.', 'warning');
            } else {
                termLog(`CAM_SCAN: Error scanning cameras — ${err.message}`, 'error');
            }
        }
    }

    // Run camera detection on page load
    if (cameraSelect) {
        detectCameras();
    }

    // Load Camera button
    if (loadCameraBtn) {
        loadCameraBtn.addEventListener('click', async () => {
            // Use selectedIndex to check if user picked a real camera (index 0 = placeholder)
            const selectedIndex = cameraSelect ? cameraSelect.selectedIndex : 0;

            if (selectedIndex <= 0) {
                if (detectedCameras.length === 0) {
                    termLog('CAM_LOAD: No camera detected.', 'error');
                } else {
                    termLog('CAM_LOAD: Please select the camera.', 'error');
                }
                return;
            }

            const selectedDeviceId = cameraSelect.value;
            const selectedLabel = cameraSelect.options[selectedIndex].textContent;
            termLog(`CAM_LOAD: Attempting to load "${selectedLabel}"...`);

            try {
                // Stop existing stream if any
                if (activeCameraStream) {
                    activeCameraStream.getTracks().forEach(t => t.stop());
                    activeCameraStream = null;
                }

                // Build video constraints — use exact deviceId if available, otherwise fallback
                const videoConstraints = selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {};

                try {
                    const modelConfig = JSON.parse(localStorage.getItem('aegis_settings_model'));
                    if (modelConfig && modelConfig.maxFps && parseInt(modelConfig.maxFps) > 0) {
                        const maxFps = parseInt(modelConfig.maxFps);
                        videoConstraints.frameRate = { ideal: maxFps, max: maxFps };
                    }
                } catch (e) { }

                const finalVideoConstraints = Object.keys(videoConstraints).length > 0 ? videoConstraints : true;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: finalVideoConstraints
                });

                activeCameraStream = stream;

                if (cameraVideo) {
                    cameraVideo.srcObject = stream;
                    cameraVideo.classList.remove('hidden');
                }
                if (noCameraPlaceholder) {
                    noCameraPlaceholder.classList.add('hidden');
                }
                if (camLabel) {
                    camLabel.classList.remove('hidden');
                    camLabel.textContent = selectedLabel;
                }

                // Get video track settings for feed stats
                const videoTrack = stream.getVideoTracks()[0];
                const settings = videoTrack.getSettings();
                if (feedStats) {
                    feedStats.innerHTML = `FPS: ${settings.frameRate || '--'} <br> RES: ${settings.width || '--'}x${settings.height || '--'}`;
                }
                if (engineStatus && window.aegisSystemState.loadedModelName) {
                    engineStatus.textContent = `${window.aegisSystemState.loadedModelName} PROCESSING...`;
                }

                // Update system status
                window.aegisSystemState.cameraOnline = true;
                updateSystemStatus();

                termLog('CAM_LOAD: Camera successfully loaded.', 'success');

                termLog(`CAM_LOAD: "${selectedLabel}" loaded successfully. Stream active.`, 'success');
                termLog(`CAM_LOAD: Resolution: ${settings.width}x${settings.height}, FPS: ${settings.frameRate}`);
            } catch (err) {
                termLog(`CAM_LOAD: Failed to load camera — ${err.message}`, 'error');
            }
        });
    }

    // ─── Model Select & Loading ────────────────────
    const modelSelect = document.getElementById('model-select');
    const loadModelBtn = document.getElementById('load-model-btn');

    // Handle "Add Model" selection
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            if (modelSelect.value === '__add_model__') {
                // Reset to placeholder before prompting
                modelSelect.value = '';

                const modelPath = prompt('Enter the path to the model weight file:\n(e.g., C:\\models\\yolov8n.pt or /home/user/models/resnet50.pth)');
                if (modelPath && modelPath.trim()) {
                    const trimmedPath = modelPath.trim();
                    // Extract model name from path
                    const modelName = trimmedPath.split(/[\\/]/).pop();

                    // Check if already exists
                    const exists = Array.from(modelSelect.options).some(opt => opt.getAttribute('data-path') === trimmedPath);
                    if (exists) {
                        termLog(`MDL_ADD: Model "${modelName}" is already in the list.`, 'warning');
                        // Select existing
                        for (const opt of modelSelect.options) {
                            if (opt.getAttribute('data-path') === trimmedPath) {
                                modelSelect.value = opt.value;
                                break;
                            }
                        }
                        return;
                    }

                    // Insert new option before the "Add Model" option
                    const addOption = modelSelect.querySelector('option[value="__add_model__"]');
                    const newOption = document.createElement('option');
                    newOption.value = trimmedPath;
                    newOption.textContent = modelName;
                    newOption.setAttribute('data-path', trimmedPath);
                    modelSelect.insertBefore(newOption, addOption);

                    // Select the newly added model
                    modelSelect.value = trimmedPath;

                    termLog(`MDL_ADD: Model "${modelName}" added from path: ${trimmedPath}`, 'success');

                    // Save to localStorage
                    saveModelsToStorage();
                }
            }
        });
    }

    // Load Model button
    if (loadModelBtn) {
        loadModelBtn.addEventListener('click', () => {
            const selectedValue = modelSelect ? modelSelect.value : '';

            if (!selectedValue || selectedValue === '__add_model__') {
                // Check if any real model options exist (beyond placeholder and __add_model__)
                const hasModels = modelSelect && Array.from(modelSelect.options).some(
                    opt => opt.value && opt.value !== '__add_model__'
                );
                if (!hasModels) {
                    termLog('MDL_LOAD: No model detected.', 'error');
                } else {
                    termLog('MDL_LOAD: Please select the model.', 'error');
                }
                return;
            }

            const selectedLabel = modelSelect.options[modelSelect.selectedIndex].textContent;
            termLog(`MDL_LOAD: Attempting to load model "${selectedLabel}"...`);
            termLog(`MDL_LOAD: Reading weight file from: ${selectedValue}`);

            // Simulate model loading with a delay
            termLog('MDL_LOAD: Validating model architecture...');

            setTimeout(() => {
                termLog('MDL_LOAD: Loading weights into memory...');

                setTimeout(() => {
                    // Simulate success (in a real app, this would verify the file exists)
                    termLog(`MDL_LOAD: Model "${selectedLabel}" loaded successfully.`, 'success');
                    termLog('MDL_LOAD: Model is ready for inference.', 'success');

                    // Update system status
                    window.aegisSystemState.modelOnline = true;
                    window.aegisSystemState.loadedModelName = selectedLabel;
                    updateSystemStatus();

                    // Update engine status display with model name
                    if (engineStatus) {
                        engineStatus.textContent = `${selectedLabel} PROCESSING...`;
                    }

                    // Start detection overlay if camera is active
                    startDetectionOverlay();

                }, 800);
            }, 600);
        });
    }

    // ─── Printer Select (Add Printer) ──────────────
    const printerSelect = document.getElementById('printer-select');

    if (printerSelect) {
        printerSelect.addEventListener('change', () => {
            if (printerSelect.value === '__add_printer__') {
                // Reset to placeholder before prompting
                printerSelect.value = '';

                const printerName = prompt('Enter the printer model name:\n(e.g., Aegis-Print P1, HP LaserJet Pro)');
                if (printerName && printerName.trim()) {
                    const trimmedName = printerName.trim();

                    // Check if already exists
                    const exists = Array.from(printerSelect.options).some(opt => opt.textContent === trimmedName);
                    if (exists) {
                        termLog(`PRINTER_ADD: Printer "${trimmedName}" is already in the list.`, 'warning');
                        // Select existing
                        for (const opt of printerSelect.options) {
                            if (opt.textContent === trimmedName) {
                                printerSelect.value = opt.value;
                                break;
                            }
                        }
                        return;
                    }

                    // Insert before "Add Printer" option
                    const addOption = printerSelect.querySelector('option[value="__add_printer__"]');
                    const newOption = document.createElement('option');
                    newOption.value = trimmedName;
                    newOption.textContent = trimmedName;
                    printerSelect.insertBefore(newOption, addOption);

                    // Select newly added printer
                    printerSelect.value = trimmedName;

                    termLog(`PRINTER_ADD: Printer "${trimmedName}" added to the list.`, 'success');

                    // Save to localStorage
                    savePrintersToStorage();
                }
            }
        });
    }

    // ─── Confirm Setting ───────────────────────────
    const confirmSettingBtn = document.getElementById('confirm-setting-btn');

    if (confirmSettingBtn) {
        confirmSettingBtn.addEventListener('click', () => {
            // Use selectedIndex to avoid empty-value bug (same fix as Load Camera)
            const cameraIdx = cameraSelect ? cameraSelect.selectedIndex : 0;
            const modelVal = modelSelect ? modelSelect.value : '';
            const printerVal = printerSelect ? printerSelect.value : '';

            const missing = [];
            if (cameraIdx <= 0) missing.push('Camera (Source Input)');
            if (!modelVal || modelVal === '__add_model__') missing.push('Inference Model');
            if (!printerVal || printerVal === '__add_printer__') missing.push('Printer Model');

            if (missing.length > 0) {
                const missingStr = missing.join(', ');
                termLog(`CONFIRM: Missing selections — ${missingStr}. Please complete all settings.`, 'warning');
                return;
            }

            // All selections are valid
            const cameraName = cameraSelect.options[cameraIdx].textContent;
            const modelName = modelSelect.options[modelSelect.selectedIndex].textContent;
            const printerName = printerSelect.options[printerSelect.selectedIndex].textContent;

            settingsConfirmed = true;
            if (typeof updateRecUI === 'function') updateRecUI();

            termLog('═══════════════════════════════════════════');
            termLog('CONFIRM: All settings confirmed successfully.', 'success');
            termLog(`  → Camera:  ${cameraName}`);
            termLog(`  → Model:   ${modelName}`);
            termLog(`  → Printer: ${printerName}`);
            termLog('═══════════════════════════════════════════');

        });
    }

    // ─── Screenshot Button ─────────────────────────
    const screenshotBtn = document.getElementById('screenshot-btn');
    const capturesGrid = document.getElementById('captures-grid');
    const capturesCount = document.getElementById('captures-count');
    let screenshotCounter = 0;

    if (capturesGrid) {
        capturesGrid.addEventListener('wheel', (evt) => {
            evt.preventDefault();
            capturesGrid.scrollLeft += evt.deltaY;
        });
    }

    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
            if (recState === 'IDLE') {
                termLog('SCREENSHOT ERROR: Cannot take a screenshot while not recording. Start recording first.', 'error');
                return;
            }
            if (!cameraVideo || cameraVideo.classList.contains('hidden') || !activeCameraStream) {
                termLog('SCREENSHOT: No active camera feed. Please load a camera first.', 'error');
                return;
            }

            try {
                const canvas = document.createElement('canvas');
                canvas.width = cameraVideo.videoWidth;
                canvas.height = cameraVideo.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

                // Draw detection overlay on top if active
                if (detectionCanvas && !detectionCanvas.classList.contains('hidden') && detectionCanvas.width > 0) {
                    ctx.drawImage(detectionCanvas, 0, 0, canvas.width, canvas.height);
                }

                const dataUrl = canvas.toDataURL('image/png');
                screenshotCounter++;

                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                // Clear placeholder on first capture
                if (screenshotCounter === 1 && capturesGrid) {
                    const placeholder = document.getElementById('captures-placeholder');
                    if (placeholder) placeholder.remove();
                }

                // Add capture to the grid
                if (capturesGrid) {
                    const captureItem = document.createElement('div');
                    captureItem.className = 'relative rounded-lg overflow-hidden border border-outline-variant/30 group cursor-pointer shrink-0 h-full';
                    captureItem.style.width = 'calc(33.333% - 6px)';
                    captureItem.innerHTML = `
                        <img src="${dataUrl}" alt="Capture ${screenshotCounter}" class="w-full h-full object-cover">
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <div class="flex items-center justify-between">
                                <span class="font-label-mono text-[8px] text-on-surface/80 tracking-wider">#${screenshotCounter}</span>
                                <span class="font-label-mono text-[8px] text-primary/80 tracking-wider">${timeStr}</span>
                            </div>
                        </div>
                        <a href="${dataUrl}" download="aegis_capture_${screenshotCounter}.png" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-0.5">
                            <span class="material-symbols-outlined text-[12px] text-on-surface">download</span>
                        </a>
                    `;

                    // Click to open lightbox preview
                    captureItem.addEventListener('click', (e) => {
                        if (e.target.closest('a')) return; // Don't trigger on download link
                        openLightbox(dataUrl, screenshotCounter, timeStr);
                    });

                    capturesGrid.appendChild(captureItem);

                    // Scroll to the latest (rightmost) capture
                    capturesGrid.scrollLeft = capturesGrid.scrollWidth;
                }

                // Update count
                if (capturesCount) {
                    capturesCount.textContent = `${screenshotCounter} capture${screenshotCounter > 1 ? 's' : ''}`;
                }

                // Add capture object to active session tracking
                currentSessionScreenshots.push({
                    id: screenshotCounter,
                    name: `aegis_capture_${screenshotCounter}.png`,
                    timeStr: timeStr,
                    dataUrl: dataUrl
                });

                termLog(`SCREENSHOT: Capture #${screenshotCounter} saved. (${canvas.width}x${canvas.height})`, 'success');
            } catch (err) {
                termLog(`SCREENSHOT: Failed — ${err.message}`, 'error');
            }
        });
    }

    // ─── Re-identify Button ────────────────────────
    const reidentifyBtn = document.getElementById('reidentify-btn');

    if (reidentifyBtn) {
        reidentifyBtn.addEventListener('click', () => {
            if (!window.aegisSystemState.modelOnline || !window.aegisSystemState.loadedModelName) {
                termLog('RE-ID: No model is currently loaded. Please load a model first.', 'error');
                return;
            }

            if (!activeCameraStream) {
                termLog('RE-ID: No active camera feed. Please load a camera first.', 'error');
                return;
            }

            const modelName = window.aegisSystemState.loadedModelName;
            termLog(`RE-ID: Re-identifying with model "${modelName}"...`);

            if (engineStatus) {
                engineStatus.textContent = `${modelName} RE-IDENTIFYING...`;
            }

            // Simulate re-identification process
            setTimeout(() => {
                termLog(`RE-ID: Reloading model "${modelName}" weights...`);

                setTimeout(() => {
                    termLog(`RE-ID: Model "${modelName}" re-initialized.`, 'success');
                    termLog('RE-ID: Running inference on current frame...', 'success');

                    if (engineStatus) {
                        engineStatus.textContent = `${modelName} PROCESSING...`;
                    }

                    // Restart detection overlay
                    startDetectionOverlay();

                }, 800);
            }, 500);
        });
    }

    // ─── Detection Overlay System ──────────────────
    const detectionClasses = ['person', 'car', 'truck', 'bicycle', 'dog', 'cat', 'backpack', 'handbag', 'cell phone', 'bottle'];
    const detectionColors = ['#4b8eff', '#4edea3', '#ffb74d', '#c0c1ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b81', '#a66cff'];
    let simulatedDetections = [];

    let inferenceWS = null;
    let inferenceInterval = null;

    function drawDetections() {
        if (!detectionCanvas || !cameraVideo || cameraVideo.classList.contains('hidden')) return;

        const rect = cameraVideo.getBoundingClientRect();
        let cWidth = rect.width;
        let cHeight = rect.height;
        if (cWidth === 0 && cameraVideo.videoWidth) {
            cWidth = cameraVideo.videoWidth;
            cHeight = cameraVideo.videoHeight;
        }
        detectionCanvas.width = cWidth;
        detectionCanvas.height = cHeight;

        const ctx = detectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

        // Fetch active settings filter values
        const minConf = parseInt(document.getElementById('model-conf-thresh')?.value || '75', 10);
        const allowPerson = document.getElementById('alert-target-person')?.checked ?? true;
        const allowCar = document.getElementById('alert-target-car')?.checked ?? true;
        const allowTruck = document.getElementById('alert-target-truck')?.checked ?? true;
        const allowAnimal = document.getElementById('alert-target-animal')?.checked ?? true;
        const allowUnrecognized = document.getElementById('alert-target-unrecognized')?.checked ?? true;

        simulatedDetections.forEach(det => {
            // Filter 1: Confidence threshold filter
            let confVal = 100;
            if (typeof det.confidence === 'number') {
                confVal = det.confidence * 100;
            } else if (typeof det.confidence === 'string') {
                confVal = parseInt(det.confidence.replace('%', ''), 10) || 100;
            }
            if (confVal < minConf) return;

            // Smoothly interpolate positions
            det.x += (det.targetX - det.x) * 0.05;
            det.y += (det.targetY - det.y) * 0.05;
            det.w += (det.targetW - det.w) * 0.05;
            det.h += (det.targetH - det.h) * 0.05;

            const x = det.x * detectionCanvas.width;
            const y = det.y * detectionCanvas.height;
            const w = det.w * detectionCanvas.width;
            const h = det.h * detectionCanvas.height;

            // Draw box
            ctx.strokeStyle = det.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // Draw corner accents
            const cornerLen = Math.min(w, h) * 0.2;
            ctx.lineWidth = 3;
            // Top-left
            ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
            // Top-right
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
            // Bottom-left
            ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
            // Bottom-right
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();

            // Draw label background
            const displayConf = typeof det.confidence === 'number' ? Math.round(det.confidence * 100) + '%' : det.confidence;
            const labelText = `${det.label} ${displayConf}`;
            ctx.font = '600 11px "JetBrains Mono", monospace';
            const textWidth = ctx.measureText(labelText).width;
            const labelH = 18;
            ctx.fillStyle = det.color;
            ctx.fillRect(x, y - labelH, textWidth + 10, labelH);

            // Draw label text
            ctx.fillStyle = '#000';
            ctx.fillText(labelText, x + 5, y - 5);
        });

        detectionAnimationId = requestAnimationFrame(drawDetections);
    }

    function startDetectionOverlay() {
        if (!detectionCanvas || !cameraVideo || cameraVideo.classList.contains('hidden')) return;

        // Stop existing animation
        if (detectionAnimationId) {
            cancelAnimationFrame(detectionAnimationId);
            detectionAnimationId = null;
        }

        detectionCanvas.classList.remove('hidden');
        simulatedDetections = [];

        try {
            inferenceWS = new WebSocket('ws://localhost:8000/ws/inference');
            inferenceWS.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.detections) {
                    const newDets = data.detections.map(nd => {
                        const hash = nd.label.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
                        const classIdx = Math.abs(hash) % detectionColors.length;
                        return {
                            ...nd,
                            color: detectionColors[classIdx] || '#4b8eff',
                            targetX: nd.x, targetY: nd.y, targetW: nd.w, targetH: nd.h,
                        };
                    });

                    if (simulatedDetections.length === 0) {
                        simulatedDetections = newDets.map(nd => ({ ...nd, x: nd.targetX, y: nd.targetY, w: nd.targetW, h: nd.targetH }));
                    } else {
                        simulatedDetections = newDets.map((nd, i) => {
                            const old = simulatedDetections[i] || nd;
                            return { ...nd, x: old.x, y: old.y, w: old.w, h: old.h };
                        });
                    }
                }
            };
        } catch (e) {
            console.error("Inference WS Error:", e);
        }

        // Dynamic frame sending based on user setting
        let lastSendTime = 0;
        inferenceInterval = setInterval(() => {
            const now = Date.now();
            const intervalMs = (window.aegisModelInterval || 0) * 1000;
            // Baseline 200ms (5fps) if real-time, else use user defined interval
            const targetWait = intervalMs > 0 ? intervalMs : 200;

            if (now - lastSendTime >= targetWait) {
                if (inferenceWS && inferenceWS.readyState === WebSocket.OPEN && cameraVideo && !cameraVideo.classList.contains('hidden')) {
                    const canvas = document.createElement('canvas');
                    // Downscale for performance
                    canvas.width = 640;
                    canvas.height = 480;
                    const ctx = canvas.getContext('2d');

                    const pipEl = document.getElementById('camera-pip');
                    const pipVideo = document.getElementById('pip-video');
                    const activeVideo = (pipEl && !pipEl.classList.contains('hidden') && pipVideo) ? pipVideo : cameraVideo;

                    ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    inferenceWS.send(dataUrl);
                    lastSendTime = now;
                }
            }
        }, 50);

        drawDetections();
        termLog('DETECT: Real-time backend inference started.', 'success');
    }

    function stopDetectionOverlay() {
        if (detectionAnimationId) {
            cancelAnimationFrame(detectionAnimationId);
            detectionAnimationId = null;
        }
        if (inferenceInterval) {
            clearInterval(inferenceInterval);
            inferenceInterval = null;
        }
        if (inferenceWS) {
            inferenceWS.close();
            inferenceWS = null;
        }
        if (detectionCanvas) {
            detectionCanvas.classList.add('hidden');
            const ctx = detectionCanvas.getContext('2d');
            ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
        }
        simulatedDetections = [];
    }

    // ─── localStorage Persistence (Models & Printers) ──
    function saveModelsToStorage() {
        if (!modelSelect) return;
        const models = [];
        Array.from(modelSelect.options).forEach(opt => {
            if (opt.value && opt.value !== '__add_model__') {
                models.push({ path: opt.value, name: opt.textContent, dataPath: opt.getAttribute('data-path') || opt.value });
            }
        });
        localStorage.setItem('aegis_saved_models', JSON.stringify(models));
    }

    function savePrintersToStorage() {
        if (!printerSelect) return;
        const printers = [];
        Array.from(printerSelect.options).forEach(opt => {
            if (opt.value && opt.value !== '__add_printer__') {
                printers.push(opt.value);
            }
        });
        localStorage.setItem('aegis_saved_printers', JSON.stringify(printers));
    }

    function restoreModelsFromStorage() {
        if (!modelSelect) return;
        try {
            const saved = JSON.parse(localStorage.getItem('aegis_saved_models') || '[]');
            if (saved.length === 0) return;

            const addOption = modelSelect.querySelector('option[value="__add_model__"]');
            saved.forEach(m => {
                // Check if already exists
                const exists = Array.from(modelSelect.options).some(opt => opt.value === m.path);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = m.path;
                    opt.textContent = m.name;
                    opt.setAttribute('data-path', m.dataPath);
                    modelSelect.insertBefore(opt, addOption);
                }
            });
            termLog(`SYS: Restored ${saved.length} saved model(s) from storage.`);
        } catch (e) { /* ignore parse errors */ }
    }

    function restorePrintersFromStorage() {
        if (!printerSelect) return;
        try {
            const saved = JSON.parse(localStorage.getItem('aegis_saved_printers') || '[]');
            if (saved.length === 0) return;

            const addOption = printerSelect.querySelector('option[value="__add_printer__"]');
            saved.forEach(name => {
                const exists = Array.from(printerSelect.options).some(opt => opt.value === name);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    printerSelect.insertBefore(opt, addOption);
                }
            });
            termLog(`SYS: Restored ${saved.length} saved printer(s) from storage.`);
        } catch (e) { /* ignore parse errors */ }
    }

    // Restore on page load
    restoreModelsFromStorage();
    restorePrintersFromStorage();

    // ─── IndexedDB Database Manager ────────────────
    const DB_NAME = 'AegisVisionDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'identifications';
    let dbInstance = null;

    function openDatabase() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('sessionName', 'sessionName', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            request.onerror = (e) => {
                console.error('IndexedDB Error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async function saveRecordToDB(record) {
        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.add(record);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.error('Failed to save to IndexedDB:', err);
        }
    }

    function downloadSessionFiles(record, videoBlob, screenshots) {
        try {
            const sanitize = (str) => (str || 'Identify').replace(/[^a-zA-Z0-9_-]/g, '_');
            const prefix = `record/${sanitize(record.sessionName)}`;

            // 1. Download Session Attributes Log JSON
            const logData = {
                sessionName: record.sessionName,
                timestamp: `${record.year}-${String(record.month).padStart(2, '0')}-${String(record.day).padStart(2, '0')} ${String(record.hour).padStart(2, '0')}:${String(record.minute).padStart(2, '0')}:${String(record.second).padStart(2, '0')}`,
                duration: record.durationFormatted,
                cameraName: record.cameraName,
                printerName: record.printerName,
                modelName: record.modelName,
                peakVram: `${record.peakVram || 0} GB`,
                totalDefects: record.totalDefects,
                defectCounts: record.defectCounts,
                defectsDetected: record.defectsDetected
            };
            const logBlob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
            const logUrl = URL.createObjectURL(logBlob);
            const aLog = document.createElement('a');
            aLog.href = logUrl;
            aLog.download = `${prefix}_log.json`;
            document.body.appendChild(aLog);
            aLog.click();
            document.body.removeChild(aLog);
            setTimeout(() => URL.revokeObjectURL(logUrl), 1000);

            // 2. Download Video (.webm)
            if (videoBlob && videoBlob.size > 0) {
                const videoUrl = URL.createObjectURL(videoBlob);
                const aVid = document.createElement('a');
                aVid.href = videoUrl;
                aVid.download = `${prefix}_video.webm`;
                document.body.appendChild(aVid);
                setTimeout(() => {
                    aVid.click();
                    document.body.removeChild(aVid);
                    setTimeout(() => URL.revokeObjectURL(videoUrl), 1000);
                }, 300);
            }

            // 3. Download Screenshots (.png)
            if (screenshots && screenshots.length > 0) {
                screenshots.forEach((shot, index) => {
                    setTimeout(() => {
                        const aImg = document.createElement('a');
                        aImg.href = shot.dataUrl;
                        aImg.download = `${prefix}_screenshots/shot_${index + 1}.png`;
                        document.body.appendChild(aImg);
                        aImg.click();
                        document.body.removeChild(aImg);
                    }, 600 + index * 300);
                });
            }

            termLog(`LOCAL SAVE: Record files (video, ${screenshots ? screenshots.length : 0} screenshot(s), and log) exported to record folder.`, 'success');
        } catch (err) {
            console.error('Failed to export session files:', err);
        }
    }

    window.exportRecordAsZip = async function (rec) {
        if (!rec) return;

        if (!window.JSZip) {
            alert('JSZip library is loading. Please try again.');
            return;
        }

        let fullRec = rec;
        if (rec.id) {
            try {
                const db = await openDatabase();
                const dbRec = await new Promise((resolve) => {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const req = store.get(rec.id);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
                if (dbRec) fullRec = dbRec;
            } catch (err) {
                console.log('IndexedDB fetch error during ZIP export:', err);
            }
        }

        try {
            const zip = new JSZip();
            const sanitize = (str) => (str || 'Identify').replace(/[^a-zA-Z0-9_-]/g, '_');
            const folderName = sanitize(fullRec.sessionName || 'Identify');

            const sessionFolder = zip.folder(folderName);

            // 1. Session Attribute Log JSON
            const logData = {
                sessionName: fullRec.sessionName,
                timestamp: `${fullRec.year}-${String(fullRec.month).padStart(2, '0')}-${String(fullRec.day).padStart(2, '0')} ${String(fullRec.hour).padStart(2, '0')}:${String(fullRec.minute).padStart(2, '0')}:${String(fullRec.second).padStart(2, '0')}`,
                duration: fullRec.durationFormatted,
                cameraName: fullRec.cameraName,
                printerName: fullRec.printerName,
                modelName: fullRec.modelName,
                peakVram: `${fullRec.peakVram || 0} GB`,
                totalDefects: fullRec.totalDefects,
                defectCounts: fullRec.defectCounts,
                defectsDetected: fullRec.defectsDetected
            };
            sessionFolder.file(`${folderName}_log.json`, JSON.stringify(logData, null, 2));

            // 2. Video file
            if (fullRec.videoBlob && fullRec.videoBlob.size > 0) {
                sessionFolder.file(`${folderName}_video.webm`, fullRec.videoBlob);
            }

            // 3. Screenshots folder
            const shots = fullRec.screenshots || [];
            if (shots.length > 0) {
                const shotsFolder = sessionFolder.folder("screenshots");
                shots.forEach((shot, index) => {
                    if (shot.dataUrl) {
                        const base64Data = shot.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                        shotsFolder.file(`shot_${index + 1}.png`, base64Data, { base64: true });
                    }
                });
            }

            // Generate ZIP blob and download
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = zipUrl;
            a.download = `${folderName}_package.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);

            termLog(`ZIP EXPORT: ${folderName}_package.zip created & downloaded successfully!`, 'success');
        } catch (err) {
            console.error('Failed to create ZIP package:', err);
            termLog(`ZIP ERROR: ${err.message}`, 'error');
        }
    };

    window.deleteRecordFromDB = async function (id) {
        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.error('Failed to delete from IndexedDB:', err);
        }
    };

    async function getAllRecordsFromDB() {
        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        } catch (err) {
            console.error('Failed to fetch from IndexedDB:', err);
            return [];
        }
    }

    window.AegisDB = { openDatabase, saveRecordToDB, getAllRecordsFromDB };

    // ─── Identification Session Controller (Start, Pause, Stop) ──
    const sessionNameInput = document.getElementById('session-name-input');
    const recStatusDot = document.getElementById('rec-status-dot');
    const recTimerDisplay = document.getElementById('rec-timer-display');
    const sessionStartBtn = document.getElementById('session-start-btn');
    const sessionPauseBtn = document.getElementById('session-pause-btn');
    const sessionStopBtn = document.getElementById('session-stop-btn');


    // Auto-number default session name on page load (Identify-0, Identify-1, ...)
    async function updateDefaultSessionName() {
        if (!sessionNameInput) return;
        const records = await getAllRecordsFromDB();
        sessionNameInput.value = `Identify-${records.length}`;
    }
    updateDefaultSessionName();

    function formatTimeDisplay(totalSec) {
        const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    function updateRecUI() {
        if (!recStatusDot || !sessionStartBtn || !sessionPauseBtn || !sessionStopBtn) return;

        const recBadge = document.getElementById('rec-badge');

        if (recState === 'RECORDING') {
            recStatusDot.className = 'w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_6px_rgba(255,68,68,0.8)]';
            if (recBadge) {
                recBadge.classList.remove('hidden');
                recBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span> REC';
            }
            sessionStartBtn.disabled = true;
            sessionStartBtn.className = 'flex-1 bg-surface-container opacity-50 text-on-surface-variant border border-outline-variant/30 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-not-allowed';

            sessionPauseBtn.disabled = false;
            sessionPauseBtn.className = 'flex-1 bg-[#ffb74d]/20 hover:bg-[#ffb74d]/30 text-[#ffb74d] border border-[#ffb74d]/40 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            sessionPauseBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">pause</span>Pause';

            sessionStopBtn.disabled = false;
            sessionStopBtn.className = 'flex-1 bg-error/20 hover:bg-error/30 text-error border border-error/40 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        } else if (recState === 'PAUSED') {
            recStatusDot.className = 'w-2 h-2 rounded-full bg-[#ffb74d] shadow-[0_0_6px_rgba(255,183,77,0.8)]';
            if (recBadge) {
                recBadge.classList.remove('hidden');
                recBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#ffea00]"></span> PAUSED';
            }
            sessionPauseBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">play_arrow</span>Resume';
        } else {
            // IDLE
            recStatusDot.className = 'w-2 h-2 rounded-full bg-outline';
            if (recBadge) {
                recBadge.classList.remove('hidden');
                recBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#ff8c00]"></span> READY';
            }
            if (settingsConfirmed) {
                sessionStartBtn.disabled = false;
                sessionStartBtn.className = 'flex-1 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/40 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            } else {
                sessionStartBtn.disabled = true;
                sessionStartBtn.className = 'flex-1 bg-surface-container opacity-50 text-on-surface-variant border border-outline-variant/30 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-not-allowed';
            }

            sessionPauseBtn.disabled = true;
            sessionPauseBtn.className = 'flex-1 bg-surface-container opacity-50 text-on-surface-variant border border-outline-variant/30 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-not-allowed';
            sessionPauseBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">pause</span>Pause';

            sessionStopBtn.disabled = true;
            sessionStopBtn.className = 'flex-1 bg-surface-container opacity-50 text-on-surface-variant border border-outline-variant/30 font-label-mono text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-not-allowed';
        }
    }

    if (sessionStartBtn) {
        sessionStartBtn.addEventListener('click', () => {
            const sessionName = sessionNameInput ? sessionNameInput.value.trim() || 'Identify-0' : 'Identify-0';
            recState = 'RECORDING';
            recElapsedSeconds = 0;
            sessionPeakVram = window.aegisSystemState.vramUsage || 0;
            sessionDefectCounts = { 'Layer Shift': 0, 'Warping': 0, 'Stringing': 0, 'Over-extrusion': 0 };
            currentSessionScreenshots = [];

            // Capture thumbnail
            sessionThumbnail = '';
            if (cameraVideo && !cameraVideo.classList.contains('hidden') && activeCameraStream) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = cameraVideo.videoWidth || 640;
                    canvas.height = cameraVideo.videoHeight || 480;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
                    sessionThumbnail = canvas.toDataURL('image/jpeg', 0.7);
                } catch (err) {
                    console.log('Failed to capture session thumbnail', err);
                }
            }

            if (recInterval) clearInterval(recInterval);
            recInterval = setInterval(() => {
                if (recState === 'RECORDING') {
                    recElapsedSeconds++;
                    if (recTimerDisplay) recTimerDisplay.textContent = formatTimeDisplay(recElapsedSeconds);

                    if (window.aegisSystemState.vramUsage > sessionPeakVram) {
                        sessionPeakVram = window.aegisSystemState.vramUsage;
                    }

                    // Simulate defect detection occurrence during active recording session
                    if (Math.random() < 0.25 && window.aegisSystemState.modelOnline) {
                        const defects = ['Layer Shift', 'Warping', 'Stringing', 'Over-extrusion'];
                        const defect = defects[Math.floor(Math.random() * defects.length)];
                        sessionDefectCounts[defect] = (sessionDefectCounts[defect] || 0) + 1;
                    }
                }
            }, 1000);

            // Start MediaRecorder with composite stream (Camera Video + Detection Overlay)
            if (activeCameraStream) {
                try {
                    recordedChunks = [];
                    recordCanvas.width = cameraVideo ? (cameraVideo.videoWidth || 640) : 640;
                    recordCanvas.height = cameraVideo ? (cameraVideo.videoHeight || 480) : 480;

                    if (cameraVideo && !cameraVideo.classList.contains('hidden')) {
                        recordCtx.drawImage(cameraVideo, 0, 0, recordCanvas.width, recordCanvas.height);
                        if (detectionCanvas && !detectionCanvas.classList.contains('hidden') && detectionCanvas.width > 0) {
                            recordCtx.drawImage(detectionCanvas, 0, 0, recordCanvas.width, recordCanvas.height);
                        }
                    }

                    const compositeStream = recordCanvas.captureStream(30);
                    mediaRecorder = new MediaRecorder(compositeStream, { mimeType: 'video/webm' });
                    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                    mediaRecorder.start(1000);

                    if (recordAnimFrame) cancelAnimationFrame(recordAnimFrame);
                    recordCompositeLoop();
                } catch (e) {
                    console.log('Composite MediaRecorder error, falling back to raw stream:', e);
                    try {
                        recordedChunks = [];
                        mediaRecorder = new MediaRecorder(activeCameraStream);
                        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                        mediaRecorder.start(1000);
                    } catch (err) {
                        console.log('MediaRecorder fallback error:', err);
                    }
                }
            }

            updateRecUI();
            termLog(`SESSION: Started identification recording for "${sessionName}".`, 'success');
        });
    }

    if (sessionPauseBtn) {
        sessionPauseBtn.addEventListener('click', () => {
            const sessionName = sessionNameInput ? sessionNameInput.value.trim() : 'Identify';
            if (recState === 'RECORDING') {
                recState = 'PAUSED';
                if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();
                termLog(`SESSION: Recording paused for "${sessionName}".`, 'warning');
            } else if (recState === 'PAUSED') {
                recState = 'RECORDING';
                if (mediaRecorder && mediaRecorder.state === 'paused') mediaRecorder.resume();
                termLog(`SESSION: Recording resumed for "${sessionName}".`, 'success');
            }
            updateRecUI();
        });
    }

    if (sessionStopBtn) {
        sessionStopBtn.addEventListener('click', async () => {
            if (recInterval) {
                clearInterval(recInterval);
                recInterval = null;
            }

            if (recordAnimFrame) {
                cancelAnimationFrame(recordAnimFrame);
                recordAnimFrame = null;
            }

            const finalizeAndSave = async () => {
                const sessionName = sessionNameInput ? sessionNameInput.value.trim() || 'Identify-0' : 'Identify-0';
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1;
                const day = now.getDate();
                const hour = now.getHours();
                const minute = now.getMinutes();
                const second = now.getSeconds();

                const cameraName = (cameraSelect && cameraSelect.selectedIndex > 0) ? cameraSelect.options[cameraSelect.selectedIndex].textContent : 'CAM-01 (Default)';
                const printerName = (printerSelect && printerSelect.selectedIndex > 0) ? printerSelect.options[printerSelect.selectedIndex].textContent : 'Standard Printer';
                const modelName = window.aegisSystemState.loadedModelName || 'None';

                const activeDefects = Object.entries(sessionDefectCounts).filter(([_, cnt]) => cnt > 0);
                const defectsDetected = activeDefects.map(([d, _]) => d);
                const totalDefects = activeDefects.reduce((acc, [_, cnt]) => acc + cnt, 0);

                let videoBlob = null;
                if (recordedChunks && recordedChunks.length > 0) {
                    try {
                        videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                    } catch (err) {
                        console.log('Failed to generate video Blob:', err);
                    }
                }

                const record = {
                    sessionName,
                    year, month, day, hour, minute, second,
                    durationSeconds: recElapsedSeconds,
                    durationFormatted: formatTimeDisplay(recElapsedSeconds),
                    cameraName,
                    printerName,
                    modelName,
                    defectsDetected,
                    defectCounts: sessionDefectCounts,
                    totalDefects,
                    peakVram: sessionPeakVram,
                    thumbnail: sessionThumbnail,
                    videoBlob: videoBlob,
                    screenshots: [...currentSessionScreenshots],
                    createdAt: Date.now()
                };

                // Save to IndexedDB database
                const savedId = await saveRecordToDB(record);
                if (savedId) record.id = savedId;

                const defectSummaryStr = activeDefects.length > 0
                    ? activeDefects.map(([d, c]) => `${d} (${c}x)`).join(', ')
                    : 'None (Pass)';

                termLog('═══════════════════════════════════════════');
                termLog(`SESSION: Identification "${sessionName}" finished & saved to DB!`, 'success');
                termLog(`  → Time:     ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
                termLog(`  → Duration: ${record.durationFormatted}`);
                termLog(`  → Camera:   ${cameraName}`);
                termLog(`  → Printer:  ${printerName}`);
                termLog(`  → Defects:  ${defectSummaryStr}`);
                termLog('═══════════════════════════════════════════');


                // Reset timer & auto-increment session name to next default
                recElapsedSeconds = 0;
                if (recTimerDisplay) recTimerDisplay.textContent = '00:00:00';
                updateDefaultSessionName();
            };

            recState = 'IDLE';
            updateRecUI();

            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = () => {
                    finalizeAndSave();
                };
                mediaRecorder.stop();
            } else {
                finalizeAndSave();
            }
        });
    }

    // ─── Lightbox / Image Preview Modal ────────────
    let lightboxEl = null;
    let lightboxZoom = 1;

    function createLightbox() {
        if (lightboxEl) return;

        lightboxEl = document.createElement('div');
        lightboxEl.id = 'lightbox-modal';
        lightboxEl.className = 'lightbox-overlay';
        lightboxEl.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-container">
                <div class="lightbox-header">
                    <span id="lightbox-title" class="font-label-mono text-[11px] text-on-surface-variant tracking-wider"></span>
                    <div class="flex items-center gap-1">
                        <button id="lightbox-zoom-in" class="lightbox-btn" title="Zoom In">
                            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
                        </button>
                        <button id="lightbox-zoom-out" class="lightbox-btn" title="Zoom Out">
                            <span class="material-symbols-outlined text-[18px]">zoom_out</span>
                        </button>
                        <button id="lightbox-zoom-reset" class="lightbox-btn" title="Reset Zoom">
                            <span class="material-symbols-outlined text-[18px]">fit_screen</span>
                        </button>
                        <a id="lightbox-download" class="lightbox-btn" title="Download" download="">
                            <span class="material-symbols-outlined text-[18px]">download</span>
                        </a>
                        <button id="lightbox-close" class="lightbox-btn lightbox-btn-close" title="Close">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>
                <div class="lightbox-body">
                    <img id="lightbox-img" src="" alt="Preview" draggable="false">
                </div>
                <div class="lightbox-footer">
                    <span id="lightbox-zoom-level" class="font-label-mono text-[10px] text-on-surface-variant tracking-wider">100%</span>
                </div>
            </div>
        `;

        document.body.appendChild(lightboxEl);

        // Event listeners
        lightboxEl.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
        lightboxEl.querySelector('#lightbox-close').addEventListener('click', closeLightbox);
        lightboxEl.querySelector('#lightbox-zoom-in').addEventListener('click', () => setLightboxZoom(lightboxZoom + 0.25));
        lightboxEl.querySelector('#lightbox-zoom-out').addEventListener('click', () => setLightboxZoom(lightboxZoom - 0.25));
        lightboxEl.querySelector('#lightbox-zoom-reset').addEventListener('click', () => setLightboxZoom(1));

        // Mouse wheel zoom
        lightboxEl.querySelector('.lightbox-body').addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setLightboxZoom(lightboxZoom + delta);
        });
    }

    function openLightbox(imgSrc, captureNum, timeStr) {
        createLightbox();
        lightboxZoom = 1;

        const img = lightboxEl.querySelector('#lightbox-img');
        img.src = imgSrc;
        img.style.transform = 'scale(1)';

        lightboxEl.querySelector('#lightbox-title').textContent = `CAPTURE #${captureNum} — ${timeStr}`;
        lightboxEl.querySelector('#lightbox-zoom-level').textContent = '100%';

        const downloadLink = lightboxEl.querySelector('#lightbox-download');
        downloadLink.href = imgSrc;
        downloadLink.download = `aegis_capture_${captureNum}.png`;

        lightboxEl.classList.add('open');
    }

    function closeLightbox() {
        if (lightboxEl) {
            lightboxEl.classList.remove('open');
        }
    }

    function setLightboxZoom(newZoom) {
        lightboxZoom = Math.max(0.25, Math.min(5, newZoom));
        const img = lightboxEl.querySelector('#lightbox-img');
        img.style.transform = `scale(${lightboxZoom})`;
        lightboxEl.querySelector('#lightbox-zoom-level').textContent = `${Math.round(lightboxZoom * 100)}%`;
    }

    // Expose globally for capture items
    window.openLightbox = openLightbox;

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    // ─── Detection History Database Rendering ───────
    async function renderHistoryRecords() {
        const historyRecordsCount = document.getElementById('history-records-count');
        const historyGridContainer = document.getElementById('history-grid-container');
        if (!historyGridContainer) return;

        const records = await getAllRecordsFromDB();

        // Populate filters with unique attributes
        const filterCamera = document.getElementById('filter-camera');
        const filterPrinter = document.getElementById('filter-printer');
        const filterModel = document.getElementById('filter-model');

        if (filterCamera && filterPrinter && filterModel) {
            const cameras = new Set();
            const printers = new Set();
            const models = new Set();
            records.forEach(r => {
                if (r.cameraName) cameras.add(r.cameraName);
                if (r.printerName) printers.add(r.printerName);
                if (r.modelName) models.add(r.modelName);
            });

            const popSelect = (el, set, defaultText) => {
                const currentVal = el.value;
                el.innerHTML = `<option value="">${defaultText}</option>` +
                    Array.from(set).map(i => `<option value="${i}">${i}</option>`).join('');
                if (set.has(currentVal)) {
                    el.value = currentVal;
                }
            };

            popSelect(filterCamera, cameras, 'All Cameras');
            popSelect(filterPrinter, printers, 'All Printers');
            popSelect(filterModel, models, 'All Models');
        }

        const dateVal = document.getElementById('filter-date')?.value || '';
        const cameraVal = filterCamera?.value || '';
        const printerVal = filterPrinter?.value || '';
        const modelVal = filterModel?.value || '';
        const vramVal = document.getElementById('filter-vram')?.value || '';

        let filteredRecords = records;

        if (dateVal) {
            const [y, m, d] = dateVal.split('/');
            filteredRecords = filteredRecords.filter(r =>
                String(r.year) === y &&
                String(r.month).padStart(2, '0') === m &&
                String(r.day).padStart(2, '0') === d
            );
        }
        if (cameraVal) filteredRecords = filteredRecords.filter(r => r.cameraName === cameraVal);
        if (printerVal) filteredRecords = filteredRecords.filter(r => r.printerName === printerVal);
        if (modelVal) filteredRecords = filteredRecords.filter(r => r.modelName === modelVal);
        if (vramVal) {
            const v = parseInt(vramVal, 10);
            filteredRecords = filteredRecords.filter(r => (r.peakVram || 0) > v);
        }

        if (historyRecordsCount) {
            historyRecordsCount.textContent = `Detection Log (${filteredRecords.length} DB Records)`;
        }



        if (filteredRecords.length === 0) {
            historyGridContainer.innerHTML = '';
            const pageContainer = document.getElementById('history-pagination-container');
            if (pageContainer) pageContainer.classList.add('hidden');
            return;
        }

        const reversedRecords = filteredRecords.slice().reverse();
        const PAGE_SIZE = 12;
        const totalPages = Math.ceil(reversedRecords.length / PAGE_SIZE);

        if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
        if (historyCurrentPage < 1) historyCurrentPage = 1;

        const startIndex = (historyCurrentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, reversedRecords.length);
        const pageRecords = reversedRecords.slice(startIndex, endIndex);

        // Update Pagination UI
        const pageContainer = document.getElementById('history-pagination-container');
        const pageInfo = document.getElementById('history-pagination-info');
        const pageBtns = document.getElementById('history-pagination-buttons');

        if (pageContainer && pageInfo && pageBtns) {
            if (totalPages <= 1) {
                pageContainer.classList.add('hidden');
            } else {
                pageContainer.classList.remove('hidden');
                pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${reversedRecords.length}`;

                let btnsHtml = '';
                btnsHtml += `<button onclick="window.setHistoryPage(${historyCurrentPage - 1})" class="w-8 h-8 rounded bg-surface-dim border border-outline-variant flex items-center justify-center text-outline hover:text-on-surface transition-colors disabled:opacity-50" ${historyCurrentPage === 1 ? 'disabled' : ''}><span class="material-symbols-outlined text-[16px]">chevron_left</span></button>`;

                for (let i = 1; i <= totalPages; i++) {
                    if (i === historyCurrentPage) {
                        btnsHtml += `<button class="w-8 h-8 rounded bg-primary text-on-primary-fixed flex items-center justify-center font-label-mono text-[12px]">${i}</button>`;
                    } else {
                        btnsHtml += `<button onclick="window.setHistoryPage(${i})" class="w-8 h-8 rounded bg-surface-dim border border-outline-variant flex items-center justify-center text-outline hover:text-on-surface transition-colors font-label-mono text-[12px]">${i}</button>`;
                    }
                }

                btnsHtml += `<button onclick="window.setHistoryPage(${historyCurrentPage + 1})" class="w-8 h-8 rounded bg-surface-dim border border-outline-variant flex items-center justify-center text-outline hover:text-on-surface transition-colors disabled:opacity-50" ${historyCurrentPage === totalPages ? 'disabled' : ''}><span class="material-symbols-outlined text-[16px]">chevron_right</span></button>`;

                pageBtns.innerHTML = btnsHtml;
            }
        }

        // Render DB records
        let dbCardsHtml = pageRecords.map(rec => {
            const timeStr = `${rec.year}-${String(rec.month).padStart(2, '0')}-${String(rec.day).padStart(2, '0')} ${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}:${String(rec.second).padStart(2, '0')}`;
            const activeDefects = Object.entries(rec.defectCounts || {}).filter(([_, c]) => c > 0);
            const recJson = encodeURIComponent(JSON.stringify(rec));

            if (historyViewMode === 'list') {
                // List view row
                const statusBadge = activeDefects.length > 0
                    ? `<span class="bg-error/20 text-error border border-error/30 font-label-mono text-[10px] px-2 py-0.5 rounded">Flagged</span>`
                    : `<span class="bg-secondary/20 text-secondary border border-secondary/30 font-label-mono text-[10px] px-2 py-0.5 rounded">Clean</span>`;
                return `
                    <div class="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/30 hover:border-primary cursor-pointer transition-all bg-surface-dim/50 hover:bg-surface-container/50" onclick="window.populatePreviewPanel(decodeURIComponent('${recJson}'))">
                        <div class="w-16 h-12 rounded overflow-hidden shrink-0 bg-surface-container">
                            ${rec.thumbnail ? `<img class="w-full h-full object-cover" src="${rec.thumbnail}" alt="Thumb">` : `<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-outline-variant text-xl">image_not_supported</span></div>`}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-label-mono text-[12px] text-primary font-bold truncate">${rec.sessionName}</span>
                                ${statusBadge}
                            </div>
                            <div class="font-label-mono text-[10px] text-outline mt-0.5">${timeStr} · ${rec.durationFormatted}</div>
                        </div>
                        <div class="shrink-0 text-right space-y-0.5">
                            <div class="font-label-mono text-[10px] text-on-surface-variant flex items-center gap-1 justify-end"><span class="material-symbols-outlined text-[12px] text-primary">videocam</span>${rec.cameraName}</div>
                            <div class="font-label-mono text-[10px] text-on-surface-variant flex items-center gap-1 justify-end"><span class="material-symbols-outlined text-[12px] text-secondary">print</span>${rec.printerName}</div>
                        </div>
                        <div class="shrink-0 text-right">
                            <div class="font-label-mono text-[10px] text-on-surface-variant/70">VRAM: ${rec.peakVram || 0}GB</div>
                            <div class="font-label-mono text-[10px] text-on-surface-variant/70">${rec.modelName}</div>
                        </div>
                    </div>
                `;
            } else {
                // Grid view card (original)
                const thumbnailHtml = rec.thumbnail
                    ? `<div class="bg-surface-dim relative overflow-hidden h-24 border-b border-outline-variant/20">
                         <img class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" src="${rec.thumbnail}" alt="Thumbnail">
                       </div>`
                    : `<div class="bg-surface-dim relative overflow-hidden flex items-center justify-center h-24 border-b border-outline-variant/20">
                         <span class="material-symbols-outlined text-outline-variant text-4xl">image_not_supported</span>
                         <div class="absolute top-2 right-2 bg-surface-container-highest text-on-surface-variant font-label-mono text-[10px] px-2 py-0.5 rounded shadow-sm">No Video</div>
                       </div>`;

                return `
                    <div class="data-card rounded-lg overflow-hidden group cursor-pointer relative hover:border-primary transition-all border border-outline-variant/30" onclick="window.populatePreviewPanel(decodeURIComponent('${recJson}'))">
                        ${thumbnailHtml}
                        <div class="bg-surface-dim p-3 flex justify-between items-center">
                            <span class="font-label-mono text-label-mono text-primary font-bold">${rec.sessionName}</span>
                        </div>
                        <div class="p-3 pt-0 space-y-2">
                            <div class="flex justify-between items-center text-[10px] font-label-mono text-outline">
                                <span>${timeStr}</span>
                                <span class="text-primary font-semibold">Duration: ${rec.durationFormatted}</span>
                            </div>
                            <div class="font-label-mono text-[11px] text-on-surface-variant flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px] text-primary">videocam</span> ${rec.cameraName}
                            </div>
                            <div class="font-label-mono text-[11px] text-on-surface-variant flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px] text-secondary">print</span> ${rec.printerName}
                            </div>
                            <div class="font-label-mono text-[10px] text-on-surface-variant/70 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px] text-tertiary">model_training</span> Model: ${rec.modelName} | Peak VRAM: ${rec.peakVram || 0}GB
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        // Add invisible placeholder cards to maintain grid size if in grid mode
        if (historyViewMode === 'grid' && pageRecords.length < PAGE_SIZE) {
            const emptySlots = PAGE_SIZE - pageRecords.length;
            for (let i = 0; i < emptySlots; i++) {
                dbCardsHtml += '<div class="glass-panel p-0 rounded-xl overflow-hidden opacity-0 pointer-events-none border border-transparent h-full min-h-[16rem]"></div>';
            }
        }

        // Update grid container classes based on view mode
        if (historyViewMode === 'list') {
            historyGridContainer.className = 'flex flex-col gap-2 content-start';
        } else {
            historyGridContainer.className = 'grid grid-cols-2 lg:grid-cols-3 gap-4 content-start';
        }

        historyGridContainer.innerHTML = dbCardsHtml;
    }

    window.setHistoryPage = function (page) {
        historyCurrentPage = page;
        renderHistoryRecords();
    };

    // View toggle buttons
    const viewListBtn = document.getElementById('view-list-btn');
    const viewGridBtn = document.getElementById('view-grid-btn');
    if (viewListBtn && viewGridBtn) {
        viewListBtn.addEventListener('click', () => {
            historyViewMode = 'list';
            viewListBtn.classList.add('text-primary');
            viewListBtn.classList.remove('text-outline');
            viewGridBtn.classList.remove('text-primary');
            viewGridBtn.classList.add('text-outline');
            renderHistoryRecords();
        });
        viewGridBtn.addEventListener('click', () => {
            historyViewMode = 'grid';
            viewGridBtn.classList.add('text-primary');
            viewGridBtn.classList.remove('text-outline');
            viewListBtn.classList.remove('text-primary');
            viewListBtn.classList.add('text-outline');
            renderHistoryRecords();
        });
    }

    const filters = ['filter-date', 'filter-camera', 'filter-printer', 'filter-model', 'filter-vram'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
            historyCurrentPage = 1;
            renderHistoryRecords();
        });
    });

    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            filters.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'filter-date' && el._flatpickr) el._flatpickr.clear();
                    else el.value = '';
                }
            });
            historyCurrentPage = 1;
            renderHistoryRecords();
        });
    }

    renderHistoryRecords();
    if (window.flatpickr) {
        const fp = window.flatpickr('#filter-date', {
            dateFormat: 'Y/m/d',
            minDate: '2026-01-01',
            maxDate: '2099-12-31',
            onChange: function (selectedDates, dateStr, instance) {
                renderHistoryRecords();
            }
        });
        const dateEl = document.getElementById('filter-date');
        if (dateEl) dateEl._flatpickr = fp;
    }

    window.addEventListener('spa:view-loaded', (e) => {
        if (e.detail.viewId === 'view-history') {
            renderHistoryRecords();
        }
    });


    // Export preview panel function
    window.populatePreviewPanel = function (jsonStr) {
        try {
            const rec = JSON.parse(jsonStr);
            const detailPanel = document.getElementById('history-detail-panel');
            const emptyPanel = document.getElementById('history-empty-panel');
            if (!detailPanel || !emptyPanel) return;

            // Hide empty, show detail
            emptyPanel.classList.add('hidden');
            detailPanel.classList.remove('hidden');

            const timeStr = `${rec.year}-${String(rec.month).padStart(2, '0')}-${String(rec.day).padStart(2, '0')} ${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}:${String(rec.second).padStart(2, '0')}`;

            // Populate Image
            const imgEl = document.getElementById('detail-image');
            if (imgEl) {
                if (rec.thumbnail) {
                    imgEl.src = rec.thumbnail;
                    imgEl.classList.remove('hidden');
                } else {
                    imgEl.classList.add('hidden');
                }
            }

            // Populate Meta
            const tsEl = document.getElementById('detail-timestamp');
            if (tsEl) tsEl.textContent = timeStr;
            const srcEl = document.getElementById('detail-source');
            if (srcEl) srcEl.textContent = rec.cameraName;
            const durEl = document.getElementById('detail-duration');
            if (durEl) durEl.textContent = rec.durationFormatted;
            const peakEl = document.getElementById('detail-peak-vram');
            if (peakEl) peakEl.textContent = `${rec.peakVram || 0}GB`;

            // Status & Defects
            const statusEl = document.getElementById('detail-status');
            const defectsList = document.getElementById('detail-defects-list');
            const activeDefects = Object.entries(rec.defectCounts || {}).filter(([_, c]) => c > 0);

            if (statusEl) {
                if (activeDefects.length > 0) {
                    statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span> Flagged (${rec.totalDefects} defects)`;
                    statusEl.className = 'font-label-mono text-[13px] text-error flex items-center gap-1';
                } else {
                    statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> Clean`;
                    statusEl.className = 'font-label-mono text-[13px] text-secondary flex items-center gap-1';
                }
            }

            if (defectsList) {
                if (activeDefects.length > 0) {
                    defectsList.innerHTML = activeDefects.map(([d, c]) => `
                        <div>
                            <div class="flex justify-between font-label-mono text-[11px] mb-1">
                                <span class="text-error">${d}</span>
                                <span class="text-on-surface-variant">${c} instances</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    defectsList.innerHTML = `
                        <div>
                            <div class="flex justify-between font-label-mono text-[11px] mb-1">
                                <span class="text-secondary">No defects detected</span>
                                <span class="text-on-surface-variant">0 instances</span>
                            </div>
                        </div>
                    `;
                }
            }
            // Store selected record for View full record
            selectedRecord = rec;

            // Setup View full record Button
            const viewBtn = document.getElementById('view-full-record-btn');
            if (viewBtn) {
                viewBtn.onclick = () => {
                    if (selectedRecord) {
                        localStorage.setItem('aegis_view_record', JSON.stringify(selectedRecord));
                        if (window.spaLoadRoute) window.spaLoadRoute('record_detail.html');
                    }
                };
            }

            // Setup Download Button in Detail Header
            const headerActions = document.getElementById('detail-header-actions');
            if (headerActions) headerActions.classList.remove('hidden');

            const dlBtn = document.getElementById('detail-download-btn');
            if (dlBtn) {
                dlBtn.onclick = () => {
                    window.exportRecordAsZip(rec);
                };
            }

            // Setup Delete Button
            const delBtn = document.getElementById('delete-record-btn');
            if (delBtn) {
                delBtn.onclick = async () => {
                    if (confirm('Are you sure you want to delete this record?')) {
                        await window.deleteRecordFromDB(rec.id);
                        emptyPanel.classList.remove('hidden');
                        detailPanel.classList.add('hidden');
                        if (headerActions) headerActions.classList.add('hidden');
                        selectedRecord = null;
                        renderHistoryRecords();
                    }
                };
            }
        } catch (e) {
            console.error('Error parsing record JSON:', e);
        }
    };

    // ─── Page Fade-in ──────────────────────────────
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.add('page-fade-in');
    }
});


window.initRecordDetailView = async () => {
    // Back buttons
    document.getElementById('back-btn')?.addEventListener('click', () => {
        document.getElementById('nav-history').click();
    });
    document.getElementById('rd-back-btn')?.addEventListener('click', () => {
        document.getElementById('nav-history').click();
    });

    const rawData = localStorage.getItem('aegis_view_record');
    if (!rawData) {
        document.getElementById('rd-no-record')?.classList.remove('hidden');
        document.getElementById('rd-content')?.classList.add('hidden');
        return;
    }

    let rec = JSON.parse(rawData);

    // Fetch full record (with videoBlob & screenshots) from IndexedDB if available
    try {
        const DB_NAME = 'AegisVisionDB';
        const STORE_NAME = 'identifications';
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => reject(null);
        });

        if (db && rec.id) {
            const dbRec = await new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(rec.id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
            if (dbRec) rec = dbRec;
        }
    } catch (e) {
        console.log('IDB fetch fallback:', e);
    }

    try {
        const timeStr = `${rec.year}-${String(rec.month).padStart(2, '0')}-${String(rec.day).padStart(2, '0')} ${String(rec.hour).padStart(2, '0')}:${String(rec.minute).padStart(2, '0')}:${String(rec.second).padStart(2, '0')}`;

        // Helper for setting text
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

        // Header
        setText('rd-header-title', rec.sessionName || 'Record Detail');
        setText('rd-session-name', rec.sessionName || '--');
        setText('rd-session-time', timeStr);

        // Video & Media Player Setup
        const videoEl = document.getElementById('rd-video');
        const thumbEl = document.getElementById('rd-thumbnail');
        const noMediaEl = document.getElementById('rd-no-media');
        const tabVideoBtn = document.getElementById('rd-tab-video-btn');
        const tabThumbBtn = document.getElementById('rd-tab-thumb-btn');

        let videoAvailable = false;
        let thumbAvailable = false;

        if (rec.videoBlob && rec.videoBlob.size > 0) {
            videoEl.src = URL.createObjectURL(rec.videoBlob);
            videoAvailable = true;
        }

        if (rec.thumbnail) {
            thumbEl.src = rec.thumbnail;
            thumbAvailable = true;
        }

        const showVideo = () => {
            if (videoAvailable) {
                videoEl.classList.remove('hidden');
                thumbEl.classList.add('hidden');
                noMediaEl.classList.add('hidden');
                tabVideoBtn.className = 'px-3 py-1 rounded bg-primary/20 text-primary border border-primary/30';
                tabThumbBtn.className = 'px-3 py-1 rounded bg-surface-dim text-outline hover:text-on-surface';
            }
        };

        const showThumb = () => {
            if (thumbAvailable) {
                thumbEl.classList.remove('hidden');
                videoEl.classList.add('hidden');
                noMediaEl.classList.add('hidden');
                tabThumbBtn.className = 'px-3 py-1 rounded bg-primary/20 text-primary border border-primary/30';
                tabVideoBtn.className = 'px-3 py-1 rounded bg-surface-dim text-outline hover:text-on-surface';
            }
        };

        tabVideoBtn.addEventListener('click', showVideo);
        tabThumbBtn.addEventListener('click', showThumb);

        if (videoAvailable) {
            showVideo();
        } else if (thumbAvailable) {
            showThumb();
        } else {
            noMediaEl.classList.remove('hidden');
        }

        // Screenshots Gallery Setup
        const screenshotsGrid = document.getElementById('rd-screenshots-grid');
        const screenshotCount = document.getElementById('rd-screenshot-count');
        const shots = rec.screenshots || [];

        if (screenshotCount) screenshotCount.textContent = shots.length;

        if (screenshotsGrid) {
            if (shots.length === 0) {
                screenshotsGrid.innerHTML = `
                    <div class="flex items-center justify-center w-full text-outline-variant/60 font-label-mono text-[12px] gap-2">
                        <span class="material-symbols-outlined text-[18px]">photo_camera_off</span> No screenshots taken during this session
                    </div>
                `;
            } else {
                screenshotsGrid.innerHTML = shots.map((shot, idx) => `
                    <div class="relative rounded-lg overflow-hidden border border-outline-variant/30 group cursor-pointer shrink-0 h-32 w-52 bg-black/60 shadow hover:border-primary transition-all">
                        <img src="${shot.dataUrl}" alt="Screenshot ${idx + 1}" class="w-full h-full object-cover">
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <div class="flex items-center justify-between font-label-mono text-[9px]">
                                <span class="text-on-surface/90 font-bold">#${idx + 1}</span>
                                <span class="text-primary">${shot.timeStr || ''}</span>
                            </div>
                        </div>
                        <a href="${shot.dataUrl}" download="screenshot_${idx + 1}.png" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1 text-on-surface hover:text-primary">
                            <span class="material-symbols-outlined text-[13px]">download</span>
                        </a>
                    </div>
                `).join('');
            }
        }

        // Metadata Readout
        setHtml('rd-camera', `<span class="material-symbols-outlined text-[16px] text-primary">videocam</span> ${rec.cameraName || '--'}`);
        setHtml('rd-printer', `<span class="material-symbols-outlined text-[16px] text-secondary">print</span> ${rec.printerName || '--'}`);
        setHtml('rd-model', `<span class="material-symbols-outlined text-[16px] text-tertiary">model_training</span> ${rec.modelName || '--'}`);
        setHtml('rd-duration', `<span class="material-symbols-outlined text-[16px] text-primary">timer</span> ${rec.durationFormatted || '--'}`);
        setHtml('rd-vram', `<span class="material-symbols-outlined text-[16px] text-primary">memory</span> ${rec.peakVram || 0} GB`);
        setHtml('rd-total-defects', `<span class="material-symbols-outlined text-[16px] text-error">warning</span> ${rec.totalDefects || 0}`);

        // Status
        const activeDefects = Object.entries(rec.defectCounts || {}).filter(([_, c]) => c > 0);
        if (activeDefects.length > 0) {
            setHtml('rd-status', `<span class="w-2.5 h-2.5 rounded-full bg-error shadow-[0_0_8px_rgba(255,180,171,0.5)]"></span><span class="text-error font-semibold">Flagged</span><span class="text-outline text-[11px]">(${rec.totalDefects} total defects detected)</span>`);
        } else {
            setHtml('rd-status', `<span class="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.5)]"></span><span class="text-secondary font-semibold">Clean</span><span class="text-outline text-[11px]">(No defects detected)</span>`);
        }

        // Defects List
        const allDefects = Object.entries(rec.defectCounts || {});
        if (allDefects.length > 0) {
            setHtml('rd-defects-list', allDefects.map(([name, count]) => {
                const maxCount = Math.max(...Object.values(rec.defectCounts || {}), 1);
                const pct = Math.round((count / maxCount) * 100);
                const color = count > 0 ? 'error' : 'outline-variant';
                return `
                    <div>
                        <div class="flex justify-between font-label-mono text-[11px] mb-1">
                            <span class="text-${count > 0 ? 'error' : 'on-surface-variant'}">${name}</span>
                            <span class="text-on-surface-variant">${count} instances</span>
                        </div>
                        <div class="h-1.5 w-full bg-surface-dim rounded-full overflow-hidden">
                            <div class="h-full bg-${color} rounded-full transition-all duration-500" style="width: ${count > 0 ? pct : 0}%"></div>
                        </div>
                    </div>
                `;
            }).join(''));
        } else {
            setHtml('rd-defects-list', `<div class="font-label-mono text-[11px] text-secondary">No defect categories recorded.</div>`);
        }

        // Download ZIP Package Button
        document.getElementById('rd-download-btn')?.addEventListener('click', () => {
            if (window.exportRecordAsZip) {
                window.exportRecordAsZip(rec);
            }
        });

        // Delete button
        document.getElementById('rd-delete-btn')?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this record?')) {
                if (window.deleteRecordFromDB && rec.id) {
                    await window.deleteRecordFromDB(rec.id);
                }
                localStorage.removeItem('aegis_view_record');
                document.getElementById('nav-history').click();
            }
        });

    } catch (e) {
        console.error('Failed to render record detail:', e);
        document.getElementById('rd-no-record')?.classList.remove('hidden');
        document.getElementById('rd-content')?.classList.add('hidden');
    }
};


window.addEventListener('spa:view-loaded', (e) => {
    if (e.detail.viewId === 'view-record-detail') {
        if (typeof window.initRecordDetailView === 'function') {
            window.initRecordDetailView();
        }
    }
});

// --- Settings Live Interactivity Logic ---
// Dirty tracking for unsaved changes warning
window.aegisSettingsDirty = false;
window._aegisSettingsSnapshots = {};
window._aegisPendingNavUrl = null;

window.initSettingsUI = () => {
    const safeGet = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return el.type === 'checkbox' ? el.checked : el.value;
    };

    const safeSet = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = value === true || value === 'true';
        } else {
            el.value = value;
            el.dispatchEvent(new Event('input'));
        }
    };

    // ── Settings field IDs for each page ──
    const GENERAL_FIELDS = ['setting-language', 'setting-theme-toggle', 'setting-retention-days', 'setting-save-path', 'setting-auto-connect'];
    const CAMERA_FIELDS = ['cam-input-type', 'cam-rtsp-url', 'cam-flip', 'cam-mirror', 'cam-rotation', 'cam-brightness', 'cam-contrast', 'cam-saturation', 'cam-night-vision'];
    const MODEL_FIELDS = ['model-conf-thresh', 'model-nms-thresh', 'model-inference-engine', 'model-batch-size', 'model-max-fps', 'model-inference-interval'];
    const NOTIF_FIELDS = [
        'notif-cam-connected', 'notif-cam-disconnected',
        'notif-cam-failed', 'notif-cam-permission',
        'notif-model-loaded', 'notif-model-added', 'notif-model-detected',
        'notif-model-failed', 'notif-model-overloaded',
        'notif-session-state', 'notif-screenshot-saved',
        'notif-media-error',
        'notif-export-success', 'notif-export-failed',
        'notif-settings-saved', 'notif-settings-reverted', 'notif-printer-added', 'notif-roi-updated',
        'notif-settings-failed', 'notif-settings-invalid'
    ];
    const ALL_FIELDS = [...GENERAL_FIELDS, ...CAMERA_FIELDS, ...MODEL_FIELDS, ...NOTIF_FIELDS];

    // ── Factory Defaults / Revert ──
    const FACTORY_DEFAULTS = {
        'setting-language': 'en',
        'setting-theme-toggle': true, // Dark mode default
        'setting-retention-days': '30',
        'setting-save-path': './records',
        'setting-auto-connect': false,
        'cam-input-type': 'usb',
        'cam-rtsp-url': '',
        'cam-flip': false,
        'cam-mirror': false,
        'cam-rotation': '0',
        'cam-brightness': '100',
        'cam-contrast': '100',
        'cam-saturation': '100',
        'cam-night-vision': false,
        'model-conf-thresh': '60',
        'model-nms-thresh': '45',
        'model-inference-engine': 'cuda',
        'model-batch-size': '1',
        'model-max-fps': '30',
        'model-inference-interval': '0',
        'notif-cam-connected': true,
        'notif-cam-disconnected': true,
        'notif-cam-failed': true,
        'notif-cam-permission': true,
        'notif-model-loaded': true,
        'notif-model-added': true,
        'notif-model-detected': false,
        'notif-model-failed': true,
        'notif-model-overloaded': true,
        'notif-session-state': true,
        'notif-screenshot-saved': true,
        'notif-media-error': true,
        'notif-export-success': true,
        'notif-export-failed': true,
        'notif-settings-saved': true,
        'notif-settings-reverted': true,
        'notif-printer-added': true,
        'notif-roi-updated': true,
        'notif-settings-failed': true,
        'notif-settings-invalid': true
    };

    const takeSnapshot = () => {
        // No longer using snapshots, we use factory defaults for revert
        window.aegisSettingsDirty = false;
    };

    const revertToFactoryDefaults = () => {
        ALL_FIELDS.forEach(id => {
            if (FACTORY_DEFAULTS[id] !== undefined) {
                safeSet(id, FACTORY_DEFAULTS[id]);
            }
        });
        window.aegisSettingsDirty = true; // Reverting to factory counts as an unsaved change until Applied
        applyCameraVisuals();
        applyTheme(FACTORY_DEFAULTS['setting-theme-toggle']);
        if (window.termLog) window.termLog("Settings reverted to factory defaults. Please Apply to save.", "warning");
    };

    // Attach revert buttons
    document.querySelectorAll('[id^="btn-revert"]').forEach(btn => {
        btn.addEventListener('click', revertToFactoryDefaults);
    });
    // Also catch generic "Revert Changes" buttons without IDs
    document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim() === 'Revert Changes' && !btn.id) {
            btn.addEventListener('click', revertToFactoryDefaults);
        }
    });

    // ── Dirty tracking ──
    ALL_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const markDirty = () => { window.aegisSettingsDirty = true; };
            el.addEventListener('input', markDirty);
            el.addEventListener('change', markDirty);
        }
    });

    // ── Real-time Visual Updates ──
    const applyCameraVisuals = () => {
        const cameraVideo = document.getElementById('camera-video');
        const detectionCanvas = document.getElementById('detection-canvas');

        const flipH = safeGet('cam-flip');
        const mirrorV = safeGet('cam-mirror');
        const rotation = safeGet('cam-rotation') || '0';
        const brightness = safeGet('cam-brightness') || '50';
        const contrast = safeGet('cam-contrast') || '65';
        const saturation = safeGet('cam-saturation') || '40';
        const nightVision = safeGet('cam-night-vision');

        const scaleX = flipH ? -1 : 1;
        const scaleY = mirrorV ? -1 : 1;
        const transformStr = `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;

        let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        if (nightVision) {
            filterStr = `grayscale(100%) sepia(100%) hue-rotate(90deg) brightness(1.2) contrast(1.4)`;
        }

        [cameraVideo, detectionCanvas, document.getElementById('pip-canvas'), document.getElementById('pip-video')].forEach(el => {
            if (el) {
                el.style.transform = transformStr;
                if (el !== detectionCanvas) {
                    el.style.filter = filterStr;
                }
                el.style.transition = 'transform 0.3s ease, filter 0.3s ease';
            }
        });
    };

    const applyTheme = (isDark) => {
        if (isDark) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    };

    // Theme toggle change listener
    const themeToggle = document.getElementById('setting-theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked);
        });
    }

    // Camera RTSP container toggle
    const camInputType = document.getElementById('cam-input-type');
    const camRtspContainer = document.getElementById('cam-rtsp-container');
    if (camInputType && camRtspContainer) {
        camInputType.addEventListener('change', (e) => {
            if (e.target.value === 'rtsp') {
                camRtspContainer.classList.remove('hidden');
                camRtspContainer.classList.add('flex');
            } else {
                camRtspContainer.classList.add('hidden');
                camRtspContainer.classList.remove('flex');
            }
        });
    }

    // Real-time camera adjustment listeners
    ['cam-flip', 'cam-mirror', 'cam-rotation', 'cam-brightness', 'cam-contrast', 'cam-saturation', 'cam-night-vision'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', applyCameraVisuals);
            el.addEventListener('change', applyCameraVisuals);
        }
    });

    // ── ROI Modal ──
    const setRoiBtn = document.getElementById('cam-set-roi');
    const roiModal = document.getElementById('roi-modal');
    const roiBgCanvas = document.getElementById('roi-bg-canvas');
    const roiDrawCanvas = document.getElementById('roi-draw-canvas');
    const roiCoords = document.getElementById('roi-coords');
    const roiCancelBtn = document.getElementById('roi-cancel-btn');
    const roiClearBtn = document.getElementById('roi-clear-btn');
    const roiConfirmBtn = document.getElementById('roi-confirm-btn');

    let roiStartX = 0, roiStartY = 0, roiEndX = 0, roiEndY = 0, roiDrawing = false;
    let roiRect = null; // {x, y, w, h} in normalized [0,1]

    if (setRoiBtn && roiModal) {
        setRoiBtn.addEventListener('click', () => {
            const cameraVideo = document.getElementById('camera-video');
            if (!cameraVideo || cameraVideo.classList.contains('hidden')) {
                if (window.termLog) window.termLog("ROI: Camera must be active to set ROI.", "error");
                return;
            }

            // Snapshot camera frame onto background canvas
            const container = document.getElementById('roi-canvas-container');
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            roiBgCanvas.width = cw;
            roiBgCanvas.height = ch;
            roiDrawCanvas.width = cw;
            roiDrawCanvas.height = ch;

            const bgCtx = roiBgCanvas.getContext('2d');
            bgCtx.drawImage(cameraVideo, 0, 0, cw, ch);

            // Draw existing ROI if any
            if (roiRect) {
                const drawCtx = roiDrawCanvas.getContext('2d');
                drawCtx.clearRect(0, 0, cw, ch);
                const rx = roiRect.x * cw, ry = roiRect.y * ch, rw = roiRect.w * cw, rh = roiRect.h * ch;
                drawCtx.strokeStyle = '#4b8eff';
                drawCtx.lineWidth = 2;
                drawCtx.setLineDash([6, 4]);
                drawCtx.strokeRect(rx, ry, rw, rh);
                drawCtx.fillStyle = 'rgba(75, 142, 255, 0.15)';
                drawCtx.fillRect(rx, ry, rw, rh);
                roiCoords.textContent = `X: ${Math.round(rx)}, Y: ${Math.round(ry)}, W: ${Math.round(rw)}, H: ${Math.round(rh)}`;
            }

            roiModal.classList.add('open');
        });

        // Drawing on canvas
        roiDrawCanvas.addEventListener('mousedown', (e) => {
            const rect = roiDrawCanvas.getBoundingClientRect();
            roiStartX = e.clientX - rect.left;
            roiStartY = e.clientY - rect.top;
            roiDrawing = true;
        });

        roiDrawCanvas.addEventListener('mousemove', (e) => {
            if (!roiDrawing) return;
            const rect = roiDrawCanvas.getBoundingClientRect();
            roiEndX = e.clientX - rect.left;
            roiEndY = e.clientY - rect.top;

            const ctx = roiDrawCanvas.getContext('2d');
            ctx.clearRect(0, 0, roiDrawCanvas.width, roiDrawCanvas.height);

            const x = Math.min(roiStartX, roiEndX);
            const y = Math.min(roiStartY, roiEndY);
            const w = Math.abs(roiEndX - roiStartX);
            const h = Math.abs(roiEndY - roiStartY);

            // Dim outside ROI
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, roiDrawCanvas.width, roiDrawCanvas.height);
            ctx.clearRect(x, y, w, h);

            ctx.strokeStyle = '#4b8eff';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'rgba(75, 142, 255, 0.1)';
            ctx.fillRect(x, y, w, h);

            roiCoords.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}, W: ${Math.round(w)}, H: ${Math.round(h)}`;
        });

        roiDrawCanvas.addEventListener('mouseup', () => {
            roiDrawing = false;
        });

        roiCancelBtn.addEventListener('click', () => {
            roiModal.classList.remove('open');
        });

        roiModal.querySelector('.roi-modal-backdrop').addEventListener('click', () => {
            roiModal.classList.remove('open');
        });

        roiClearBtn.addEventListener('click', () => {
            const ctx = roiDrawCanvas.getContext('2d');
            ctx.clearRect(0, 0, roiDrawCanvas.width, roiDrawCanvas.height);
            roiRect = null;
            roiCoords.textContent = 'X: 0, Y: 0, W: 0, H: 0';

            if (window.termLog) window.termLog("ROI: Region of Interest cleared.", "warning");
        });

        roiConfirmBtn.addEventListener('click', () => {
            const cw = roiDrawCanvas.width;
            const ch = roiDrawCanvas.height;
            const x = Math.min(roiStartX, roiEndX) / cw;
            const y = Math.min(roiStartY, roiEndY) / ch;
            const w = Math.abs(roiEndX - roiStartX) / cw;
            const h = Math.abs(roiEndY - roiStartY) / ch;

            if (w < 0.02 || h < 0.02) {
                if (window.termLog) window.termLog("ROI: Selection too small. Please drag a larger area.", "error");
                return;
            }

            roiRect = { x, y, w, h };
            roiModal.classList.remove('open');

            if (window.termLog) window.termLog(`ROI: Region set to (${(x * 100).toFixed(1)}%, ${(y * 100).toFixed(1)}%, ${(w * 100).toFixed(1)}%, ${(h * 100).toFixed(1)}%)`, "success");
        });
    }

    // ── Target Objects ──
    window.aegisTargetObjects = [];

    const renderTargetObjects = () => {
        const listEl = document.getElementById('target-objects-list');
        if (!listEl) return;

        listEl.innerHTML = '';
        if (window.aegisTargetObjects.length === 0) {
            listEl.innerHTML = '<span class="text-outline-variant font-label-mono text-[13px] self-center">No targets specified. All objects will be detected.</span>';
        } else {
            window.aegisTargetObjects.forEach((obj, idx) => {
                const badge = document.createElement('div');
                badge.className = 'flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-label-mono text-[12px]';
                badge.innerHTML = `
                    <span>${obj}</span>
                    <button class="hover:text-on-surface transition-colors leading-none" data-idx="${idx}">&times;</button>
                `;
                badge.querySelector('button').addEventListener('click', () => {
                    window.aegisTargetObjects.splice(idx, 1);
                    window.aegisSettingsDirty = true;
                    renderTargetObjects();
                });
                listEl.appendChild(badge);
            });
        }
    };

    const targetInput = document.getElementById('target-object-input');
    const targetAddBtn = document.getElementById('btn-add-target-object');

    const addTargetObject = () => {
        if (!targetInput) return;
        const val = targetInput.value.trim().toLowerCase();
        if (val && !window.aegisTargetObjects.includes(val)) {
            window.aegisTargetObjects.push(val);
            window.aegisSettingsDirty = true;
            renderTargetObjects();
        }
        targetInput.value = '';
    };

    if (targetAddBtn) {
        targetAddBtn.addEventListener('click', addTargetObject);
    }
    if (targetInput) {
        targetInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTargetObject();
            }
        });
    }

    // ── Load Settings ──
    const loadSettings = () => {
        try {
            const genConfig = JSON.parse(localStorage.getItem('aegis_settings_general'));
            if (genConfig) {
                safeSet('setting-language', genConfig.language);
                safeSet('setting-theme-toggle', genConfig.themeDark);
                applyTheme(genConfig.themeDark !== false);
                safeSet('setting-retention-days', genConfig.retentionDays);
                safeSet('setting-save-path', genConfig.savePath);
                safeSet('setting-auto-connect', genConfig.autoConnect);

                if (genConfig.autoConnect) {
                    const startCamBtn = document.getElementById('start-camera-btn');
                    if (startCamBtn && typeof startCamera === 'function') {
                        setTimeout(() => startCamera(), 500);
                    }
                }
            }

            const camConfig = JSON.parse(localStorage.getItem('aegis_settings_camera'));
            if (camConfig) {
                safeSet('cam-input-type', camConfig.inputType);
                if (camConfig.inputType === 'rtsp' && camRtspContainer) {
                    camRtspContainer.classList.remove('hidden');
                    camRtspContainer.classList.add('flex');
                }
                safeSet('cam-rtsp-url', camConfig.rtspUrl);
                safeSet('cam-flip', camConfig.flipH);
                safeSet('cam-mirror', camConfig.mirrorV);
                safeSet('cam-rotation', camConfig.rotation);
                safeSet('cam-brightness', camConfig.brightness);
                safeSet('cam-contrast', camConfig.contrast);
                safeSet('cam-saturation', camConfig.saturation);
                safeSet('cam-night-vision', camConfig.nightVision);
                applyCameraVisuals();
            }

            const modelConfig = JSON.parse(localStorage.getItem('aegis_settings_model'));
            if (modelConfig) {
                safeSet('model-conf-thresh', modelConfig.confThresh);
                safeSet('model-nms-thresh', modelConfig.nmsThresh);
                safeSet('model-inference-engine', modelConfig.inferenceEngine);
                safeSet('model-batch-size', modelConfig.batchSize);
                safeSet('model-max-fps', modelConfig.maxFps);
                safeSet('model-inference-interval', modelConfig.inferenceInterval || '0');

                window.aegisTargetObjects = modelConfig.targetObjects || [];
                renderTargetObjects();

                // Initial sync with backend
                fetch('http://localhost:8000/api/settings/model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        confThresh: parseFloat(modelConfig.confThresh) || 60,
                        nmsThresh: parseFloat(modelConfig.nmsThresh) || 45,
                        inferenceEngine: modelConfig.inferenceEngine || 'cuda',
                        inferenceInterval: parseFloat(modelConfig.inferenceInterval) || 0,
                        targetObjects: window.aegisTargetObjects
                    })
                }).catch(e => console.warn("Could not sync model params on startup:", e));
            }

            const notifConfig = JSON.parse(localStorage.getItem('aegis_settings_notif'));
            if (notifConfig) {
                NOTIF_FIELDS.forEach(field => {
                    if (notifConfig[field] !== undefined) {
                        safeSet(field, notifConfig[field]);
                    }
                });
            }
        } catch (e) {
            console.error("Error loading settings", e);
        }
    };

    // ── Save Handlers ──
    const clearDirty = () => {
        window.aegisSettingsDirty = false;
        takeSnapshot();
    };

    const btnApplyGeneral = document.getElementById('btn-apply-general');
    if (btnApplyGeneral) {
        btnApplyGeneral.addEventListener('click', async () => {
            const savePath = safeGet('setting-save-path');
            const config = {
                language: safeGet('setting-language'),
                themeDark: safeGet('setting-theme-toggle'),
                retentionDays: safeGet('setting-retention-days'),
                retentionStartDate: Date.now(),
                savePath: savePath,
                autoConnect: safeGet('setting-auto-connect')
            };
            localStorage.setItem('aegis_settings_general', JSON.stringify(config));
            applyTheme(config.themeDark);
            clearDirty();

            // Notify backend to create folder if it doesn't exist
            try {
                await fetch('http://localhost:8000/api/settings/save-path', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: savePath })
                });
            } catch (e) {
                console.warn("Could not reach backend to create save path:", e);
            }

            if (window.termLog) window.termLog("General settings applied & saved successfully.", "success");
        });
    }

    const btnApplyCamera = document.getElementById('btn-apply-camera');
    if (btnApplyCamera) {
        btnApplyCamera.addEventListener('click', () => {
            const config = {
                inputType: safeGet('cam-input-type'),
                rtspUrl: safeGet('cam-rtsp-url'),
                flipH: safeGet('cam-flip'),
                mirrorV: safeGet('cam-mirror'),
                rotation: safeGet('cam-rotation'),
                brightness: safeGet('cam-brightness'),
                contrast: safeGet('cam-contrast'),
                saturation: safeGet('cam-saturation'),
                nightVision: safeGet('cam-night-vision')
            };
            localStorage.setItem('aegis_settings_camera', JSON.stringify(config));
            applyCameraVisuals();
            clearDirty();
            if (window.termLog) window.termLog("Camera video transformations applied.", "success");
        });
    }

    const btnApplyModel = document.getElementById('btn-apply-model');
    if (btnApplyModel) {
        btnApplyModel.addEventListener('click', async () => {
            const config = {
                confThresh: safeGet('model-conf-thresh'),
                nmsThresh: safeGet('model-nms-thresh'),
                inferenceEngine: safeGet('model-inference-engine'),
                batchSize: safeGet('model-batch-size'),
                maxFps: safeGet('model-max-fps'),
                inferenceInterval: safeGet('model-inference-interval') || '0',
                targetObjects: window.aegisTargetObjects || []
            };
            localStorage.setItem('aegis_settings_model', JSON.stringify(config));
            clearDirty();
            if (window.termLog) window.termLog(`Model parameters updated. Engine: ${config.inferenceEngine.toUpperCase()}, Confidence: ${config.confThresh}%`, "success");

            // Apply FPS dynamically if camera is running
            const cameraVideo = document.getElementById('camera-video');
            if (cameraVideo && cameraVideo.srcObject) {
                const track = cameraVideo.srcObject.getVideoTracks()[0];
                if (track) {
                    const maxFps = parseInt(config.maxFps);
                    const constraints = maxFps > 0 ? { frameRate: { ideal: maxFps, max: maxFps } } : {};
                    track.applyConstraints(constraints).then(() => {
                        const newSettings = track.getSettings();
                        if (window.termLog) window.termLog(`Camera FPS adjusted. Current frameRate: ${newSettings.frameRate || 'Default'}`);
                        const feedStats = document.getElementById('feed-stats');
                        if (feedStats) feedStats.innerHTML = `FPS: ${newSettings.frameRate || '--'} <br> RES: ${newSettings.width || '--'}x${newSettings.height || '--'}`;
                    }).catch(e => {
                        console.warn("Could not apply frameRate constraint dynamically:", e);
                    });
                }
            }

            // Apply inference interval dynamically
            window.aegisModelInterval = parseFloat(config.inferenceInterval) || 0;

            // Sync with backend model inference settings
            try {
                await fetch('http://localhost:8000/api/settings/model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        confThresh: parseFloat(config.confThresh) || 60,
                        nmsThresh: parseFloat(config.nmsThresh) || 45,
                        inferenceEngine: config.inferenceEngine || 'cuda',
                        inferenceInterval: parseFloat(config.inferenceInterval) || 0,
                        targetObjects: config.targetObjects
                    })
                });
                if (window.termLog) window.termLog("Backend inference parameters synced successfully.", "success");
            } catch (e) {
                console.warn("Could not sync model parameters with backend:", e);
                if (window.termLog) window.termLog("Warning: Could not reach backend to sync model parameters.", "warning");
            }
        });
    }

    const btnApplyAlert = document.getElementById('btn-apply-alert');
    if (btnApplyAlert) {
        btnApplyAlert.addEventListener('click', () => {
            const config = {};
            NOTIF_FIELDS.forEach(field => {
                config[field] = safeGet(field);
            });
            localStorage.setItem('aegis_settings_notif', JSON.stringify(config));
            clearDirty();
            if (window.termLog) window.termLog("Notification preferences updated.", "success");
            
            // Check settings events toggle
            if (config['notif-settings-saved']) {
            }
        });
    }

    const btnRevertAlert = document.getElementById('btn-revert-alert');
    if (btnRevertAlert) {
        btnRevertAlert.addEventListener('click', () => {
            NOTIF_FIELDS.forEach(field => revertField(field));
            clearDirty();
            
            const config = JSON.parse(localStorage.getItem('aegis_settings_notif') || '{}');
            if (config['notif-settings-reverted'] !== false && config['notif-settings-reverted'] !== 'false') {
            }
        });
    }

    loadSettings();
    takeSnapshot(); // Save initial snapshot for revert
};

// ── Camera PiP Logic ──
window._pipManuallyClosed = false;

window.initCameraPiP = () => {
    const pipEl = document.getElementById('camera-pip');
    const pipVideo = document.getElementById('pip-video');
    const pipCanvas = document.getElementById('pip-canvas');
    const pipCloseBtn = document.getElementById('pip-close-btn');
    const pipExpandBtn = document.getElementById('pip-expand-btn');
    if (!pipEl || !pipVideo || !pipCanvas) return;

    // PiP drag & snap support
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    pipEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.pip-close') || e.target.closest('.pip-expand')) return;
        isDragging = true;
        dragOffsetX = e.clientX - pipEl.getBoundingClientRect().left;
        dragOffsetY = e.clientY - pipEl.getBoundingClientRect().top;
        pipEl.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newLeft = e.clientX - dragOffsetX;
        let newTop = e.clientY - dragOffsetY;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - pipEl.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - pipEl.offsetHeight));
        pipEl.style.left = newLeft + 'px';
        pipEl.style.top = newTop + 'px';
        pipEl.style.right = 'auto';
        pipEl.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            pipEl.style.transition = 'left 0.3s ease, top 0.3s ease';

            // Snap to nearest edge logic
            const pRect = pipEl.getBoundingClientRect();
            const relLeft = pRect.left;
            const relTop = pRect.top;

            const distLeft = relLeft;
            const distRight = window.innerWidth - (relLeft + pRect.width);
            const distTop = relTop;
            const distBottom = window.innerHeight - (relTop + pRect.height);

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            const SNAP_MARGIN = 24;

            if (minDist === distLeft) {
                pipEl.style.left = SNAP_MARGIN + 'px';
            } else if (minDist === distRight) {
                pipEl.style.left = (window.innerWidth - pRect.width - SNAP_MARGIN) + 'px';
            } else if (minDist === distTop) {
                pipEl.style.top = SNAP_MARGIN + 'px';
            } else {
                pipEl.style.top = (window.innerHeight - pRect.height - SNAP_MARGIN) + 'px';
            }
        }
    });

    // Close PiP
    pipCloseBtn.addEventListener('click', () => {
        window._pipManuallyClosed = true;
        pipEl.classList.add('hidden');
    });

    // Expand = navigate to home
    pipExpandBtn.addEventListener('click', () => {
        document.getElementById('nav-home')?.click();
    });

    // Show/hide PiP based on current view
    const updatePiPVisibility = (viewId) => {
        const cameraVideo = document.getElementById('camera-video');
        if (viewId === 'view-home') {
            window._pipManuallyClosed = false; // Reset close state when returning to home
            pipEl.classList.add('hidden');
            pipVideo.srcObject = null;
        } else {
            if (!window._pipManuallyClosed && cameraVideo && cameraVideo.srcObject) {
                pipVideo.srcObject = cameraVideo.srcObject;
                pipEl.classList.remove('hidden');
            } else {
                pipEl.classList.add('hidden');
                pipVideo.srcObject = null;
            }
        }
    };

    window.addEventListener('spa:view-loaded', (e) => {
        updatePiPVisibility(e.detail.viewId);
    });

    // PiP rendering loop
    const pipCtx = pipCanvas.getContext('2d');
    const drawPiP = () => {
        if (!pipEl.classList.contains('hidden')) {
            const cameraVideo = document.getElementById('camera-video');
            const detectionCanvas = document.getElementById('detection-canvas');

            if (cameraVideo && cameraVideo.videoWidth) {
                pipCanvas.width = cameraVideo.videoWidth;
                pipCanvas.height = cameraVideo.videoHeight;

                pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);

                if (detectionCanvas && detectionCanvas.width > 0) {
                    pipCtx.drawImage(detectionCanvas, 0, 0, pipCanvas.width, pipCanvas.height);
                }
            }
        }
        requestAnimationFrame(drawPiP);
    };
    requestAnimationFrame(drawPiP);
};

// ── Unsaved Changes Warning Logic ──
window.initUnsavedWarning = () => {
    const modal = document.getElementById('unsaved-modal');
    const stayBtn = document.getElementById('unsaved-stay-btn');
    const leaveBtn = document.getElementById('unsaved-leave-btn');
    if (!modal || !stayBtn || !leaveBtn) return;

    stayBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        window._aegisPendingNavUrl = null;
    });

    leaveBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        window.aegisSettingsDirty = false;
        const url = window._aegisPendingNavUrl;
        window._aegisPendingNavUrl = null;
        if (url && window.spaLoadRoute) {
            window.spaLoadRoute(url);
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.initSettingsUI) window.initSettingsUI();
    if (window.initCameraPiP) window.initCameraPiP();
    if (window.initUnsavedWarning) window.initUnsavedWarning();
});
