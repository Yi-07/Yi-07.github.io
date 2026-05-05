/**
 * Particle Stars — Dynamic Background for Hugo Stack Theme
 *
 * Zero-dependency Canvas 2D particle system:
 *   3 depth layers → constellation lines → shooting stars → mouse repulsion.
 *   Compatible with Stack theme dark/light mode (data-scheme attribute).
 *
 * Injected via layouts/partials/footer/custom.html
 * All tunable values live in the CONFIG object below.
 */

// ============================================================
//  CONFIG  —  All tunable parameters, comment + recommended range
// ============================================================
const CONFIG = {

    // ---- Resize ------------------------------------------------
    /** Debounce delay after window resize (ms). Range: 100–500 */
    RESIZE_DEBOUNCE_MS: 200,

    // ---- Layers (3 built-in, add/remove at will) ---------------
    /**
     * Each layer: { name, countDesktop, countMobile, radiusMin, radiusMax,
     *               alphaMin, alphaMax, speedMin, speedMax }
     * - countDesktop / countMobile: particle count per device class.
     * - radius in px, alpha 0–1, speed in px/frame.
     * Desktop total should stay ≤150; mobile total ≤60  for performance.
     */
    LAYERS: [
        { name: 'distant', countDesktop: 70, countMobile: 30, radiusMin: 0.5, radiusMax: 1.0, alphaMin: 0.3, alphaMax: 0.5, speedMin: 0.10, speedMax: 0.20 },
        { name: 'mid',     countDesktop: 35, countMobile: 15, radiusMin: 1.0, radiusMax: 2.0, alphaMin: 0.6, alphaMax: 0.8, speedMin: 0.20, speedMax: 0.45 },
        { name: 'near',    countDesktop: 15, countMobile: 6,  radiusMin: 2.0, radiusMax: 3.0, alphaMin: 0.9, alphaMax: 1.0, speedMin: 0.45, speedMax: 0.80 },
    ],

    // ---- Constellation lines -----------------------------------
    /** Max pixel distance between two particles for a line. Recommended 100–150 */
    CONNECTION_MAX_DIST: 120,
    /** Which layer names participate in connection pairing. Only mid+near recommended. */
    CONNECTION_LAYERS: ['mid', 'near'],
    /** Peak opacity of a line at distance=0. Range 0.1–0.6 */
    CONNECTION_ALPHA_BASE: 0.4,
    /** Falloff curve exponent: alpha = base × (1 − d/max)^exponent. Higher = sharper cutoff. Range 1.0–3.0 */
    CONNECTION_ALPHA_EXPONENT: 1.5,

    // ---- Meteor (shooting star) --------------------------------
    /** Fixed trajectory angle in radians. Math.PI * 0.75 = 135° = right-top → left-bottom */
    METEOR_ANGLE: Math.PI * 0.75,
    /** Speed in px/frame, randomly picked in [min, max]. */
    METEOR_SPEED_MIN: 6,
    METEOR_SPEED_MAX: 10,
    /** Trail length in px. Range 40–150 */
    METEOR_TRAIL_LENGTH: 80,
    /** How many frames the meteor lives. Range 30–80 */
    METEOR_LIFETIME: 50,
    /** Spawn probability per frame. e.g. 1/400 ≈ one meteor every 6–7 s at 60 fps */
    METEOR_SPAWN_CHANCE: 1 / 400,
    /** Max simultaneous meteors. Keep at 1 unless you want a meteor shower. */
    METEOR_MAX_ACTIVE: 1,

    // ---- Mouse interaction -------------------------------------
    /** Radius (px) around cursor where particles react. Range 80–200 */
    MOUSE_REPEL_RADIUS: 150,
    /** Max displacement per frame. Range 1–5 */
    MOUSE_REPEL_FORCE: 2,
    /** Which layers react to mouse. Recommended: ['near'] only, for subtlety. */
    MOUSE_REPEL_LAYERS: ['near'],

    // ---- Light-mode opacity multiplier -------------------------
    /**
     * All particle / line / meteor alpha values are multiplied by this factor
     * when the theme is in light mode. Dark mode always uses 1.0 (no scaling).
     * Range 0.3–0.8 — lower = fainter background in light mode.
     */
    LIGHT_MODE_ALPHA_FACTOR: 0.6,

    // ---- Dark-mode colours -------------------------------------
    COLORS_DARK: {
        distant:  { r: 180, g: 200, b: 255 },
        mid:      { r: 220, g: 230, b: 255 },
        near:     { r: 255, g: 255, b: 255 },
        line:     { r: 200, g: 220, b: 255 },
        meteor:   { r: 255, g: 255, b: 255 },
    },

    // ---- Light-mode colours ------------------------------------
    COLORS_LIGHT: {
        distant:  { r: 120, g: 140, b: 180 },
        mid:      { r: 80,  g: 100, b: 150 },
        near:     { r: 60,  g: 80,  b: 130 },
        line:     { r: 100, g: 120, b: 160 },
        meteor:   { r: 80,  g: 100, b: 150 },
    },
};

