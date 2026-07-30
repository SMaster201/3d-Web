// js/router.js
// Handles SPA routing by toggling visibility of pre-loaded view sections in index.html

document.addEventListener('DOMContentLoaded', () => {
    
    // A map to translate URLs to View Element IDs
    const routeMap = {
        'index.html': 'view-home',
        '': 'view-home', // Root
        'detection_history.html': 'view-history',
        'record_detail.html': 'view-record-detail',
        'settings.html': 'view-settings',
        'settings_camera.html': 'view-settings-camera',
        'settings_model.html': 'view-settings-model',
        'settings_alert.html': 'view-settings-alert',
        'user_profile.html': 'view-profile',
        'ai_chat.html': 'view-chat'
    };

    function getViewId(url) {
        const parts = url.split('/');
        let file = parts[parts.length - 1].split('?')[0].split('#')[0];
        if (!file) file = 'index.html';
        return routeMap[file] || 'view-home';
    }

    function loadRoute(url, pushState = true) {
        const targetViewId = getViewId(url);
        
        // Hide all views
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show target view
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            console.warn(`View ${targetViewId} not found. Fallback to home.`);
            document.getElementById('view-home')?.classList.remove('hidden');
        }

        if (pushState) {
            try {
                window.history.pushState({ path: url }, '', url);
            } catch (e) {
                console.warn('pushState failed (likely due to file:// protocol). Continuing without URL update.');
            }
        }

        updateActiveNav(url);

        // Dispatch an event so app.js can handle specific view logic if needed
        const event = new CustomEvent('spa:view-loaded', { detail: { viewId: targetViewId, url } });
        window.dispatchEvent(event);
    }
    
    // Expose globally for programmatic navigation
    window.spaLoadRoute = loadRoute;

    // Intercept clicks on links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Ignore external links, empty links, anchor links, or zip downloads
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.endsWith('.zip')) {
            return;
        }

        // It's an internal navigation, prevent full page reload
        e.preventDefault();
        
        // If we are already on this path, only reload if query params differ (like record_detail id)
        const targetUrl = new URL(link.href).pathname + new URL(link.href).search;
        const currentUrl = window.location.pathname + window.location.search;
        
        if (currentUrl !== targetUrl || href.includes('?')) {
            loadRoute(link.href);
        } else {
            // Even if URL is the same, ensure the correct view is visible
            const targetViewId = getViewId(link.href);
            document.querySelectorAll('.view-section').forEach(section => {
                section.classList.add('hidden');
            });
            const targetView = document.getElementById(targetViewId);
            if (targetView) targetView.classList.remove('hidden');
            updateActiveNav(link.href);
        }
    });

    // Handle Browser Back/Forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.path) {
            loadRoute(e.state.path, false);
        } else {
            loadRoute(window.location.href, false);
        }
    });

    // Initial state setup for popstate
    try {
        window.history.replaceState({ path: window.location.href }, '', window.location.href);
    } catch (e) {
        console.warn('replaceState failed (likely due to file:// protocol).');
    }

    // Initial load
    setTimeout(() => {
        loadRoute(window.location.href, false);
    }, 100);

    function updateActiveNav(url) {
        const parts = url.split('/');
        let file = parts[parts.length - 1].split('?')[0].split('#')[0];
        if (!file) file = 'index.html';
        
        const navMap = {
            'index.html': 'nav-home',
            'detection_history.html': 'nav-history',
            'record_detail.html': 'nav-history',
            'ai_chat.html': 'nav-chat',
            'settings.html': 'nav-settings-footer',
            'settings_model.html': 'nav-settings-footer',
            'settings_alert.html': 'nav-settings-footer',
            'settings_camera.html': 'nav-settings-footer',
            'user_profile.html': 'nav-profile-footer',
        };

        // Reset all nav links to inactive state
        document.querySelectorAll('[data-nav], #nav-settings-footer, #nav-profile-footer').forEach(el => {
            el.classList.remove('text-primary', 'bg-primary-container/20', 'border-primary', 'bg-surface-bright/50', 'shadow-[0_0_10px_rgba(173,198,255,0.3)]');
            if (el.hasAttribute('data-nav')) {
                el.classList.add('text-on-surface-variant', 'border-transparent');
            } else {
                el.classList.add('text-on-surface-variant');
            }
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = '';
        });

        // Activate the current nav
        const activeNavId = navMap[file];
        if (activeNavId) {
            const activeEl = document.getElementById(activeNavId);
            if (activeEl) {
                if (activeEl.hasAttribute('data-nav')) {
                    activeEl.classList.remove('text-on-surface-variant', 'border-transparent');
                    activeEl.classList.add('text-primary', 'bg-primary-container/20', 'border-primary');
                } else if (activeNavId === 'nav-settings-footer') {
                    activeEl.classList.remove('text-on-surface-variant');
                    activeEl.classList.add('text-primary', 'bg-surface-bright/50');
                } else if (activeNavId === 'nav-profile-footer') {
                    activeEl.classList.remove('text-on-surface-variant');
                    activeEl.classList.add('text-primary', 'bg-primary-container/20', 'shadow-[0_0_10px_rgba(173,198,255,0.3)]');
                }
                
                const icon = activeEl.querySelector('.material-symbols-outlined');
                if (icon) icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
    }
});
