/* ============================================================
   LUMENDIP — LIGHTCURVE.JS
   Real-time light curve that syncs with transit animation
   ============================================================ */

class LightCurve {
  constructor(canvasId, options = {}) {
    this.canvas  = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx     = this.canvas.getContext('2d');
    this.opts    = {
      lineColor:   options.lineColor   || '#00E5FF',
      fillColor:   options.fillColor   || 'rgba(0,229,255,0.07)',
      dipColor:    options.dipColor    || '#7B61FF',
      gridColor:   options.gridColor   || 'rgba(255,255,255,0.04)',
      showRaw:     options.showRaw     !== undefined ? options.showRaw : true,
      interactive: options.interactive || false,
    };
    this.dataPoints   = [];   // { t, flux } pairs drawn so far
    this.fullData     = [];   // complete dataset for interactive mode
    this.currentT     = 0;
    this.animating    = false;
    this.onHover      = options.onHover || null;

    this._generateFullData();
    this.resize();
    this.drawEmpty();

    if (options.interactive) {
      this._bindInteractive();
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width || 600;
    this.canvas.height = parseInt(this.canvas.style.height || this.canvas.getAttribute('height') || 160);
  }

  _generateFullData() {
    // Simulate a Kepler-style light curve with noise + transit dip
    this.fullData = [];
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const noise = (Math.random() - 0.5) * 0.004;

      // Transit model: smooth trapezoid dip
      let flux = 1.0;
      const center = 0.5;
      const w      = 0.25;
      const depth  = 0.038;
      const d = Math.abs(t - center);
      if (d < w) {
        const x = 1 - d / w;
        flux -= depth * x * x * (3 - 2 * x);
      }

      // Stellar variability (slow sine)
      flux += 0.002 * Math.sin(t * Math.PI * 6);
      flux += noise;

      this.fullData.push({ t, flux });
    }
  }

  drawEmpty() {
    this._drawGrid();
  }

  // Called from transit animation with progress 0→1
  updateFromTransit(progress, dipAmount) {
    // Find data points up to this progress
    this.dataPoints = this.fullData.filter(d => d.t <= progress);
    this._render();
  }

  // Draw full interactive curve
  drawFull(showRaw = true) {
    this.dataPoints = [...this.fullData];
    if (!showRaw) {
      // Filtered = smooth the noise away
      this.dataPoints = this._smoothData(this.dataPoints, 8);
    }
    this._render();
  }

  _smoothData(data, kernel) {
    return data.map((d, i) => {
      const start = Math.max(0, i - kernel);
      const end   = Math.min(data.length - 1, i + kernel);
      const avg   = data.slice(start, end + 1).reduce((s, x) => s + x.flux, 0) / (end - start + 1);
      return { t: d.t, flux: avg };
    });
  }

  _drawGrid() {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = this.opts.gridColor;
    ctx.lineWidth   = 1;

    for (let i = 0; i <= 4; i++) {
      const y = (H * 0.1) + (H * 0.8) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 6; i++) {
      const x = W * (i / 6);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(90,112,144,0.8)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'right';
    const fluxLabels = ['1.04', '1.02', '1.00', '0.98', '0.96'];
    fluxLabels.forEach((label, i) => {
      const y = (H * 0.1) + (H * 0.8) * (i / 4);
      ctx.fillText(label, 34, y + 3);
    });
  }

  _render() {
    const ctx  = this.ctx;
    const W    = this.canvas.width;
    const H    = this.canvas.height;
    const padL = 40;
    const padR = 10;
    const padT = H * 0.08;
    const padB = H * 0.12;

    this._drawGrid();

    if (this.dataPoints.length < 2) return;

    const toX = (t)    => padL + (W - padL - padR) * t;
    const toY = (flux) => padT + (H - padT - padB) * (1.04 - flux) / 0.1; // range 0.96–1.04

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(toX(this.dataPoints[0].t), H - padB);
    for (const d of this.dataPoints) {
      ctx.lineTo(toX(d.t), toY(d.flux));
    }
    ctx.lineTo(toX(this.dataPoints[this.dataPoints.length - 1].t), H - padB);
    ctx.closePath();
    ctx.fillStyle = this.opts.fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(this.dataPoints[0].t), toY(this.dataPoints[0].flux));
    for (let i = 1; i < this.dataPoints.length; i++) {
      const d = this.dataPoints[i];
      ctx.lineTo(toX(d.t), toY(d.flux));
    }
    ctx.strokeStyle = this.opts.lineColor;
    ctx.lineWidth   = 1.8;
    ctx.shadowColor = this.opts.lineColor;
    ctx.shadowBlur  = 6;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Highlight dip region
    const dipStart = this.dataPoints.find(d => d.flux < 0.99);
    if (dipStart) {
      const dipPts = this.dataPoints.filter(d => d.flux < 0.998);
      if (dipPts.length > 2) {
        ctx.beginPath();
        ctx.moveTo(toX(dipPts[0].t), toY(dipPts[0].flux));
        for (const d of dipPts) ctx.lineTo(toX(d.t), toY(d.flux));
        ctx.strokeStyle = this.opts.dipColor;
        ctx.lineWidth   = 2.5;
        ctx.shadowColor = this.opts.dipColor;
        ctx.shadowBlur  = 10;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Annotation
        const midDip = dipPts[Math.floor(dipPts.length / 2)];
        const ax = toX(midDip.t);
        const ay = toY(midDip.flux);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, ay - 20);
        ctx.strokeStyle = 'rgba(123,97,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#7B61FF';
        ctx.font = '8px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TRANSIT DIP', ax, ay - 28);
      }
    }

    // Current position dot
    if (this.dataPoints.length > 0 && this.dataPoints.length < this.fullData.length) {
      const last = this.dataPoints[this.dataPoints.length - 1];
      ctx.beginPath();
      ctx.arc(toX(last.t), toY(last.flux), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = this.opts.lineColor;
      ctx.shadowBlur  = 12;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
  }

  _bindInteractive() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect  = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const W      = this.canvas.width;
      const padL   = 40;
      const padR   = 10;
      const t      = (mouseX - padL) / (W - padL - padR);
      if (t < 0 || t > 1) return;

      const nearest = this.fullData.reduce((prev, curr) =>
        Math.abs(curr.t - t) < Math.abs(prev.t - t) ? curr : prev
      );

      if (this.onHover) {
        this.onHover({
          x: mouseX,
          y: e.clientY - rect.top,
          t: (nearest.t * 8).toFixed(2) + 'h',
          flux: nearest.flux.toFixed(5),
        });
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.onHover) this.onHover(null);
    });
  }
}

// Instantiate main + interactive curves
window.lightCurveMain = new LightCurve('light-curve-canvas');

window.lightCurveInteractive = new LightCurve('interactive-curve', {
  interactive: true,
  lineColor:  '#1DE9B6',
  fillColor:  'rgba(29,233,182,0.06)',
  dipColor:   '#7B61FF',
  onHover: (data) => {
    const tip = document.getElementById('hover-tooltip');
    if (!data) { tip.style.opacity = '0'; return; }
    tip.style.opacity  = '1';
    tip.style.left     = (data.x + 12) + 'px';
    tip.style.top      = (data.y - 10) + 'px';
    tip.textContent    = `t=${data.t}  flux=${data.flux}`;
  }
});
