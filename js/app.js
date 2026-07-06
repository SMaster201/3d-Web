/* ============================================
   Aegis Vision — Shared JavaScript
   Sidebar toggle, nav highlighting, terminal
   auto-scroll, dynamic clock, slider updates
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
        // Remove filled icon style
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

    // ─── Terminal Auto-Scroll & Log Simulation ─────
    const terminal = document.getElementById('terminal-log');
    if (terminal) {
        // Auto-scroll to bottom
        terminal.scrollTop = terminal.scrollHeight;

        // Simulated log entries
        const logMessages = [
            'OBJ_DET: Scanning sector Delta.',
            'SYS: Background process optimized.',
            'INFERENCE: Frame buffer cleared.',
            'CAM-04: Auto-exposure adjusted.',
            'OBJ_DET: Scanning sector Echo.',
            'MDL_ENG: Inference latency: 8ms.',
            'SYS: Memory compaction complete.',
            'OBJ_DET: No anomalies detected.',
            'CAM-01: Focus recalibrated.',
            'SYS: Heartbeat check — OK.',
            'INFERENCE: Noise reduction applied.',
            'OBJ_DET: Scanning sector Foxtrot.',
        ];
        let logIndex = 0;

        setInterval(() => {
            const logContainer = terminal.querySelector('.flex.flex-col');
            if (!logContainer) return;

            // Remove "Awaiting" message if present
            const awaiting = logContainer.querySelector('.animate-pulse');
            if (awaiting) awaiting.remove();

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const p = document.createElement('p');
            p.innerHTML = `<span class="text-primary/70">[${timeStr}]</span> ${logMessages[logIndex % logMessages.length]}`;
            logContainer.appendChild(p);

            logIndex++;
            terminal.scrollTop = terminal.scrollHeight;

            // Keep only last 50 entries
            const entries = logContainer.querySelectorAll('p');
            if (entries.length > 50) {
                entries[0].remove();
            }
        }, 4000);
    }

    // ─── Range Slider Live Value Update ────────────
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const container = e.target.closest('.space-y-2');
            if (!container) return;
            const valueDisplay = container.querySelector('.text-primary');
            if (valueDisplay) {
                valueDisplay.textContent = e.target.value + '%';
            }
        });
    });

    // ─── Page Fade-in ──────────────────────────────
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.add('page-fade-in');
    }
});
