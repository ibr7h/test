(() => {
  let activeRecognition = null;
  let watchdog = null;
  let busy = false;

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIPhonePWA = () => isIOS() && isStandalone();
  const statusEl = () => document.getElementById('micStatusText');
  const micBtn = () => document.getElementById('btnMicTest');

  function setStatus(html) {
    const el = statusEl();
    if (el) el.innerHTML = html;
  }

  function stopRecognition() {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (activeRecognition) {
      try { activeRecognition.abort(); } catch (_) {}
      activeRecognition = null;
    }
    busy = false;
    const btn = micBtn();
    if (btn) btn.disabled = false;
  }

  function configureButton() {
    const btn = micBtn();
    if (!btn) return;
    const spans = btn.querySelectorAll('span');
    if (isIPhonePWA()) {
      if (spans[0]) spans[0].textContent = '🗣️';
      if (spans[1]) spans[1].textContent = 'I Said It!';
      btn.title = 'Practice aloud without microphone permission';
      setStatus('<span class="text-rose-600 font-bold">🛡️ iPhone Safe Mode: say the color aloud, then tap “I Said It!” — no microphone permission needed.</span>');
    } else {
      if (spans[0]) spans[0].textContent = '🎙️';
      if (spans[1]) spans[1].textContent = 'Speak';
      btn.title = 'Optional microphone voice check';
    }
  }

  function selfCheck() {
    setStatus('<span class="text-emerald-600 font-black">👏 Great speaking! Now reveal the answer and check yourself.</span>');
    try { window.playTone?.(523.25, 'triangle', 0.18, 0.12); } catch (_) {}
  }

  window.startMicRecognition = function () {
    if (isIPhonePWA()) {
      selfCheck();
      return;
    }

    if (busy) {
      setStatus('<span class="text-slate-500 font-bold">🎙️ Voice check is already running…</span>');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('<span class="text-amber-600 font-bold">🗣️ Voice checking is not available here. Say the color aloud, then tap Reveal!</span>');
      return;
    }

    let recognition;
    try { recognition = new SpeechRecognition(); }
    catch (_) {
      setStatus('<span class="text-amber-600 font-bold">🗣️ Voice checking could not start. Say it aloud and use Reveal.</span>');
      return;
    }

    activeRecognition = recognition;
    busy = true;
    const btn = micBtn();
    if (btn) btn.disabled = true;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    setStatus('<span class="text-rose-600 font-black animate-pulse">🎙️ Listening… say the color now!</span>');

    const finish = () => {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      if (activeRecognition === recognition) activeRecognition = null;
      busy = false;
      if (btn) btn.disabled = false;
    };

    recognition.onresult = event => {
      const spoken = event.results?.[0]?.[0]?.transcript?.toLowerCase().trim() || '';
      finish();
      const target = window.mysteryCurrentBean;
      if (target && spoken.includes(target.name.toLowerCase())) {
        setStatus(`<span class="text-emerald-600 font-black">🎉 Amazing! You said “${spoken.toUpperCase()}”!</span>`);
        try { window.revealMysteryCard?.(); } catch (_) {}
        try { window.launchFlyingStar?.(innerWidth / 2, innerHeight / 2); } catch (_) {}
      } else {
        setStatus(`<span class="text-amber-700 font-bold">Heard “${spoken || 'something else'}”. Try again or use Reveal.</span>`);
      }
    };

    recognition.onerror = event => {
      finish();
      const code = event?.error || 'unknown';
      const msg = (code === 'not-allowed' || code === 'service-not-allowed')
        ? 'Microphone permission was not granted. No problem — say it aloud and use Reveal!'
        : (code === 'no-speech' ? 'I did not hear a word. Try again or use Reveal.' : 'Voice check is unavailable right now. Say it aloud and use Reveal.');
      setStatus(`<span class="text-slate-500 font-bold">${msg}</span>`);
    };

    recognition.onend = () => {
      if (!busy) return;
      finish();
      setStatus('<span class="text-slate-500 font-bold">Voice check ended. You can try again or use Reveal.</span>');
    };

    watchdog = setTimeout(() => {
      if (!busy || activeRecognition !== recognition) return;
      try { recognition.abort(); } catch (_) {}
      finish();
      setStatus('<span class="text-slate-500 font-bold">⏱️ Voice check timed out. Keep playing — say it aloud and tap Reveal!</span>');
    }, 6500);

    try { recognition.start(); }
    catch (_) {
      finish();
      setStatus('<span class="text-slate-500 font-bold">Voice check could not start. Say it aloud and tap Reveal!</span>');
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRecognition();
  });
  window.addEventListener('pagehide', stopRecognition);

  const originalSwitchTab = window.switchTab;
  if (typeof originalSwitchTab === 'function') {
    window.switchTab = function (sectionId) {
      if (sectionId !== 'section-say') stopRecognition();
      const result = originalSwitchTab.apply(this, arguments);
      if (sectionId === 'section-say') configureButton();
      return result;
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', configureButton, { once: true });
  else configureButton();
})();
