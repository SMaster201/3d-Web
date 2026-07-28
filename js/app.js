/* ============================================
   Aegis Vision — Shared JavaScript
   Sidebar toggle, nav highlighting, terminal
   auto-scroll, dynamic clock, slider updates,
   language selector, notifications, system status,
   camera detection, model loading, confirm settings
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

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

    // ─── Active Nav Highlighting ────────────────────
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navMap = {
        'index.html': 'nav-home',
        'detection_history.html': 'nav-history',
        'ai_chat.html': 'nav-chat',
        'settings.html': 'nav-settings-footer',
        'settings_model.html': 'nav-settings-footer',
        'settings_alert.html': 'nav-settings-footer',
        'settings_camera.html': 'nav-settings-footer',
        'user_profile.html': 'nav-profile-footer',
    };

    // Reset all nav links to inactive state
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.remove(
            'text-primary', 'bg-primary-container/20',
            'border-primary'
        );
        el.classList.add(
            'text-on-surface-variant', 'border-transparent'
        );
        const icon = el.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = '';
    });

    // Activate the current nav
    const activeNavId = navMap[currentPage];
    if (activeNavId) {
        const activeEl = document.getElementById(activeNavId);
        if (activeEl) {
            activeEl.classList.remove(
                'text-on-surface-variant', 'border-transparent'
            );
            activeEl.classList.add(
                'text-primary', 'bg-primary-container/20',
                'border-primary'
            );
            const icon = activeEl.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = "'FILL' 1";
        }
    }

    // Also handle footer buttons (settings & profile)
    if (currentPage.startsWith('settings')) {
        const settingsBtn = document.getElementById('nav-settings-footer');
        if (settingsBtn) {
            settingsBtn.classList.add('text-primary', 'bg-surface-bright/50');
            settingsBtn.classList.remove('text-on-surface-variant');
        }
    }
    if (currentPage === 'user_profile.html') {
        const profileBtn = document.getElementById('nav-profile-footer');
        if (profileBtn) {
            profileBtn.classList.add('text-primary', 'bg-primary-container/20');
            profileBtn.classList.remove('text-on-surface-variant');
            profileBtn.classList.add('shadow-[0_0_10px_rgba(173,198,255,0.3)]');
        }
    }

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

        updateResourceUsage();
    }

    window.updateSystemStatus = (cameraOnline, modelOnline) => {
        window.aegisSystemState.cameraOnline = cameraOnline;
        window.aegisSystemState.modelOnline = modelOnline;
        updateSystemStatus();
    };

    // ─── Resource Usage Monitor ────────────────────
    const computeLoadVal = document.getElementById('compute-load-val');
    const computeLoadBar = document.getElementById('compute-load-bar');
    const vramUsageVal = document.getElementById('vram-usage-val');
    const vramUsageBar = document.getElementById('vram-usage-bar');

    function updateResourceUsage() {
        if (!computeLoadVal || !computeLoadBar || !vramUsageVal || !vramUsageBar) return;

        const { cameraOnline, modelOnline } = window.aegisSystemState;
        let baseCpu = 16;
        let cpuRange = 6;
        let baseVram = 1.2;
        let vramRange = 0.3;
        const totalVram = 8.0;

        if (cameraOnline && modelOnline) {
            baseCpu = 72;
            cpuRange = 18;
            baseVram = 5.8;
            vramRange = 1.0;
        } else if (cameraOnline) {
            baseCpu = 35;
            cpuRange = 10;
            baseVram = 2.4;
            vramRange = 0.5;
        } else if (modelOnline) {
            baseCpu = 44;
            cpuRange = 12;
            baseVram = 4.1;
            vramRange = 0.6;
        }

        const currentCpu = Math.min(99, Math.max(5, Math.floor(baseCpu + (Math.random() * cpuRange - cpuRange / 2))));
        const currentVram = Math.min(7.9, Math.max(0.8, (baseVram + (Math.random() * vramRange - vramRange / 2)))).toFixed(1);
        const vramPct = Math.min(100, Math.round((parseFloat(currentVram) / totalVram) * 100));

        computeLoadVal.textContent = `${currentCpu}%`;
        computeLoadBar.style.width = `${currentCpu}%`;

        vramUsageVal.innerHTML = `${currentVram}<span class="text-[12px] text-on-surface-variant">GB</span>`;
        vramUsageBar.style.width = `${vramPct}%`;
    }

    updateSystemStatus();
    updateResourceUsage();
    setInterval(updateResourceUsage, 2000);

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

    window.addNotification = (message, type = 'info', icon = 'info') => {
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
                    window.addNotification('No camera detected.', 'error', 'videocam_off');
                } else {
                    termLog('CAM_LOAD: Please select the camera.', 'error');
                    window.addNotification('Please select the camera.', 'error', 'videocam_off');
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
                const videoConstraints = selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId } }
                    : true;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints
                });

                activeCameraStream = stream;

                if (cameraVideo) {
                    cameraVideo.srcObject = stream;
                    cameraVideo.classList.remove('hidden');
                }
                if (noCameraPlaceholder) {
                    noCameraPlaceholder.classList.add('hidden');
                }
                if (recBadge) recBadge.classList.remove('hidden');
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

                termLog(`CAM_LOAD: "${selectedLabel}" loaded successfully. Stream active.`, 'success');
                termLog(`CAM_LOAD: Resolution: ${settings.width}x${settings.height}, FPS: ${settings.frameRate}`);
            } catch (err) {
                termLog(`CAM_LOAD: Failed to load camera — ${err.message}`, 'error');
                window.addNotification(`Camera load failed: ${err.message}`, 'error', 'error');
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
                    window.addNotification('No model detected.', 'error', 'model_training');
                } else {
                    termLog('MDL_LOAD: Please select the model.', 'error');
                    window.addNotification('Please select the model.', 'error', 'model_training');
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

                    window.addNotification(`Model "${selectedLabel}" loaded and ready.`, 'info', 'check_circle');
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
                window.addNotification(`Please select: ${missingStr}`, 'warning', 'warning');
                return;
            }

            // All selections are valid
            const cameraName = cameraSelect.options[cameraIdx].textContent;
            const modelName = modelSelect.options[modelSelect.selectedIndex].textContent;
            const printerName = printerSelect.options[printerSelect.selectedIndex].textContent;

            termLog('═══════════════════════════════════════════');
            termLog('CONFIRM: All settings confirmed successfully.', 'success');
            termLog(`  → Camera:  ${cameraName}`);
            termLog(`  → Model:   ${modelName}`);
            termLog(`  → Printer: ${printerName}`);
            termLog('═══════════════════════════════════════════');

            window.addNotification('All settings confirmed and applied.', 'info', 'check_circle');
        });
    }

    // ─── Screenshot Button ─────────────────────────
    const screenshotBtn = document.getElementById('screenshot-btn');
    const capturesGrid = document.getElementById('captures-grid');
    const capturesCount = document.getElementById('captures-count');
    let screenshotCounter = 0;

    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
            if (!cameraVideo || cameraVideo.classList.contains('hidden') || !activeCameraStream) {
                termLog('SCREENSHOT: No active camera feed. Please load a camera first.', 'error');
                window.addNotification('No active camera feed for screenshot.', 'error', 'photo_camera');
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
                window.addNotification('No model loaded for re-identification.', 'error', 'model_training');
                return;
            }

            if (!activeCameraStream) {
                termLog('RE-ID: No active camera feed. Please load a camera first.', 'error');
                window.addNotification('No active camera feed for re-identification.', 'error', 'videocam_off');
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

                    window.addNotification(`Re-identification complete with "${modelName}".`, 'info', 'check_circle');
                }, 800);
            }, 500);
        });
    }

    // ─── Detection Overlay System ──────────────────
    const detectionClasses = ['person', 'car', 'truck', 'bicycle', 'dog', 'cat', 'backpack', 'handbag', 'cell phone', 'bottle'];
    const detectionColors = ['#4b8eff', '#4edea3', '#ffb74d', '#c0c1ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b81', '#a66cff'];
    let simulatedDetections = [];

    function generateDetections() {
        const count = Math.floor(Math.random() * 4) + 1; // 1-4 detections
        const dets = [];
        for (let i = 0; i < count; i++) {
            const classIdx = Math.floor(Math.random() * detectionClasses.length);
            const w = 0.08 + Math.random() * 0.2;
            const h = 0.1 + Math.random() * 0.3;
            dets.push({
                label: detectionClasses[classIdx],
                confidence: (0.55 + Math.random() * 0.44).toFixed(2),
                color: detectionColors[classIdx],
                x: Math.random() * (1 - w),
                y: Math.random() * (1 - h),
                w, h,
                // For smooth animation
                targetX: 0, targetY: 0, targetW: 0, targetH: 0,
            });
            dets[i].targetX = dets[i].x;
            dets[i].targetY = dets[i].y;
            dets[i].targetW = dets[i].w;
            dets[i].targetH = dets[i].h;
        }
        return dets;
    }

    function drawDetections() {
        if (!detectionCanvas || !cameraVideo || cameraVideo.classList.contains('hidden')) return;

        const rect = cameraVideo.getBoundingClientRect();
        detectionCanvas.width = rect.width;
        detectionCanvas.height = rect.height;

        const ctx = detectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

        simulatedDetections.forEach(det => {
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
            const labelText = `${det.label} ${det.confidence}`;
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
        simulatedDetections = generateDetections();

        // Periodically refresh detections to simulate real-time inference
        window._detectionInterval = setInterval(() => {
            const newDets = generateDetections();
            // Match existing detections to new ones and update targets
            simulatedDetections = newDets.map((nd, i) => {
                const old = simulatedDetections[i] || nd;
                return {
                    ...nd,
                    x: old.x, y: old.y, w: old.w, h: old.h,
                    targetX: nd.x, targetY: nd.y, targetW: nd.w, targetH: nd.h,
                };
            });
        }, 2000);

        drawDetections();
        termLog('DETECT: Real-time inference started. Drawing bounding boxes.', 'success');
    }

    function stopDetectionOverlay() {
        if (detectionAnimationId) {
            cancelAnimationFrame(detectionAnimationId);
            detectionAnimationId = null;
        }
        if (window._detectionInterval) {
            clearInterval(window._detectionInterval);
            window._detectionInterval = null;
        }
        if (detectionCanvas) {
            detectionCanvas.classList.add('hidden');
            const ctx = detectionCanvas.getContext('2d');
            ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
        }
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

    // ─── Page Fade-in ──────────────────────────────
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.add('page-fade-in');
    }
});
