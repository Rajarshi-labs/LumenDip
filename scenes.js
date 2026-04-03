/* ============================================================
   LUMENDIP — SCENES.JS
   Scroll-driven scene controller
   ============================================================ */

class SceneController {
  constructor() {
    this.scenes = {};
    this.activeScene = null;
    this.ticking = false;
    this.transitStarted = false;
    this.detectionShown = false;
    this.scaleAnimated  = false;
    this.init();
  }

  init() {
    // Map scene IDs to handlers
    this.scenes = {
      'scene-1': { enter: () => this.enterScene1(), leave: () => {} },
      'scene-2': { enter: () => this.enterScene2(), leave: () => this.leaveScene2() },
      'scene-3': { enter: () => this.enterScene3(), leave: () => {} },
      'scene-4': { enter: () => this.enterScene4(), leave: () => {} },
      'scene-5': { enter: () => this.enterScene5(), leave: () => {} },
      'scene-6': { enter: () => this.enterScene6(), leave: () => {} },
      'scene-final': { enter: () => this.enterFinal(), leave: () => {} },
    };

    window.addEventListener('scroll', () => this._onScroll(), { passive: true });
    this._onScroll(); // run once on load
  }

  _onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this._checkScenes();
      this.ticking = false;
    });
  }

  _checkScenes() {
    const scrollY  = window.scrollY;
    const vhCenter = window.innerHeight * 0.5;

    for (const id in this.scenes) {
      const el = document.getElementById(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < vhCenter && rect.bottom > vhCenter;

      if (inView && this.activeScene !== id) {
        if (this.activeScene && this.scenes[this.activeScene]) {
          this.scenes[this.activeScene].leave();
        }
        this.activeScene = id;
        this.scenes[id].enter();
      }
    }
  }

  // ── Scene 1: Entry ──
  enterScene1() {
    // Already animated via CSS
  }

  // ── Scene 2: Star Lock-On ──
  enterScene2() {
    const frame = document.getElementById('telescope-frame');
    const ring  = document.getElementById('lock-ring');
    if (frame) setTimeout(() => frame.classList.add('visible'), 100);
    if (ring)  setTimeout(() => ring.classList.add('visible'), 800);

    const lines = ['hud-line-1', 'hud-line-2', 'hud-line-3'];
    lines.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.classList.add('visible'), 1200 + i * 400);
    });
  }

  leaveScene2() {}

  // ── Scene 3: Transit ──
  enterScene3() {
    const label = document.getElementById('transit-label');
    const curve = document.getElementById('curve-wrapper');

    if (label) setTimeout(() => label.classList.add('visible'), 300);

    setTimeout(() => {
      if (curve) curve.classList.add('visible');
    }, 600);

    // Start transit if not already done
    if (!this.transitStarted) {
      this.transitStarted = true;
      setTimeout(() => {
        if (window.transitAnim) {
          window.transitAnim.onProgress = (progress, dip) => {
            if (window.lightCurveMain) {
              window.lightCurveMain.resize();
              window.lightCurveMain.updateFromTransit(progress, dip);
            }
          };
          window.transitAnim.play(0);
        }
      }, 800);
    }
  }

  // ── Scene 4: AI Detection ──
  enterScene4() {
    const panel = document.getElementById('detection-panel');
    if (panel) setTimeout(() => panel.classList.add('visible'), 200);

    // Animate confidence counter
    if (!this.detectionShown) {
      this.detectionShown = true;
      this._animateDetection();
    }
  }

  _animateDetection() {
    const confEl   = document.getElementById('confidence-val');
    const fillEl   = document.getElementById('confidence-fill');
    const periodEl = document.getElementById('period-val');
    const radiusEl = document.getElementById('radius-val');
    const depthEl  = document.getElementById('depth-val');

    // Confidence count-up
    let conf = 0;
    const target = 87;
    const confTimer = setInterval(() => {
      conf = Math.min(conf + 2, target);
      if (confEl)  confEl.textContent  = conf + '%';
      if (fillEl)  fillEl.style.width  = conf + '%';
      if (conf >= target) clearInterval(confTimer);
    }, 30);

    // Other values with delay
    setTimeout(() => { if (periodEl) periodEl.textContent = '3.4 days'; }, 900);
    setTimeout(() => { if (radiusEl) radiusEl.textContent = '1.8 R⊕'; },  1100);
    setTimeout(() => { if (depthEl)  depthEl.textContent  = '3.8%'; },     1300);
  }

  // ── Scene 5: Interactive ──
  enterScene5() {
    if (window.lightCurveInteractive) {
      window.lightCurveInteractive.resize();
      window.lightCurveInteractive.drawFull(true);
    }

    // Toggle buttons
    const btnRaw      = document.getElementById('btn-raw');
    const btnFiltered = document.getElementById('btn-filtered');
    const btnReplay   = document.getElementById('btn-replay');

    const setActive = (btn) => {
      [btnRaw, btnFiltered, btnReplay].forEach(b => b && b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    };

    if (btnRaw) {
      btnRaw.onclick = () => {
        setActive(btnRaw);
        window.lightCurveInteractive.drawFull(true);
      };
    }

    if (btnFiltered) {
      btnFiltered.onclick = () => {
        setActive(btnFiltered);
        window.lightCurveInteractive.drawFull(false);
      };
    }

    if (btnReplay) {
      btnReplay.onclick = () => {
        setActive(btnReplay);
        // Reset and replay transit + curve
        if (window.transitAnim) {
          window.transitAnim.reset();
          setTimeout(() => {
            window.lightCurveMain  && (window.lightCurveMain.dataPoints = []);
            window.lightCurveMain  && window.lightCurveMain.drawEmpty();
            window.transitAnim.play(0);
          }, 200);
        }
        setTimeout(() => setActive(btnRaw), 1000);
        window.lightCurveInteractive.drawFull(true);
      };
    }
  }

  // ── Scene 6: Scale Expansion ──
  enterScene6() {
    if (!this.scaleAnimated) {
      this.scaleAnimated = true;
      this._animateScale();
      this._drawMultiStars();
    }
  }

  _animateScale() {
    const countEl = document.getElementById('scale-count');
    if (!countEl) return;
    let n = 0;
    const target = 5372;
    const step   = Math.ceil(target / 80);
    const timer  = setInterval(() => {
      n = Math.min(n + step, target);
      countEl.textContent = n.toLocaleString() + ' candidates detected';
      if (n >= target) clearInterval(timer);
    }, 20);
  }

  _drawMultiStars() {
    const canvas = document.getElementById('multi-star-canvas');
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x:       Math.random() * canvas.width,
        y:       Math.random() * canvas.height,
        r:       Math.random() * 3 + 1,
        phase:   Math.random() * Math.PI * 2,
        speed:   Math.random() * 0.01 + 0.005,
        hasPlanet: Math.random() > 0.4,
        planetPhase: Math.random() * Math.PI * 2,
        planetSpeed: Math.random() * 0.02 + 0.008,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.phase += s.speed;
        const brightness = 0.5 + 0.5 * Math.sin(s.phase);

        // Star glow
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        g.addColorStop(0,   `rgba(255,240,180,${brightness * 0.8})`);
        g.addColorStop(0.4, `rgba(255,200,80,${brightness * 0.3})`);
        g.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Star core
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,220,${brightness})`;
        ctx.fill();

        // Transit signal indicator
        if (s.hasPlanet) {
          s.planetPhase += s.planetSpeed;
          const t = (Math.sin(s.planetPhase) + 1) / 2;
          if (t > 0.45 && t < 0.55) {
            // Dimming flash
            const dipAlpha = 1 - Math.abs(t - 0.5) * 20;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 5 + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,229,255,${dipAlpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    };

    render();
  }

  // ── Final Scene ──
  enterFinal() {
    // Ensure CTA modal is wired up (done in main.js)
  }
}

window.sceneController = new SceneController();
