/* ============================================================
   LUMENDIP — STARFIELD.JS
   Parallax star background for Scene 1
   ============================================================ */

class Starfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.mouse = { x: 0, y: 0 };
    this.scrollY = 0;
    this.init();
  }

  init() {
    this.resize();
    this.generateStars();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateStars() {
    this.stars = [];
    const count = Math.floor((this.canvas.width * this.canvas.height) / 3000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x:       Math.random() * this.canvas.width,
        y:       Math.random() * this.canvas.height,
        r:       Math.random() * 1.6 + 0.2,
        alpha:   Math.random() * 0.8 + 0.2,
        speed:   Math.random() * 0.4 + 0.05,
        layer:   Math.floor(Math.random() * 3), // 0=far,1=mid,2=near
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        color:   this._randomStarColor(),
      });
    }
  }

  _randomStarColor() {
    const colors = [
      '#ffffff',
      '#cce8ff',
      '#ffe8cc',
      '#ccffee',
      '#e8ccff',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.generateStars();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const layerOffsets = [
      { x: this.mouse.x * 4,  y: this.mouse.y * 4  + this.scrollY * 0.05 },
      { x: this.mouse.x * 10, y: this.mouse.y * 10 + this.scrollY * 0.15 },
      { x: this.mouse.x * 20, y: this.mouse.y * 20 + this.scrollY * 0.35 },
    ];

    for (const s of this.stars) {
      const off = layerOffsets[s.layer];
      s.twinkle += s.twinkleSpeed;
      const twinkleAlpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));

      const px = ((s.x + off.x) % this.canvas.width  + this.canvas.width)  % this.canvas.width;
      const py = ((s.y + off.y) % this.canvas.height + this.canvas.height) % this.canvas.height;

      this.ctx.beginPath();
      this.ctx.arc(px, py, s.r, 0, Math.PI * 2);
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = twinkleAlpha;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
    requestAnimationFrame(() => this.animate());
  }
}

window.starfield = new Starfield('starfield');