// ============================================================
//  STATE
// ============================================================
const MOBILE_BP = 768;
let canvas, ctx, W, H;
let isDark = true;
let isMobile = false;
let alphaFactor = 1.0;
let particles = [];       // flat array of all Particle objects
let connectionPool = [];  // particles eligible for line connections (by layer name)
let meteors = [];
let mouse = { x: -9999, y: -9999, active: false };
let animId = null;
let resizeTimer = null;

// ============================================================
//  PARTICLE  (plain object, re-used in place)
// ============================================================
function createParticle(layer) {
    return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: layer.radiusMin + Math.random() * (layer.radiusMax - layer.radiusMin),
        alpha: layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin),
        speed: layer.speedMin + Math.random() * (layer.speedMax - layer.speedMin),
        wobbleAmp: (Math.random() - 0.5) * 0.3, // tiny horizontal drift amplitude
        wobblePhase: Math.random() * Math.PI * 2,
        layerName: layer.name,
    };
}

// ============================================================
//  METEOR
// ============================================================
function spawnMeteor() {
    // Start somewhere on the right / top edge, biased toward upper-right
    const startX = W * (0.7 + Math.random() * 0.3);
    const startY = Math.random() * H * 0.5;
    const speed = CONFIG.METEOR_SPEED_MIN + Math.random() * (CONFIG.METEOR_SPEED_MAX - CONFIG.METEOR_SPEED_MIN);
    const vx = Math.cos(CONFIG.METEOR_ANGLE) * speed;
    const vy = Math.sin(CONFIG.METEOR_ANGLE) * speed;
    return {
        x: startX, y: startY,
        vx, vy,
        life: CONFIG.METEOR_LIFETIME,
        maxLife: CONFIG.METEOR_LIFETIME,
        trail: CONFIG.METEOR_TRAIL_LENGTH,
    };
}

// ============================================================
//  INIT  —  build particle arrays from CONFIG.LAYERS
// ============================================================
function buildParticles() {
    particles = [];
    connectionPool = [];
    for (const layer of CONFIG.LAYERS) {
        const count = isMobile ? layer.countMobile : layer.countDesktop;
        for (let i = 0; i < count; i++) {
            const p = createParticle(layer);
            particles.push(p);
            if (CONFIG.CONNECTION_LAYERS.indexOf(layer.name) !== -1) {
                connectionPool.push(p);
            }
        }
    }
}

// ============================================================
//  RESIZE
// ============================================================
function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    isMobile = W < MOBILE_BP;
    buildParticles();
}

function debouncedResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, CONFIG.RESIZE_DEBOUNCE_MS);
}

// ============================================================
//  THEME  —  read Stack theme data-scheme & apply factor
// ============================================================
function readTheme() {
    isDark = document.documentElement.dataset.scheme !== 'light';
    alphaFactor = isDark ? 1.0 : CONFIG.LIGHT_MODE_ALPHA_FACTOR;
}

