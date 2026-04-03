/* ============================================================
   LUMENDIP — TRANSIT.JS
   Scene 2 (star canvas) + Scene 3 (transit animation)
   ============================================================ */

// ── Scene 2: Glowing Star in Telescope ──────────────────────
class StarCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext('2d');
    this.t      = 0;
    this.resize();
    this.animate();
  }

  resize() {
    const size = this.canvas.parentElement.offsetWidth;
    this.canvas.width  = size;
    this.canvas.height = size;
  }

  drawStar(cx, cy, glow) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background deep space
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Lens distortion rings
    for (let i = 3; i >= 1; i--) {
      const r = 60 + i * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,229,255,${0.03 * (4 - i)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Outer diffuse glow
    const grad1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    grad1.addColorStop(0,   `rgba(255,230,150,${0.15 * glow})`);
    grad1.addColorStop(0.4, `rgba(255,180, 80,${0.08 * glow})`);
    grad1.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fillStyle = grad1;
    ctx.fill();

    // Mid glow
    const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
    grad2.addColorStop(0,   `rgba(255,250,220,${0.9 * glow})`);
    grad2.addColorStop(0.3, `rgba(255,220,100,${0.6 * glow})`);
    grad2.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fillStyle = grad2;
    ctx.fill();

    // Core star
    const grad3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    grad3.addColorStop(0,   '#FFFFFF');
    grad3.addColorStop(0.5, '#FFFDE0');
    grad3.addColorStop(1,   'rgba(255,240,150,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = grad3;
    ctx.fill();

    // Diffraction spikes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let angle = 0; angle < 4; angle++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * Math.PI / 4 + Math.PI / 8);
      const spike = ctx.createLinearGradient(-80, 0, 80, 0);
      spike.addColorStop(0,   'transparent');
      spike.addColorStop(0.5, `rgba(255,240,180,${0.25 * glow})`);
      spike.addColorStop(1,   'transparent');
      ctx.fillStyle = spike;
      ctx.fillRect(-80, -1, 160, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  animate() {
    this.t += 0.02;
    const cx = this.canvas.width  / 2;
    const cy = this.canvas.height / 2;
    const glow = 0.85 + 0.15 * Math.sin(this.t);
    this.drawStar(cx, cy, glow);
    requestAnimationFrame(() => this.animate());
  }
}

// ── Scene 3: Transit Animation ───────────────────────────────
class TransitAnimation {
  constructor(canvasId) {
    this.canvas   = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx      = this.canvas.getContext('2d');
    this.progress = 0;      // 0 → 1
    this.playing  = false;
    this.t        = 0;
    this.onProgress = null; // callback(progress)
    this.resize();
    this.animate();
  }

  resize() {
    const el = this.canvas.parentElement;
    this.canvas.width  = el.offsetWidth;
    this.canvas.height = el.offsetHeight;
  }

  play(fromProgress = 0) {
    this.progress = fromProgress;
    this.playing  = true;
  }

  stop() { this.playing = false; }

  reset() { this.progress = 0; this.playing = false; }

  draw() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx   = W / 2;
    const cy   = H / 2;
    const starR = Math.min(W, H) * 0.3;

    // Star brightness reduces during transit
    const transitDip = this._transitDip(this.progress);
    const brightness  = 1 - transitDip * 0.06;

    // Star glow
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR * 1.6);
    g1.addColorStop(0,   `rgba(255,240,160,${0.25 * brightness})`);
    g1.addColorStop(0.5, `rgba(255,200, 80,${0.1  * brightness})`);
    g1.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, starR * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = g1;
    ctx.fill();

    // Star body
    const g2 = ctx.createRadialGradient(cx - starR * 0.2, cy - starR * 0.2, 0, cx, cy, starR);
    g2.addColorStop(0,   `rgba(255,255,220,${brightness})`);
    g2.addColorStop(0.5, `rgba(255,200, 80,${brightness * 0.9})`);
    g2.addColorStop(1,   `rgba(200,120, 20,${brightness * 0.7})`);
    ctx.beginPath();
    ctx.arc(cx, cy, starR, 0, Math.PI * 2);
    ctx.fillStyle = g2;
    ctx.fill();

    // Planet path
    const startX = -starR * 1.5 + cx;
    const endX   =  starR * 1.5 + cx;
    const planetX = startX + (endX - startX) * this.progress;
    const planetY = cy;
    const planetR = starR * 0.18;

    // Planet shadow (limb darkening effect on star)
    if (this.progress > 0.05 && this.progress < 0.95) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const shadowG = ctx.createRadialGradient(planetX, planetY, 0, planetX, planetY, planetR);
      shadowG.addColorStop(0,   'rgba(0,0,0,0.4)');
      shadowG.addColorStop(0.8, 'rgba(0,0,0,0.3)');
      shadowG.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = shadowG;
      ctx.fill();
      ctx.restore();
    }

    // Planet body
    const pg = ctx.createRadialGradient(
      planetX - planetR * 0.3, planetY - planetR * 0.3, 0,
      planetX, planetY, planetR
    );
    pg.addColorStop(0,   '#1a2540');
    pg.addColorStop(0.6, '#0e1a30');
    pg.addColorStop(1,   '#060c18');

    ctx.beginPath();
    ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();

    // Planet atmosphere ring
    const ag = ctx.createRadialGradient(planetX, planetY, planetR * 0.85, planetX, planetY, planetR * 1.25);
    ag.addColorStop(0,   'rgba(0,229,255,0.2)');
    ag.addColorStop(0.5, 'rgba(0,229,255,0.08)');
    ag.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(planetX, planetY, planetR * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = ag;
    ctx.fill();

    // Planet path indicator (dashed line)
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(0,229,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    ctx.lineTo(endX,   cy);
    ctx.stroke();
    ctx.restore();
  }

  _transitDip(p) {
    // Smooth transit window: peak dip between p=0.35–0.65
    const center = 0.5;
    const width  = 0.28;
    const d = Math.abs(p - center);
    if (d > width) return 0;
    const x = 1 - d / width;
    return x * x * (3 - 2 * x); // smoothstep
  }

  animate() {
    this.t += 0.01;
    if (this.playing) {
      this.progress += 0.003;
      if (this.progress >= 1) {
        this.progress = 1;
        this.playing  = false;
      }
      if (this.onProgress) this.onProgress(this.progress, this._transitDip(this.progress));
    }
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Instantiate
window.starCanvasAnim  = new StarCanvas('star-canvas');
window.transitAnim     = new TransitAnimation('transit-canvas');
