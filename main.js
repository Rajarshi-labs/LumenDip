/* ============================================================
   LUMENDIP — MAIN.JS
   Global wiring: smooth scroll, modal, file upload, CTA
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Smooth Scroll (Lenis-style via CSS + JS) ──────────────
  let lastScroll  = 0;
  let targetScroll = 0;
  const ease = 0.1;

  // Use native smooth scrolling (Lenis CDN not always available)
  // For production, swap in: import Lenis from '@studio-freight/lenis'
  document.documentElement.style.scrollBehavior = 'smooth';

  // ── CTA Button → Modal ────────────────────────────────────
  const ctaBtn  = document.getElementById('cta-btn');
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  const dropZone = document.getElementById('modal-drop');
  const fileInput = document.getElementById('file-input');
  const result   = document.getElementById('modal-result');

  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      overlay && overlay.classList.add('open');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay && overlay.classList.remove('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  }

  // ── File Upload Handler ───────────────────────────────────
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      _processFile(file);
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#00E5FF';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) _processFile(file);
    });
  }

  function _processFile(file) {
    if (result) result.textContent = `Reading ${file.name}…`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const parsed = [];

      for (const line of lines) {
        const parts = line.trim().split(/[\s,\t]+/);
        if (parts.length >= 2) {
          const t    = parseFloat(parts[0]);
          const flux = parseFloat(parts[1]);
          if (!isNaN(t) && !isNaN(flux)) parsed.push({ t, flux });
        }
      }

      if (parsed.length < 10) {
        result && (result.textContent = '⚠ Could not parse file. Expected time-flux columns.');
        return;
      }

      // Normalize t to 0–1
      const tMin = Math.min(...parsed.map(d => d.t));
      const tMax = Math.max(...parsed.map(d => d.t));
      const normalized = parsed.map(d => ({
        t:    (d.t - tMin) / (tMax - tMin),
        flux: d.flux,
      }));

      // Analyze
      const minFlux  = Math.min(...normalized.map(d => d.flux));
      const maxFlux  = Math.max(...normalized.map(d => d.flux));
      const dipDepth = ((maxFlux - minFlux) / maxFlux * 100).toFixed(2);
      const dipT     = normalized.find(d => d.flux === minFlux);

      if (result) {
        result.innerHTML = `
          ✅ Loaded ${parsed.length} data points<br>
          📉 Transit depth: ${dipDepth}%<br>
          ⏱ Minimum flux at: t = ${(dipT.t * (tMax - tMin) + tMin).toFixed(3)}<br>
          🪐 Estimated planet: ${(Math.sqrt(parseFloat(dipDepth) / 100) * 109).toFixed(1)} R⊕
        `;
      }

      // Inject into interactive curve
      if (window.lightCurveInteractive) {
        window.lightCurveInteractive.fullData  = normalized;
        window.lightCurveInteractive.dataPoints = normalized;
        window.lightCurveInteractive.resize();
        window.lightCurveInteractive.drawFull(true);
      }

      setTimeout(() => overlay && overlay.classList.remove('open'), 3000);
    };

    reader.onerror = () => {
      result && (result.textContent = '⚠ Error reading file.');
    };

    reader.readAsText(file);
  }

  // ── Keyboard Navigation ───────────────────────────────────
  const scenes = ['scene-1', 'scene-2', 'scene-3', 'scene-4', 'scene-5', 'scene-6', 'scene-final'];
  let currentSceneIdx = 0;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      currentSceneIdx = Math.min(currentSceneIdx + 1, scenes.length - 1);
      _scrollToScene(scenes[currentSceneIdx]);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      currentSceneIdx = Math.max(currentSceneIdx - 1, 0);
      _scrollToScene(scenes[currentSceneIdx]);
    } else if (e.key === 'Escape' && overlay) {
      overlay.classList.remove('open');
    }
  });

  function _scrollToScene(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Resize Handlers ───────────────────────────────────────
  window.addEventListener('resize', () => {
    if (window.lightCurveMain)        window.lightCurveMain.resize();
    if (window.lightCurveInteractive) window.lightCurveInteractive.resize();
    if (window.transitAnim)           window.transitAnim.resize();
    if (window.starCanvasAnim)        window.starCanvasAnim.resize();
    if (window.starfield)             window.starfield.resize();
  });

  // ── Canvas Resolution for Retina ─────────────────────────
  function scaleCanvas(canvas) {
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }

  // ── Console Easter Egg ────────────────────────────────────
  console.log(`
  ╔═══════════════════════════════════════╗
  ║         L U M E N D I P              ║
  ║   Exoplanet Transit Detector          ║
  ╠═══════════════════════════════════════╣
  ║  Built with: Three.js · Chart.js      ║
  ║  Data: NASA Kepler Archive            ║
  ║  Transit Model: Mandel-Agol (2002)    ║
  ╚═══════════════════════════════════════╝
  `);

});