// ============================================================
//  DRAW  —  single frame
// ============================================================
function draw() {
    ctx.clearRect(0, 0, W, H);

    // ---- move & draw particles ---------------------------------
    for (const p of particles) {
        // upward drift with slight sinusoid wobble
        p.y -= p.speed;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        p.x += Math.sin(p.wobblePhase) * p.wobbleAmp;
        p.wobblePhase += 0.01;

        // mouse repulsion (only for configured layers)
        if (mouse.active && CONFIG.MOUSE_REPEL_LAYERS.indexOf(p.layerName) !== -1) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < CONFIG.MOUSE_REPEL_RADIUS && dist > 0.1) {
                const force = (1 - dist / CONFIG.MOUSE_REPEL_RADIUS) * CONFIG.MOUSE_REPEL_FORCE;
                p.x += (dx / dist) * force;
                p.y += (dy / dist) * force;
            }
        }

        // draw star
        const clr = CONFIG[isDark ? 'COLORS_DARK' : 'COLORS_LIGHT'][p.layerName];
        const a = p.alpha * alphaFactor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${clr.r},${clr.g},${clr.b},${a})`;
        ctx.fill();

        // near-layer cross-spike glow
        if (p.layerName === 'near') {
            ctx.strokeStyle = `rgba(${clr.r},${clr.g},${clr.b},${a * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - p.r * 2.5, p.y);
            ctx.lineTo(p.x + p.r * 2.5, p.y);
            ctx.moveTo(p.x, p.y - p.r * 2.5);
            ctx.lineTo(p.x, p.y + p.r * 2.5);
            ctx.stroke();
        }
    }

    // ---- constellation lines (batch into single stroke) ---------
    if (connectionPool.length > 1) {
        const lineColor = CONFIG[isDark ? 'COLORS_DARK' : 'COLORS_LIGHT'].line;
        ctx.lineWidth = 0.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < connectionPool.length; i++) {
            for (let j = i + 1; j < connectionPool.length; j++) {
                const a = connectionPool[i];
                const b = connectionPool[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONFIG.CONNECTION_MAX_DIST) {
                    const alpha = CONFIG.CONNECTION_ALPHA_BASE
                        * Math.pow(1 - dist / CONFIG.CONNECTION_MAX_DIST, CONFIG.CONNECTION_ALPHA_EXPONENT)
                        * alphaFactor;
                    ctx.strokeStyle = `rgba(${lineColor.r},${lineColor.g},${lineColor.b},${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
    }

    // ---- meteors -------------------------------------------------
    for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life--;

        // calculate tail endpoint
        const tailX = m.x - m.vx * (m.trail / Math.hypot(m.vx, m.vy));
        const tailY = m.y - m.vy * (m.trail / Math.hypot(m.vx, m.vy));

        const meteorColor = CONFIG[isDark ? 'COLORS_DARK' : 'COLORS_LIGHT'].meteor;
        // head → tail gradient
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        const lifeRatio = m.life / m.maxLife;
        grad.addColorStop(0, `rgba(${meteorColor.r},${meteorColor.g},${meteorColor.b},${1.0 * lifeRatio * alphaFactor})`);
        grad.addColorStop(1, `rgba(${meteorColor.r},${meteorColor.g},${meteorColor.b},0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        if (m.life <= 0 || m.x < -50 || m.y > H + 50 || m.x > W + 50) {
            meteors.splice(i, 1);
        }
    }

    // ---- meteor spawning -----------------------------------------
    if (meteors.length < CONFIG.METEOR_MAX_ACTIVE && Math.random() < CONFIG.METEOR_SPAWN_CHANCE) {
        meteors.push(spawnMeteor());
    }
}

// ============================================================
//  LOOP
// ============================================================
function loop() {
    if (document.visibilityState === 'hidden') {
        animId = requestAnimationFrame(loop);
        return; // pause rendering when tab hidden, but keep RAF scheduled
    }
    draw();
    animId = requestAnimationFrame(loop);
}

// ============================================================
//  BOOT
// ============================================================
function boot() {
    canvas = document.getElementById('particle-stars');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    readTheme();
    onResize();

    window.addEventListener('resize', debouncedResize);

    // Stack theme dark-mode toggle event
    window.addEventListener('onColorSchemeChange', () => {
        readTheme();
    });

    // Also observe attribute change on <html> for direct detection
    const observer = new MutationObserver(() => readTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });

    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });
    document.addEventListener('mouseleave', () => { mouse.active = false; });

    // Visibility pause/resume
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            readTheme(); // refresh theme in case it changed while hidden
        }
    });

    animId = requestAnimationFrame(loop);
}

// Start when DOM is ready (script is loaded with defer, so DOM is already parsed)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
