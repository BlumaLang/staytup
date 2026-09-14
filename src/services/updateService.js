/**
 * Staytup Music — Real-Time Auto-Update Service
 * 
 * Automatically monitors for new deployments, pushes, and service worker updates.
 * Provides zero-latency version detection, background cache updates, and music-safe reloads.
 */

// Compile-time build information injected by Vite plugin
export const CURRENT_BUILD =
  typeof __APP_BUILD_INFO__ !== 'undefined'
    ? __APP_BUILD_INFO__
    : {
        version: '1.0.0',
        buildId: 'dev',
        buildTime: Date.now(),
        builtAt: new Date().toISOString(),
      };

class UpdateService {
  constructor() {
    this.registration = null;
    this.waitingWorker = null;
    this.isUpdateAvailable = false;
    this.serverBuildInfo = null;
    this.isChecking = false;
    this.listeners = new Set();
    this.pollingInterval = null;
    this.isRefreshing = false;
    this.hasInitialized = false;
  }

  /**
   * Subscribe to update events
   * @param {Function} callback (state) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately emit current state to new subscriber
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.warn('[UpdateService] Listener error:', err);
      }
    });
  }

  getState() {
    return {
      currentBuild: CURRENT_BUILD,
      serverBuildInfo: this.serverBuildInfo,
      isUpdateAvailable: this.isUpdateAvailable,
      isChecking: this.isChecking,
      hasWaitingWorker: !!this.waitingWorker,
    };
  }

  /**
   * Initialize Service Worker and update listeners
   */
  init() {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;

    if (!('serviceWorker' in navigator)) {
      // Still enable version.json polling even if service worker is unavailable
      this.startVersionPolling();
      return;
    }

    // Determine correct service worker path
    const isStaytupSubpath = window.location.pathname.startsWith('/staytup');
    const swPath = isStaytupSubpath ? '/staytup/sw.js' : '/sw.js';
    const scope = isStaytupSubpath ? '/staytup/' : '/';

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swPath, { scope })
        .then((reg) => {
          this.registration = reg;
          console.log('[UpdateService] Service Worker registered with scope:', reg.scope);

          // 1. Check if a worker is already waiting to activate
          if (reg.waiting) {
            console.log('[UpdateService] A service worker is already waiting.');
            this.waitingWorker = reg.waiting;
            this.setUpdateAvailable(true);
          }

          // 2. Listen for new service worker installation
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // A new version has been downloaded and is waiting
                  console.log('[UpdateService] New version downloaded and ready.');
                  this.waitingWorker = installing;
                  this.setUpdateAvailable(true);
                } else {
                  console.log('[UpdateService] App cached for offline use.');
                }
              }
            });
          });

          // 3. Kick off immediate check and background polling
          this.checkForUpdates();
          this.startVersionPolling();
        })
        .catch((err) => {
          console.warn('[UpdateService] Service worker registration error:', err);
          this.startVersionPolling();
        });
    });

    // 4. Handle Service Worker controller change (takeover by new SW)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || this.isRefreshing) return;
      console.log('[UpdateService] Controller changed — new Service Worker active.');
      // If an update was queued, apply safe reload
      if (sessionStorage.getItem('staytup_update_in_progress') === 'true') {
        refreshing = true;
        this.isRefreshing = true;
        sessionStorage.removeItem('staytup_update_in_progress');
        window.location.reload();
      }
    });

    // 5. Handle messages from Service Worker (e.g. SW_UPDATED broadcast)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[UpdateService] SW broadcasted new build:', event.data.buildId);
        this.setUpdateAvailable(true, {
          buildId: event.data.buildId,
          buildTime: Number(event.data.buildTime) || Date.now(),
        });
      }
    });
  }

  setUpdateAvailable(isAvailable, serverInfo = null) {
    this.isUpdateAvailable = isAvailable;
    if (serverInfo) {
      this.serverBuildInfo = serverInfo;
    }
    this.notify();
  }

  /**
   * Start periodic and event-driven update polling
   */
  startVersionPolling() {
    // Check every 3 minutes (180s)
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, 180000);

    // Check on window focus (when user tabs back into Staytup)
    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });

    // Check when visibility changes from hidden -> visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    });

    // Check when returning online
    window.addEventListener('online', () => {
      this.checkForUpdates();
    });
  }

  /**
   * Check for updates via both ServiceWorker.update() and live version.json
   * @returns {Promise<{hasUpdate: boolean, serverInfo: object|null}>}
   */
  async checkForUpdates() {
    if (this.isChecking) {
      return { hasUpdate: this.isUpdateAvailable, serverInfo: this.serverBuildInfo };
    }

    this.isChecking = true;
    this.notify();

    try {
      // 1. Trigger Service Worker byte check if available
      if (this.registration && typeof this.registration.update === 'function') {
        this.registration.update().catch((e) => {
          console.debug('[UpdateService] SW update check caught:', e);
        });
      }

      // 2. Fetch live version.json with cache buster
      const isStaytupSubpath = window.location.pathname.startsWith('/staytup');
      const versionUrl = (isStaytupSubpath ? '/staytup/version.json' : './version.json') + `?t=${Date.now()}`;

      const res = await fetch(versionUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const serverInfo = await res.json();
        const currentId = CURRENT_BUILD.buildId;

        // If server build ID differs from our compiled build ID and is not 'dev'
        if (
          serverInfo &&
          serverInfo.buildId &&
          currentId &&
          serverInfo.buildId !== currentId &&
          serverInfo.buildId !== 'dev'
        ) {
          console.log(
            `[UpdateService] Push detected! Current: ${currentId} -> Server: ${serverInfo.buildId}`
          );
          this.setUpdateAvailable(true, serverInfo);
          this.isChecking = false;
          this.notify();
          return { hasUpdate: true, serverInfo };
        }
      }
    } catch (err) {
      console.debug('[UpdateService] Check update error:', err);
    } finally {
      this.isChecking = false;
      this.notify();
    }

    return { hasUpdate: this.isUpdateAvailable, serverInfo: this.serverBuildInfo };
  }

  /**
   * Apply the update: trigger SKIP_WAITING and safely reload
   */
  applyUpdate() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    console.log('[UpdateService] Applying update...');

    // Safeguard against reload loops (min 10s between reloads)
    const lastReload = Number(sessionStorage.getItem('staytup_last_update_reload') || 0);
    const now = Date.now();
    if (now - lastReload < 10000) {
      console.warn('[UpdateService] Reload loop prevented.');
      return;
    }
    sessionStorage.setItem('staytup_last_update_reload', String(now));
    sessionStorage.setItem('staytup_update_in_progress', 'true');

    // 1. If we have a waiting worker, send SKIP_WAITING
    if (this.waitingWorker && typeof this.waitingWorker.postMessage === 'function') {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. Perform reload
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }
}

export const updateService = new UpdateService();
export default updateService;
