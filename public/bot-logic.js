// /public/bot-logic.js
// Injected by Puppeteer into the Google Meet tab.
// Requires: window.BOT_USER_ID, window.BOT_MEETING_NAME
// Requires: vad (window.vad from bundle.min.js injected before this)

(async () => {
  console.log('[Bot] bot-logic.js loaded');

  // ── 1. Speaker Observer ──────────────────────────────────────────
  window.currentSpeaker = 'Unknown';
  const speakingClasses = ['KUNJSe', 'sxlEM'];
  const ignoreList = ['frame_person', 'mic_off', 'mic_none', 'visual_effects', 'more_vert'];
  let lastSpeaker = '';
  let lastSpeakerTime = 0;

  const speakerObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
      const target = mutation.target;
      const isSpeaking = speakingClasses.some(cls => target.classList.contains(cls));
      if (!isSpeaking) continue;

      const tile = target.closest('.dkjMxf');
      const nameEl = tile?.querySelector('.XEazBc span.notranslate');
      const name = nameEl?.innerText?.trim();
      const now = Date.now();

      if (name && !ignoreList.includes(name) && (name !== lastSpeaker || now - lastSpeakerTime > 1000)) {
        window.currentSpeaker = name;
        lastSpeaker = name;
        lastSpeakerTime = now;
        console.log(`[Bot] Active speaker: ${name}`);
      }
    }
  });

  // Observe all participant tiles
  document.querySelectorAll('.DYfzY').forEach(tile => {
    speakerObserver.observe(tile, { attributes: true });
  });

  // ── 2. WAV Encoder ───────────────────────────────────────────────
  function encodeWAV(samples) {
    const sampleRate = 16000;
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4,  36 + samples.length * 2, true);
    writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20,  1, true);  // PCM
    view.setUint16(22,  1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32,  2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let off = 44;
    for (let i = 0; i < samples.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  // ── 3. VAD ───────────────────────────────────────────────────────
  try {
    const myVad = await vad.MicVAD.new({
      modelURL:    '/bot-assets/silero_vad_legacy.onnx',
      workletURL:  '/bot-assets/vad.worklet.bundle.min.js',
      ortConfig:   (ort) => { ort.env.wasm.wasmPaths = '/bot-assets/'; },
      startOnLoad: false,
      positiveSpeechThreshold: 0.75,
      negativeSpeechThreshold: 0.70,
      redemptionMs: 250,

      onSpeechEnd: (audio) => {
        try {
          const wav = encodeWAV(audio);
          const form = new FormData();
          form.append('audio',        wav);
          form.append('speaker_label', window.currentSpeaker);
          form.append('user_id',       window.BOT_USER_ID);
          form.append('meeting_name',  window.BOT_MEETING_NAME || 'EMR-Lite Meeting');

          console.log(`[Bot] Uploading chunk from "${window.currentSpeaker}" (${wav.size}B)`);

          fetch('http://localhost:8000/meet-audio', { method: 'POST', body: form })
            .then(r => { if (!r.ok) console.error('[Bot] Upload failed:', r.status); })
            .catch(e => console.error('[Bot] Upload error:', e));
        } catch (e) {
          console.error('[Bot] onSpeechEnd error:', e);
        }
      },
    });

    await myVad.start();
    console.log('[Bot] VAD started — listening for speech...');
  } catch (e) {
    console.error('[Bot] VAD init failed:', e);
  }
})();
