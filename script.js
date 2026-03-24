/**
 * script.js — Browser API Playground
 *
 * Implements feature detection, demos and event handling for all 30 API sections.
 *
 * Helper utilities at the top are shared across every section.
 * Each section is clearly delimited with a comment banner.
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Set the status badge for a given section.
 * @param {string} id   - Element id of the badge (e.g. 'badge-geolocation')
 * @param {'supported'|'limited'|'unsupported'|'checking'} level
 * @param {string} [label] - Optional text override
 */
function setStatus(id, level, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `badge ${level}`;
  el.textContent = label || level;
}

/**
 * Append a line to a card's output box.
 * @param {string} outputId - Id of the <div class="output"> element
 * @param {string} text     - Text to append
 * @param {'ok'|'warn'|'err'|''} [cls] - Optional colour class
 */
function log(outputId, text, cls = '') {
  const el = document.getElementById(outputId);
  if (!el) return;
  const line = document.createElement('span');
  line.className = `out-line ${cls}`.trim();
  line.textContent = text;
  if (el.textContent === 'No data yet.' || el.textContent === 'No files selected.' ||
      el.textContent.startsWith('Switch') || el.textContent.startsWith('Scroll') ||
      el.textContent.startsWith('Connect') || el.textContent === '') {
    el.textContent = '';
  }
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

/**
 * Replace all content of a card's output box with a single line.
 */
function setOutput(outputId, text, cls = '') {
  const el = document.getElementById(outputId);
  if (!el) return;
  el.textContent = '';
  const line = document.createElement('span');
  line.className = `out-line ${cls}`.trim();
  line.textContent = text;
  el.appendChild(line);
}

/**
 * Append an entry to the global event log.
 * @param {string} level - 'info' | 'ok' | 'warn' | 'error'
 * @param {string} api   - Short API name
 * @param {string} msg   - Message text
 */
function globalLog(level, api, msg) {
  const log = document.getElementById('global-event-log');
  if (!log) return;
  const placeholder = log.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();

  const entry = document.createElement('span');
  entry.className = `log-entry ${level}`;

  const ts = new Date().toLocaleTimeString();
  // Build static HTML for timestamp/label, then append msg as a text node to avoid XSS
  entry.innerHTML = `<span class="ts">[${ts}]</span> <span class="lbl">[${api}]</span>`;
  entry.appendChild(document.createTextNode(' ' + msg));

  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

/** Format bytes to KB/MB/GB string */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ══════════════════════════════════════════════════════════════════════════════
   SYSTEM OVERVIEW — displayed in hero
   ══════════════════════════════════════════════════════════════════════════════ */
function initSystemOverview() {
  const container = document.getElementById('system-overview');
  if (!container) return;

  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const chips = [
    ['🌐', browser],
    [isSecure ? '🔒' : '⚠️', isSecure ? 'Secure (HTTPS)' : 'Insecure (HTTP)'],
    [isMobile ? '📱' : '🖥️', isMobile ? 'Mobile' : 'Desktop'],
    ['👆', hasTouch ? 'Touch enabled' : 'No touch'],
    ['🔢', `DPR: ${window.devicePixelRatio ?? 1}`],
  ];

  chips.forEach(([icon, text]) => {
    const chip = document.createElement('span');
    chip.className = 'sys-chip';
    chip.textContent = `${icon} ${text}`;
    container.appendChild(chip);
  });

  globalLog('info', 'System', `Browser: ${browser}, Secure: ${isSecure}, Mobile: ${isMobile}`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   1. DEVICE ORIENTATION & MOTION
   ══════════════════════════════════════════════════════════════════════════════ */
function initDeviceOrientation() {
  const supported = 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window;
  setStatus('badge-orientation', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-orientation', 'DeviceOrientationEvent not supported.', 'err');
    return;
  }

  let listening = false;

  function orientationHandler(e) {
    setOutput('out-orientation',
      `α (compass): ${e.alpha !== null ? e.alpha.toFixed(2) + '°' : 'n/a'}\n` +
      `β (tilt X):  ${e.beta  !== null ? e.beta.toFixed(2)  + '°' : 'n/a'}\n` +
      `γ (tilt Y):  ${e.gamma !== null ? e.gamma.toFixed(2) + '°' : 'n/a'}\n` +
      `absolute:    ${e.absolute}`,
      'ok'
    );
  }

  document.getElementById('btn-orientation-start')?.addEventListener('click', async () => {
    if (listening) return;

    // iOS 13+ requires explicit permission via DeviceOrientationEvent.requestPermission()
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') {
          setOutput('out-orientation', 'Permission denied by user.', 'err');
          return;
        }
      } catch (err) {
        setOutput('out-orientation', `Permission error: ${err.message}`, 'err');
        return;
      }
    }

    window.addEventListener('deviceorientation', orientationHandler);
    listening = true;
    globalLog('ok', 'Orientation', 'Listening started');
  });

  document.getElementById('btn-orientation-stop')?.addEventListener('click', () => {
    window.removeEventListener('deviceorientation', orientationHandler);
    listening = false;
    setOutput('out-orientation', 'Stopped listening.');
    globalLog('info', 'Orientation', 'Stopped');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   2. GEOLOCATION
   ══════════════════════════════════════════════════════════════════════════════ */
function initGeolocation() {
  const supported = 'geolocation' in navigator;
  setStatus('badge-geolocation', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-geolocation', 'Geolocation not supported.', 'err');
    return;
  }

  let watchId = null;

  function formatPosition(pos) {
    const c = pos.coords;
    return `Latitude:  ${c.latitude.toFixed(6)}\n` +
           `Longitude: ${c.longitude.toFixed(6)}\n` +
           `Accuracy:  ${c.accuracy.toFixed(1)} m\n` +
           `Altitude:  ${c.altitude !== null ? c.altitude.toFixed(1) + ' m' : 'n/a'}\n` +
           `Speed:     ${c.speed   !== null ? c.speed.toFixed(1)   + ' m/s' : 'n/a'}`;
  }

  function handleError(err) {
    const msgs = {
      1: 'Permission denied.',
      2: 'Position unavailable.',
      3: 'Request timed out.',
    };
    setOutput('out-geolocation', `Error: ${msgs[err.code] ?? err.message}`, 'err');
    globalLog('error', 'Geolocation', msgs[err.code] ?? err.message);
  }

  document.getElementById('btn-geo')?.addEventListener('click', () => {
    setOutput('out-geolocation', 'Acquiring position…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOutput('out-geolocation', formatPosition(pos), 'ok');
        globalLog('ok', 'Geolocation', `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`);
      },
      handleError,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  document.getElementById('btn-geo-watch')?.addEventListener('click', () => {
    if (watchId !== null) return;
    setOutput('out-geolocation', 'Watching position…');
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setOutput('out-geolocation', `[Watching]\n${formatPosition(pos)}`, 'ok');
      },
      handleError,
      { enableHighAccuracy: true }
    );
    globalLog('info', 'Geolocation', 'watchPosition started');
  });

  document.getElementById('btn-geo-stop')?.addEventListener('click', () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      setOutput('out-geolocation', 'Watch stopped.');
      globalLog('info', 'Geolocation', 'watchPosition stopped');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   3. VIBRATION API
   ══════════════════════════════════════════════════════════════════════════════ */
function initVibration() {
  const supported = 'vibrate' in navigator;
  setStatus('badge-vibration', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-vibration', 'Vibration API not supported. (Try Android Chrome)', 'err');
    ['btn-vib-short','btn-vib-long','btn-vib-pattern'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }

  document.getElementById('btn-vib-short')?.addEventListener('click', () => {
    navigator.vibrate(150);
    setOutput('out-vibration', 'Vibrated: 150 ms', 'ok');
    globalLog('ok', 'Vibration', 'Short pulse');
  });

  document.getElementById('btn-vib-long')?.addEventListener('click', () => {
    navigator.vibrate(800);
    setOutput('out-vibration', 'Vibrated: 800 ms', 'ok');
    globalLog('ok', 'Vibration', 'Long pulse');
  });

  // SOS pattern: ... --- ... (dot=100ms, dash=300ms, gap=100ms)
  document.getElementById('btn-vib-pattern')?.addEventListener('click', () => {
    const pattern = [
      100,100, 100,100, 100,200,   // S: . . .
      300,100, 300,100, 300,200,   // O: - - -
      100,100, 100,100, 100,0      // S: . . .
    ];
    navigator.vibrate(pattern);
    setOutput('out-vibration', 'SOS pattern triggered', 'ok');
    globalLog('ok', 'Vibration', 'SOS pattern');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   4. WEB AUDIO API
   ══════════════════════════════════════════════════════════════════════════════ */
function initAudio() {
  const supported = 'AudioContext' in window || 'webkitAudioContext' in window;
  setStatus('badge-audio', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-audio', 'Web Audio API not supported.', 'err');
    return;
  }

  let ctx = null;
  let oscillator = null;
  let gainNode = null;

  const freqSlider = document.getElementById('slider-freq');
  const volSlider  = document.getElementById('slider-vol');
  const freqOut    = document.getElementById('freq-value');
  const volOut     = document.getElementById('vol-value');

  freqSlider?.addEventListener('input', () => {
    if (freqOut) freqOut.textContent = freqSlider.value;
    if (oscillator) oscillator.frequency.setTargetAtTime(Number(freqSlider.value), ctx.currentTime, 0.02);
  });

  volSlider?.addEventListener('input', () => {
    if (volOut) volOut.textContent = volSlider.value;
    if (gainNode) gainNode.gain.setTargetAtTime(Number(volSlider.value) / 100, ctx.currentTime, 0.02);
  });

  document.getElementById('btn-audio-play')?.addEventListener('click', () => {
    if (oscillator) return; // already playing

    // AudioContext must be created/resumed after a user gesture
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    ctx.resume();

    gainNode = ctx.createGain();
    gainNode.gain.value = Number(volSlider?.value ?? 50) / 100;
    gainNode.connect(ctx.destination);

    oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = Number(freqSlider?.value ?? 440);
    oscillator.connect(gainNode);
    oscillator.start();

    setOutput('out-audio', `Playing sine tone @ ${oscillator.frequency.value} Hz`, 'ok');
    globalLog('ok', 'WebAudio', `Tone started @ ${oscillator.frequency.value} Hz`);
  });

  document.getElementById('btn-audio-stop')?.addEventListener('click', () => {
    if (!oscillator) return;
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
    gainNode?.disconnect();
    gainNode = null;
    setOutput('out-audio', 'Tone stopped.');
    globalLog('info', 'WebAudio', 'Tone stopped');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   5. BATTERY STATUS API
   ══════════════════════════════════════════════════════════════════════════════ */
function initBattery() {
  // Battery Status API is only in Chromium; marked deprecated in spec
  const supported = 'getBattery' in navigator;
  setStatus('badge-battery', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-battery', 'Battery Status API not supported. (Chromium only)', 'err');
    const btn = document.getElementById('btn-battery');
    if (btn) btn.disabled = true;
    return;
  }

  function renderBattery(b) {
    const pct = Math.round(b.level * 100);
    setOutput('out-battery',
      `Level:    ${pct}%\n` +
      `Charging: ${b.charging ? '⚡ Yes' : '🔋 No'}\n` +
      `Time to charge:    ${b.chargingTime === Infinity ? 'n/a' : b.chargingTime + ' s'}\n` +
      `Time to discharge: ${b.dischargingTime === Infinity ? 'n/a' : b.dischargingTime + ' s'}`,
      'ok'
    );
    globalLog('ok', 'Battery', `${pct}% ${b.charging ? 'charging' : 'discharging'}`);
  }

  document.getElementById('btn-battery')?.addEventListener('click', () => {
    navigator.getBattery().then((battery) => {
      renderBattery(battery);
      battery.addEventListener('levelchange',    () => renderBattery(battery));
      battery.addEventListener('chargingchange', () => renderBattery(battery));
    }).catch(err => {
      setOutput('out-battery', `Error: ${err.message}`, 'err');
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   6. NETWORK INFORMATION API
   ══════════════════════════════════════════════════════════════════════════════ */
function initNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const supported = !!conn;
  setStatus('badge-network', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-network', 'Network Information API not supported. (Chromium only)', 'err');
    const btn = document.getElementById('btn-network');
    if (btn) btn.disabled = true;
    return;
  }

  function renderConn() {
    setOutput('out-network',
      `Type:           ${conn.type        ?? 'n/a'}\n` +
      `Effective type: ${conn.effectiveType ?? 'n/a'}\n` +
      `Downlink:       ${conn.downlink     ?? 'n/a'} Mbps\n` +
      `RTT:            ${conn.rtt          ?? 'n/a'} ms\n` +
      `Save-data:      ${conn.saveData     ?? false}`,
      'ok'
    );
    globalLog('ok', 'Network', `${conn.effectiveType} @ ${conn.downlink ?? '?'} Mbps`);
  }

  document.getElementById('btn-network')?.addEventListener('click', renderConn);
  conn.addEventListener('change', () => {
    renderConn();
    globalLog('warn', 'Network', 'Connection changed');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   7. ONLINE / OFFLINE STATUS
   ══════════════════════════════════════════════════════════════════════════════ */
function initOnlineStatus() {
  setStatus('badge-online', 'supported');

  const banner = document.getElementById('offline-banner');

  function update() {
    const online = navigator.onLine;
    setOutput('out-online', `Status: ${online ? '🟢 Online' : '🔴 Offline'}`, online ? 'ok' : 'err');
    if (banner) banner.classList.toggle('hidden', online);
    globalLog(online ? 'ok' : 'warn', 'Online', online ? 'Back online' : 'Gone offline');
  }

  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update(); // immediate check

  document.getElementById('btn-online-check')?.addEventListener('click', update);
}

/* ══════════════════════════════════════════════════════════════════════════════
   8. PAGE VISIBILITY API
   ══════════════════════════════════════════════════════════════════════════════ */
function initPageVisibility() {
  const supported = 'hidden' in document;
  setStatus('badge-visibility', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-visibility', 'Page Visibility API not supported.', 'err');
    return;
  }

  function update() {
    const state = document.visibilityState;
    log('out-visibility', `[${new Date().toLocaleTimeString()}] visibilityState: ${state}`, state === 'visible' ? 'ok' : 'warn');
    globalLog(state === 'visible' ? 'ok' : 'warn', 'Visibility', state);
  }

  document.addEventListener('visibilitychange', update);
  document.getElementById('btn-visibility-check')?.addEventListener('click', update);
  setOutput('out-visibility', `Current state: ${document.visibilityState}`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   9. CLIPBOARD API
   ══════════════════════════════════════════════════════════════════════════════ */
function initClipboard() {
  // Async clipboard requires a secure context (HTTPS / localhost)
  const supported = !!navigator.clipboard && window.isSecureContext;
  const legacySupport = document.queryCommandSupported?.('copy');
  setStatus('badge-clipboard', supported ? 'supported' : legacySupport ? 'limited' : 'unsupported');
  if (!supported && !legacySupport) {
    setOutput('out-clipboard', 'Clipboard API not supported.', 'err');
    return;
  }

  document.getElementById('btn-copy')?.addEventListener('click', async () => {
    const text = document.getElementById('clipboard-input')?.value ?? '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for insecure contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setOutput('out-clipboard', `✅ Copied: "${text}"`, 'ok');
      globalLog('ok', 'Clipboard', 'Text copied');
    } catch (err) {
      setOutput('out-clipboard', `Error copying: ${err.message}`, 'err');
      globalLog('error', 'Clipboard', err.message);
    }
  });

  document.getElementById('btn-paste')?.addEventListener('click', async () => {
    if (!navigator.clipboard || !window.isSecureContext) {
      setOutput('out-clipboard', 'Clipboard read requires HTTPS.', 'warn');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      setOutput('out-clipboard', `📄 Clipboard contains:\n"${text}"`, 'ok');
      globalLog('ok', 'Clipboard', 'Text read from clipboard');
    } catch (err) {
      setOutput('out-clipboard', `Error reading: ${err.message}`, 'err');
      globalLog('error', 'Clipboard', err.message);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   10. FULLSCREEN API
   ══════════════════════════════════════════════════════════════════════════════ */
function initFullscreen() {
  const supported = document.documentElement.requestFullscreen ||
                    document.documentElement.webkitRequestFullscreen;
  setStatus('badge-fullscreen', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-fullscreen', 'Fullscreen API not supported.', 'err');
    return;
  }

  function updateStatus() {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    setOutput('out-fullscreen', `Fullscreen: ${fs ? '✅ Active' : '❌ Inactive'}`, fs ? 'ok' : '');
    globalLog('info', 'Fullscreen', fs ? 'Entered' : 'Exited');
  }

  document.addEventListener('fullscreenchange',       updateStatus);
  document.addEventListener('webkitfullscreenchange', updateStatus);

  document.getElementById('btn-fullscreen')?.addEventListener('click', async () => {
    try {
      const el = document.getElementById('sec-fullscreen');
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (err) {
      setOutput('out-fullscreen', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-exit-fullscreen')?.addEventListener('click', () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   11. WAKE LOCK API
   ══════════════════════════════════════════════════════════════════════════════ */
function initWakeLock() {
  const supported = 'wakeLock' in navigator;
  setStatus('badge-wakelock', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-wakelock', 'Wake Lock API not supported. Requires HTTPS + Chrome/Edge 84+.', 'err');
    ['btn-wakelock-on','btn-wakelock-off'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }

  let wakeLock = null;

  document.getElementById('btn-wakelock-on')?.addEventListener('click', async () => {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      setOutput('out-wakelock', '🔆 Wake Lock acquired — screen will stay on.', 'ok');
      globalLog('ok', 'WakeLock', 'Acquired');

      wakeLock.addEventListener('release', () => {
        setOutput('out-wakelock', 'Wake Lock released (e.g. tab hidden).');
        globalLog('warn', 'WakeLock', 'Released');
      });
    } catch (err) {
      setOutput('out-wakelock', `Error: ${err.name} — ${err.message}`, 'err');
      globalLog('error', 'WakeLock', err.message);
    }
  });

  document.getElementById('btn-wakelock-off')?.addEventListener('click', async () => {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      setOutput('out-wakelock', 'Wake Lock released.');
      globalLog('info', 'WakeLock', 'Released manually');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   12. WEB SHARE API
   ══════════════════════════════════════════════════════════════════════════════ */
function initWebShare() {
  const supported = 'share' in navigator;
  setStatus('badge-share', supported ? 'supported' : 'unsupported');

  const btn = document.getElementById('btn-share');
  if (!supported) {
    setOutput('out-share', 'Web Share API not supported. (Mobile / Safari / some desktops)', 'err');
    if (btn) btn.disabled = true;
    return;
  }

  btn?.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Browser API Playground',
        text: 'Check out this interactive showcase of modern browser APIs!',
        url: location.href,
      });
      setOutput('out-share', '✅ Shared successfully!', 'ok');
      globalLog('ok', 'WebShare', 'Shared');
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'Share cancelled.' : `Error: ${err.message}`;
      setOutput('out-share', msg, err.name === 'AbortError' ? 'warn' : 'err');
      globalLog(err.name === 'AbortError' ? 'warn' : 'error', 'WebShare', msg);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   13. NOTIFICATION API
   ══════════════════════════════════════════════════════════════════════════════ */
function initNotifications() {
  const supported = 'Notification' in window;
  setStatus('badge-notification', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-notification', 'Notification API not supported.', 'err');
    ['btn-notif-perm','btn-notif-send'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }

  function showPermissionState() {
    setOutput('out-notification', `Permission: ${Notification.permission}`,
      Notification.permission === 'granted' ? 'ok' : 'warn');
  }

  showPermissionState();

  document.getElementById('btn-notif-perm')?.addEventListener('click', async () => {
    const perm = await Notification.requestPermission();
    showPermissionState();
    globalLog(perm === 'granted' ? 'ok' : 'warn', 'Notifications', `Permission: ${perm}`);
  });

  document.getElementById('btn-notif-send')?.addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      setOutput('out-notification', 'Permission not granted. Click "Request Permission" first.', 'warn');
      return;
    }
    const n = new Notification('Browser API Playground 🧪', {
      body: 'Notification API works in your browser!',
    });
    n.onclick = () => window.focus();
    setOutput('out-notification', '✅ Notification sent!', 'ok');
    globalLog('ok', 'Notifications', 'Test notification sent');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   14. SPEECH SYNTHESIS
   ══════════════════════════════════════════════════════════════════════════════ */
function initSpeechSynthesis() {
  const supported = 'speechSynthesis' in window;
  setStatus('badge-speech-synth', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-speech-synth', 'Speech Synthesis API not supported.', 'err');
    return;
  }

  const select = document.getElementById('voice-select');

  function populateVoices() {
    const voices = speechSynthesis.getVoices();
    if (!select || voices.length === 0) return;
    select.innerHTML = '';
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      select.appendChild(opt);
    });
    setOutput('out-speech-synth', `${voices.length} voices available.`, 'ok');
  }

  speechSynthesis.addEventListener('voiceschanged', populateVoices);
  populateVoices();

  document.getElementById('btn-tts-speak')?.addEventListener('click', () => {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    const text = document.getElementById('tts-input')?.value.trim();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const idx = Number(select?.value ?? 0);
    if (voices[idx]) utter.voice = voices[idx];
    utter.onstart = () => setOutput('out-speech-synth', `🔊 Speaking: "${text}"`, 'ok');
    utter.onend   = () => log('out-speech-synth', 'Done.', 'ok');
    utter.onerror = (e) => setOutput('out-speech-synth', `Error: ${e.error}`, 'err');
    speechSynthesis.speak(utter);
    globalLog('ok', 'TTS', `Speaking: "${text.substring(0, 40)}"`);
  });

  document.getElementById('btn-tts-stop')?.addEventListener('click', () => {
    speechSynthesis.cancel();
    setOutput('out-speech-synth', 'Stopped.');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   15. SPEECH RECOGNITION
   ══════════════════════════════════════════════════════════════════════════════ */
function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;
  setStatus('badge-speech-rec', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-speech-rec', 'Speech Recognition not supported. (Chrome/Edge only, needs HTTPS)', 'err');
    ['btn-rec-start','btn-rec-stop'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    return;
  }

  let recognition = null;

  document.getElementById('btn-rec-start')?.addEventListener('click', () => {
    if (recognition) return;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      setOutput('out-speech-rec', '🎤 Listening…');
      globalLog('info', 'SpeechRec', 'Started');
    };

    recognition.onresult = (e) => {
      let interim = '', final = '';
      for (const res of e.results) {
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      setOutput('out-speech-rec', `Final: "${final}"\nInterim: "${interim}"`, 'ok');
    };

    recognition.onerror = (e) => {
      setOutput('out-speech-rec', `Error: ${e.error}`, 'err');
      globalLog('error', 'SpeechRec', e.error);
      recognition = null;
    };

    recognition.onend = () => {
      globalLog('info', 'SpeechRec', 'Ended');
      recognition = null;
    };

    recognition.start();
  });

  document.getElementById('btn-rec-stop')?.addEventListener('click', () => {
    recognition?.stop();
    recognition = null;
    setOutput('out-speech-rec', 'Stopped.');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   16. MEDIADEVICES API
   ══════════════════════════════════════════════════════════════════════════════ */
function initMediaDevices() {
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  setStatus('badge-mediadevices', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-mediadevices', 'MediaDevices API not supported. Requires HTTPS.', 'err');
    return;
  }

  let stream = null;

  document.getElementById('btn-enumerate')?.addEventListener('click', async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const lines = devices.map(d =>
        `[${d.kind}] ${d.label || '(hidden — grant permission first)'}`
      );
      setOutput('out-mediadevices', lines.join('\n'), 'ok');
      globalLog('ok', 'MediaDevices', `${devices.length} devices found`);
    } catch (err) {
      setOutput('out-mediadevices', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-camera')?.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = document.getElementById('camera-preview');
      if (video) {
        video.srcObject = stream;
        video.classList.add('active');
      }
      setOutput('out-mediadevices', '📷 Camera stream active.', 'ok');
      globalLog('ok', 'MediaDevices', 'Camera started');
    } catch (err) {
      setOutput('out-mediadevices', `Error: ${err.name} — ${err.message}`, 'err');
      globalLog('error', 'MediaDevices', err.message);
    }
  });

  document.getElementById('btn-camera-stop')?.addEventListener('click', () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const video = document.getElementById('camera-preview');
    if (video) {
      video.srcObject = null;
      video.classList.remove('active');
    }
    setOutput('out-mediadevices', 'Camera stopped.');
    globalLog('info', 'MediaDevices', 'Camera stopped');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   17. DRAG & DROP + FILE API
   ══════════════════════════════════════════════════════════════════════════════ */
function initDragDrop() {
  const supported = 'DataTransfer' in window;
  setStatus('badge-dragdrop', supported ? 'supported' : 'limited');

  const zone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  if (!zone) return;

  function handleFiles(files) {
    if (!files || files.length === 0) {
      setOutput('out-dragdrop', 'No files selected.');
      return;
    }
    let output = '';
    const previews = [];

    Array.from(files).forEach((file, i) => {
      output += `File ${i + 1}: ${file.name}\n  Type: ${file.type || 'unknown'}\n  Size: ${formatBytes(file.size)}\n\n`;
      if (file.type.startsWith('image/')) {
        previews.push(file);
      }
    });

    setOutput('out-dragdrop', output.trim(), 'ok');
    globalLog('ok', 'DragDrop', `${files.length} file(s) received`);

    // Show image previews below the output
    const existing = zone.querySelectorAll('.file-preview');
    existing.forEach(e => e.remove());

    previews.slice(0, 4).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'file-preview';
        img.style.cssText = 'max-height:80px;max-width:100%;border-radius:4px;margin-top:8px;display:block;';
        zone.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  zone.addEventListener('click', () => fileInput?.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); });
  fileInput?.addEventListener('change', (e) => handleFiles(e.target.files));

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   18. LOCALSTORAGE / SESSIONSTORAGE
   ══════════════════════════════════════════════════════════════════════════════ */
function initStorage() {
  let lsOk = false, ssOk = false;
  try { localStorage.setItem('__test', '1'); localStorage.removeItem('__test'); lsOk = true; } catch(_) {}
  try { sessionStorage.setItem('__test', '1'); sessionStorage.removeItem('__test'); ssOk = true; } catch(_) {}
  setStatus('badge-storage', lsOk && ssOk ? 'supported' : lsOk || ssOk ? 'limited' : 'unsupported');

  document.getElementById('btn-ls-save')?.addEventListener('click', () => {
    const key = document.getElementById('storage-key')?.value;
    const val = document.getElementById('storage-val')?.value;
    if (!key) return;
    try {
      localStorage.setItem(key, val);
      setOutput('out-storage', `localStorage["${key}"] = "${val}"`, 'ok');
      globalLog('ok', 'Storage', `localStorage set: ${key}`);
    } catch (err) {
      setOutput('out-storage', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-ls-load')?.addEventListener('click', () => {
    const key = document.getElementById('storage-key')?.value;
    if (!key) return;
    const lsVal = localStorage.getItem(key);
    const ssVal = sessionStorage.getItem(key);
    setOutput('out-storage',
      `localStorage["${key}"]  = ${lsVal !== null ? '"' + lsVal + '"' : 'null'}\n` +
      `sessionStorage["${key}"] = ${ssVal !== null ? '"' + ssVal + '"' : 'null'}`,
      lsVal !== null || ssVal !== null ? 'ok' : 'warn'
    );
  });

  document.getElementById('btn-ls-clear')?.addEventListener('click', () => {
    const key = document.getElementById('storage-key')?.value;
    if (key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      setOutput('out-storage', `Removed key "${key}" from both stores.`, 'ok');
    } else {
      localStorage.clear();
      sessionStorage.clear();
      setOutput('out-storage', 'All storage cleared.', 'warn');
    }
    globalLog('warn', 'Storage', `Cleared: ${key || 'ALL'}`);
  });

  document.getElementById('btn-ss-save')?.addEventListener('click', () => {
    const key = document.getElementById('storage-key')?.value;
    const val = document.getElementById('storage-val')?.value;
    if (!key) return;
    try {
      sessionStorage.setItem(key, val);
      setOutput('out-storage', `sessionStorage["${key}"] = "${val}"`, 'ok');
      globalLog('ok', 'Storage', `sessionStorage set: ${key}`);
    } catch (err) {
      setOutput('out-storage', `Error: ${err.message}`, 'err');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   19. INDEXEDDB
   ══════════════════════════════════════════════════════════════════════════════ */
function initIndexedDB() {
  const supported = 'indexedDB' in window;
  setStatus('badge-indexeddb', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-indexeddb', 'IndexedDB not supported.', 'err');
    return;
  }

  const DB_NAME = 'BrowserPlayground';
  const STORE   = 'records';
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  document.getElementById('btn-idb-put')?.addEventListener('click', async () => {
    const key = document.getElementById('idb-key')?.value;
    const val = document.getElementById('idb-val')?.value;
    if (!key) return;
    try {
      const database = await openDB();
      const tx = database.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: key, value: val, ts: Date.now() });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      setOutput('out-indexeddb', `Saved: { id: "${key}", value: "${val}" }`, 'ok');
      globalLog('ok', 'IndexedDB', `put: ${key}`);
    } catch (err) {
      setOutput('out-indexeddb', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-idb-get')?.addEventListener('click', async () => {
    const key = document.getElementById('idb-key')?.value;
    if (!key) return;
    try {
      const database = await openDB();
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const record = req.result;
        setOutput('out-indexeddb',
          record
            ? `Found: { id: "${record.id}", value: "${record.value}" }`
            : `No record found for key "${key}"`,
          record ? 'ok' : 'warn'
        );
      };
    } catch (err) {
      setOutput('out-indexeddb', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-idb-list')?.addEventListener('click', async () => {
    try {
      const database = await openDB();
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const records = req.result;
        if (records.length === 0) {
          setOutput('out-indexeddb', 'Store is empty.');
        } else {
          setOutput('out-indexeddb',
            records.map(r => `id: "${r.id}" → "${r.value}"`).join('\n'),
            'ok'
          );
        }
        globalLog('ok', 'IndexedDB', `Listed ${records.length} record(s)`);
      };
    } catch (err) {
      setOutput('out-indexeddb', `Error: ${err.message}`, 'err');
    }
  });

  document.getElementById('btn-idb-delete')?.addEventListener('click', async () => {
    const key = document.getElementById('idb-key')?.value;
    if (!key) return;
    try {
      const database = await openDB();
      const tx = database.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      setOutput('out-indexeddb', `Deleted key "${key}"`, 'ok');
      globalLog('warn', 'IndexedDB', `deleted: ${key}`);
    } catch (err) {
      setOutput('out-indexeddb', `Error: ${err.message}`, 'err');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   20. SERVICE WORKER
   ══════════════════════════════════════════════════════════════════════════════ */
function initServiceWorker() {
  const supported = 'serviceWorker' in navigator;
  setStatus('badge-sw', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-sw', 'Service Workers not supported. Requires HTTPS.', 'err');
    return;
  }

  async function checkStatus() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      setOutput('out-sw', 'No service worker registered yet.\nRegistering sw.js…');
      try {
        const r = await navigator.serviceWorker.register('./sw.js');
        setOutput('out-sw', `✅ Registered: ${r.scope}\nState: ${r.active?.state ?? 'installing…'}`, 'ok');
        globalLog('ok', 'ServiceWorker', 'Registered');
      } catch (err) {
        setOutput('out-sw', `Registration failed: ${err.message}`, 'err');
        globalLog('error', 'ServiceWorker', err.message);
      }
    } else {
      setOutput('out-sw',
        `✅ Registered\nScope: ${reg.scope}\nState: ${reg.active?.state ?? reg.installing?.state ?? 'waiting'}`,
        'ok'
      );
      globalLog('ok', 'ServiceWorker', `Active at ${reg.scope}`);
    }
  }

  document.getElementById('btn-sw-status')?.addEventListener('click', checkStatus);

  document.getElementById('btn-sw-unregister')?.addEventListener('click', async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.unregister();
      setOutput('out-sw', 'Service Worker unregistered.', 'warn');
      globalLog('warn', 'ServiceWorker', 'Unregistered');
    } else {
      setOutput('out-sw', 'No registration found.');
    }
  });

  // Auto-register on page load
  checkStatus();
}

/* ══════════════════════════════════════════════════════════════════════════════
   21. HISTORY API
   ══════════════════════════════════════════════════════════════════════════════ */
function initHistory() {
  const supported = 'pushState' in history;
  setStatus('badge-history', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-history', 'History API not supported.', 'err');
    return;
  }

  let stateCounter = 0;

  function renderState() {
    setOutput('out-history',
      `URL:   ${location.href}\nState: ${JSON.stringify(history.state)}\nLength: ${history.length}`,
      'ok'
    );
  }

  window.addEventListener('popstate', (e) => {
    log('out-history', `popstate — state: ${JSON.stringify(e.state)}`, 'warn');
    globalLog('warn', 'History', `popstate: ${JSON.stringify(e.state)}`);
  });

  document.getElementById('btn-history-push')?.addEventListener('click', () => {
    stateCounter++;
    const state = { step: stateCounter, ts: Date.now() };
    history.pushState(state, '', `?step=${stateCounter}`);
    renderState();
    globalLog('ok', 'History', `pushState step=${stateCounter}`);
  });

  document.getElementById('btn-history-replace')?.addEventListener('click', () => {
    const state = { replaced: true, ts: Date.now() };
    history.replaceState(state, '', `?replaced=1`);
    renderState();
    globalLog('ok', 'History', 'replaceState');
  });

  document.getElementById('btn-history-back')?.addEventListener('click', () => {
    history.back();
    globalLog('info', 'History', 'back()');
  });

  renderState();
}

/* ══════════════════════════════════════════════════════════════════════════════
   22. MATCHMEDIA / prefers-color-scheme
   ══════════════════════════════════════════════════════════════════════════════ */
function initMatchMedia() {
  const supported = 'matchMedia' in window;
  setStatus('badge-matchmedia', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-matchmedia', 'matchMedia not supported.', 'err');
    return;
  }

  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverMQ = window.matchMedia('(hover: hover)');

  function render() {
    setOutput('out-matchmedia',
      `prefers-color-scheme:  ${darkMQ.matches    ? '🌙 dark' : '☀️ light'}\n` +
      `prefers-reduced-motion: ${reducedMQ.matches ? 'yes (reduce)' : 'no'}\n` +
      `hover capable:         ${hoverMQ.matches   ? 'yes' : 'no'}\n` +
      `viewport width:        ${window.innerWidth}px`,
      'ok'
    );
  }

  darkMQ.addEventListener('change', (e) => {
    render();
    globalLog('warn', 'MatchMedia', `color-scheme changed → ${e.matches ? 'dark' : 'light'}`);
  });

  document.getElementById('btn-matchmedia')?.addEventListener('click', render);
  render();
}

/* ══════════════════════════════════════════════════════════════════════════════
   23. POINTER / TOUCH / MOUSE EVENTS
   ══════════════════════════════════════════════════════════════════════════════ */
function initPointerEvents() {
  const supported = 'PointerEvent' in window;
  setStatus('badge-pointer', supported ? 'supported' : 'limited');

  const canvas = document.getElementById('pointer-canvas');
  if (!canvas) return;

  // Remove the static hint once interaction starts
  let hintRemoved = false;

  function handlePointer(e) {
    if (!hintRemoved) {
      const hint = canvas.querySelector('.pointer-hint');
      if (hint) hint.remove();
      hintRemoved = true;
    }

    // Draw a fading dot at pointer position
    const rect = canvas.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'pointer-dot';
    dot.style.left = `${e.clientX - rect.left}px`;
    dot.style.top  = `${e.clientY - rect.top}px`;
    canvas.appendChild(dot);
    setTimeout(() => dot.remove(), 600);

    setOutput('out-pointer',
      `type:    ${e.type}\n` +
      `pointerId: ${e.pointerId}\n` +
      `pointerType: ${e.pointerType || 'mouse'}\n` +
      `x: ${(e.clientX - rect.left).toFixed(1)}  y: ${(e.clientY - rect.top).toFixed(1)}\n` +
      `pressure: ${e.pressure.toFixed(2)}`,
      'ok'
    );
  }

  canvas.addEventListener('pointermove', handlePointer);
  canvas.addEventListener('pointerdown', (e) => {
    handlePointer(e);
    globalLog('info', 'Pointer', `down at (${e.clientX.toFixed(0)}, ${e.clientY.toFixed(0)})`);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   24. GAMEPAD API
   ══════════════════════════════════════════════════════════════════════════════ */
function initGamepad() {
  const supported = 'getGamepads' in navigator;
  setStatus('badge-gamepad', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-gamepad', 'Gamepad API not supported.', 'err');
    return;
  }

  let rafId = null;

  window.addEventListener('gamepadconnected', (e) => {
    setOutput('out-gamepad', `🎮 Gamepad connected: "${e.gamepad.id}" (${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes)`, 'ok');
    globalLog('ok', 'Gamepad', `Connected: ${e.gamepad.id}`);
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    setOutput('out-gamepad', `Gamepad disconnected: "${e.gamepad.id}"`, 'warn');
    globalLog('warn', 'Gamepad', `Disconnected: ${e.gamepad.id}`);
  });

  function pollGamepads() {
    const pads = navigator.getGamepads();
    for (const gp of pads) {
      if (!gp) continue;
      const buttons = gp.buttons.map((b, i) => b.pressed ? `[${i}]` : '').filter(Boolean).join(' ') || '—';
      const axes = gp.axes.map(a => a.toFixed(2)).join(', ');
      setOutput('out-gamepad',
        `Gamepad: "${gp.id}"\n` +
        `Pressed: ${buttons}\n` +
        `Axes:    [${axes}]`,
        'ok'
      );
    }
    rafId = requestAnimationFrame(pollGamepads);
  }

  document.getElementById('btn-gamepad-poll')?.addEventListener('click', () => {
    if (!rafId) pollGamepads();
  });

  document.getElementById('btn-gamepad-stop')?.addEventListener('click', () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    setOutput('out-gamepad', 'Polling stopped.');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   25. WEB WORKER
   ══════════════════════════════════════════════════════════════════════════════ */
function initWebWorker() {
  const supported = 'Worker' in window;
  setStatus('badge-worker', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-worker', 'Web Workers not supported.', 'err');
    return;
  }

  // Inline Worker via Blob URL — no separate file needed
  const workerCode = `
    self.onmessage = function(e) {
      const n = e.data;
      function fib(x) {
        if (x <= 1) return x;
        return fib(x - 1) + fib(x - 2);
      }
      const start = performance.now();
      const result = fib(n);
      const duration = (performance.now() - start).toFixed(2);
      self.postMessage({ result, duration, n });
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);

  // Deliberately naive recursive Fibonacci (O(2^n)) — used intentionally so the
  // performance difference between the Worker and main thread is clearly visible.
  function fib(x) { return x <= 1 ? x : fib(x - 1) + fib(x - 2); }

  document.getElementById('btn-worker-run')?.addEventListener('click', () => {
    const n = parseInt(document.getElementById('worker-n')?.value ?? '40', 10);
    setOutput('out-worker', `Running fib(${n}) in Worker…`);
    const worker = new Worker(workerUrl);
    worker.onmessage = (e) => {
      const { result, duration } = e.data;
      setOutput('out-worker', `fib(${n}) = ${result}\nWorker time: ${duration} ms`, 'ok');
      globalLog('ok', 'WebWorker', `fib(${n}) done in ${duration} ms`);
      worker.terminate();
    };
    worker.onerror = (err) => {
      setOutput('out-worker', `Worker error: ${err.message}`, 'err');
      worker.terminate();
    };
    worker.postMessage(n);
  });

  document.getElementById('btn-worker-main')?.addEventListener('click', () => {
    const n = parseInt(document.getElementById('worker-n')?.value ?? '40', 10);
    const start = performance.now();
    const result = fib(n);
    const duration = (performance.now() - start).toFixed(2);
    setOutput('out-worker', `fib(${n}) = ${result}\nMain thread time: ${duration} ms\n⚠️  Main thread was blocked during this computation.`, 'warn');
    globalLog('warn', 'WebWorker', `Main thread fib(${n}) took ${duration} ms`);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   26. PERFORMANCE API
   ══════════════════════════════════════════════════════════════════════════════ */
function initPerformance() {
  const supported = 'performance' in window;
  setStatus('badge-performance', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-performance', 'Performance API not supported.', 'err');
    return;
  }

  document.getElementById('btn-perf')?.addEventListener('click', () => {
    const nav = performance.getEntriesByType('navigation')[0] || performance.timing;
    const now = performance.now().toFixed(2);

    let text = `performance.now(): ${now} ms\n\n`;

    // Navigation Timing Level 2 (modern API)
    if (nav && nav.responseEnd !== undefined) {
      const dns  = (nav.domainLookupEnd - nav.domainLookupStart).toFixed(1);
      const tcp  = (nav.connectEnd - nav.connectStart).toFixed(1);
      const ttfb = (nav.responseStart - nav.requestStart).toFixed(1);
      const dl   = (nav.responseEnd - nav.responseStart).toFixed(1);
      const dom  = (nav.domContentLoadedEventEnd - nav.startTime).toFixed(1);
      const load = (nav.loadEventEnd - nav.startTime).toFixed(1);

      text += `DNS lookup:  ${dns} ms\n` +
              `TCP connect: ${tcp} ms\n` +
              `TTFB:        ${ttfb} ms\n` +
              `Download:    ${dl} ms\n` +
              `DOMContentLoaded: ${dom} ms\n` +
              `Load complete:    ${load} ms\n`;
    }

    // Memory (Chrome only)
    if (performance.memory) {
      const mem = performance.memory;
      text += `\nJS heap used: ${formatBytes(mem.usedJSHeapSize)}\n` +
              `JS heap total: ${formatBytes(mem.totalJSHeapSize)}\n` +
              `JS heap limit: ${formatBytes(mem.jsHeapSizeLimit)}`;
    }

    setOutput('out-performance', text, 'ok');
    globalLog('ok', 'Performance', `now=${now}ms`);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   27. INTERSECTION OBSERVER
   ══════════════════════════════════════════════════════════════════════════════ */
function initIntersectionObserver() {
  const supported = 'IntersectionObserver' in window;
  setStatus('badge-intersection', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-intersection', 'IntersectionObserver not supported.', 'err');
    return;
  }

  const container = document.getElementById('scroll-container');
  if (!container) return;

  const items = container.querySelectorAll('.scroll-item');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = entry.target.dataset.idx;
        entry.target.classList.toggle('visible', entry.isIntersecting);
        log('out-intersection',
          `Block ${idx}: ${entry.isIntersecting ? '✅ visible' : '❌ hidden'}`,
          entry.isIntersecting ? 'ok' : ''
        );
        globalLog(entry.isIntersecting ? 'ok' : 'info', 'IntersectionObs',
          `Block ${idx} ${entry.isIntersecting ? 'entered' : 'left'} viewport`);
      });
    },
    { root: container, threshold: 0.5 }
  );

  items.forEach(item => observer.observe(item));
}

/* ══════════════════════════════════════════════════════════════════════════════
   28. RESIZE OBSERVER
   ══════════════════════════════════════════════════════════════════════════════ */
function initResizeObserver() {
  const supported = 'ResizeObserver' in window;
  setStatus('badge-resize', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-resize', 'ResizeObserver not supported.', 'err');
    return;
  }

  const box = document.getElementById('resize-box');
  if (!box) return;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      setOutput('out-resize', `Width: ${width.toFixed(1)} px\nHeight: ${height.toFixed(1)} px`, 'ok');
    }
  });

  observer.observe(box);
}

/* ══════════════════════════════════════════════════════════════════════════════
   29. SCREEN & WINDOW INFO
   ══════════════════════════════════════════════════════════════════════════════ */
function initScreenInfo() {
  setStatus('badge-screen', 'supported');

  function render() {
    const o = screen.orientation || {};
    setOutput('out-screen',
      `Screen:   ${screen.width} × ${screen.height} px\n` +
      `Available: ${screen.availWidth} × ${screen.availHeight} px\n` +
      `Color depth: ${screen.colorDepth} bit\n` +
      `Pixel ratio: ${window.devicePixelRatio}\n` +
      `Viewport:  ${window.innerWidth} × ${window.innerHeight} px\n` +
      `Orientation: ${o.type ?? 'n/a'} (${o.angle ?? '?'}°)`,
      'ok'
    );
    globalLog('ok', 'Screen', `${screen.width}×${screen.height} dpr=${window.devicePixelRatio}`);
  }

  document.getElementById('btn-screen')?.addEventListener('click', render);

  screen.orientation?.addEventListener('change', () => {
    render();
    globalLog('warn', 'Screen', `Orientation changed → ${screen.orientation.type}`);
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   30. CRYPTO API
   ══════════════════════════════════════════════════════════════════════════════ */
function initCrypto() {
  const supported = 'crypto' in window && 'getRandomValues' in crypto;
  const subtleOk  = 'subtle' in crypto;
  setStatus('badge-crypto', supported ? 'supported' : 'unsupported');
  if (!supported) {
    setOutput('out-crypto', 'Crypto API not supported.', 'err');
    return;
  }

  document.getElementById('btn-crypto-rand')?.addEventListener('click', () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    setOutput('out-crypto', `16 random bytes:\n${bufToHex(arr.buffer)}`, 'ok');
    globalLog('ok', 'Crypto', 'Random bytes generated');
  });

  document.getElementById('btn-crypto-hash')?.addEventListener('click', async () => {
    if (!subtleOk) {
      setOutput('out-crypto', 'SubtleCrypto not available (requires HTTPS).', 'warn');
      return;
    }
    const text = document.getElementById('hash-input')?.value ?? '';
    try {
      const encoded = new TextEncoder().encode(text);
      const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
      const hex = bufToHex(hashBuf);
      setOutput('out-crypto', `SHA-256("${text.substring(0, 30)}${text.length > 30 ? '…' : ''}")\n= ${hex}`, 'ok');
      globalLog('ok', 'Crypto', `SHA-256 hash computed (${hex.substring(0, 16)}…)`);
    } catch (err) {
      setOutput('out-crypto', `Error: ${err.message}`, 'err');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   NAV TOGGLE
   ══════════════════════════════════════════════════════════════════════════════ */
function initNav() {
  const toggle = document.getElementById('toc-toggle');
  const list   = document.getElementById('toc-list');
  if (!toggle || !list) return;

  toggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Close when a link is clicked
  list.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      list.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   GLOBAL EVENT LOG CONTROLS
   ══════════════════════════════════════════════════════════════════════════════ */
function initEventLog() {
  document.getElementById('btn-clear-log')?.addEventListener('click', () => {
    const log = document.getElementById('global-event-log');
    if (log) {
      log.innerHTML = '<p class="log-placeholder">Log cleared.</p>';
    }
  });

  document.getElementById('btn-run-all')?.addEventListener('click', () => {
    globalLog('info', 'RunAll', 'Running all auto-runnable tests…');
    // Trigger auto-readable APIs that don't need user input
    document.getElementById('btn-online-check')?.click();
    document.getElementById('btn-matchmedia')?.click();
    document.getElementById('btn-screen')?.click();
    document.getElementById('btn-perf')?.click();
    document.getElementById('btn-network')?.click();
    document.getElementById('btn-battery')?.click();
    document.getElementById('btn-visibility-check')?.click();
    globalLog('ok', 'RunAll', 'Passive tests triggered.');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   INIT — wire everything up when DOM is ready
   ══════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initSystemOverview();
  initNav();
  initEventLog();

  // Initialise each section
  initDeviceOrientation();
  initGeolocation();
  initVibration();
  initAudio();
  initBattery();
  initNetwork();
  initOnlineStatus();
  initPageVisibility();
  initClipboard();
  initFullscreen();
  initWakeLock();
  initWebShare();
  initNotifications();
  initSpeechSynthesis();
  initSpeechRecognition();
  initMediaDevices();
  initDragDrop();
  initStorage();
  initIndexedDB();
  initServiceWorker();
  initHistory();
  initMatchMedia();
  initPointerEvents();
  initGamepad();
  initWebWorker();
  initPerformance();
  initIntersectionObserver();
  initResizeObserver();
  initScreenInfo();
  initCrypto();
});
