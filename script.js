// ─── Boot: lock scroll immediately ──────────────────────────────────────────
document.documentElement.dataset.shut = 'true';

// ─── Element refs ────────────────────────────────────────────────────────────
const glCanvas = document.getElementById('gl');
const fb       = document.getElementById('fb');
const veil     = document.getElementById('veil');
const page     = document.getElementById('page');
const dim      = document.getElementById('dim');
const wash     = document.getElementById('wash');
const hint     = document.getElementById('hint');
const ringBtn  = document.querySelector('.ring');
const stage    = document.querySelector('.invite-stage');
const audio    = document.querySelector('audio');

// ─── Curtain texture builder (ported from original Three.js canvas code) ─────
function generateCurtainTextures() {
    const W = 448, H = 1536;
    
    // Create base normal canvas (left panel & preroll)
    const cvs = document.createElement('canvas');
    cvs.width = W; cvs.height = H;
    const o = cvs.getContext('2d');
    
    // Draw the complex texture ONCE (massive performance savings)
    drawCurtain(o, W, H);
    
    const leftUrl = cvs.toDataURL('image/webp', 0.85); // Use webp for faster decoding
    
    // Create mirrored canvas (right panel)
    const mirrorCvs = document.createElement('canvas');
    mirrorCvs.width = W; mirrorCvs.height = H;
    const mCtx = mirrorCvs.getContext('2d');
    
    mCtx.translate(W, 0);
    mCtx.scale(-1, 1);
    mCtx.drawImage(cvs, 0, 0); // Fast blit from already drawn canvas
    
    const rightUrl = mirrorCvs.toDataURL('image/webp', 0.85);
    
    return { leftUrl, rightUrl };
}

function drawCurtain(o, W, H) {
    // 1. Red horizontal gradient base
    const d = o.createLinearGradient(0, 0, W, 0);
    d.addColorStop(0,    '#590610');
    d.addColorStop(0.3,  '#95101B');
    d.addColorStop(0.68, '#B8151F');
    d.addColorStop(0.92, '#9B0F19');
    d.addColorStop(1,    '#7A0A13');
    o.fillStyle = d;
    o.fillRect(0, 0, W, H);

    // 2. Vertical vignette (bright top, dark bottom)
    const l = o.createLinearGradient(0, 0, 0, H);
    l.addColorStop(0,    'rgba(255,190,170,.14)');
    l.addColorStop(0.45, 'rgba(0,0,0,0)');
    l.addColorStop(1,    'rgba(20,0,4,.34)');
    o.fillStyle = l;
    o.fillRect(0, 0, W, H);

    // 3. Fabric fold streaks (30 random vertical light/shadow bands)
    for (let t = 0; t < 30; t++) {
        const r = W * Math.random();
        const c = 14 + 74 * Math.random();
        const dark = 0.52 > Math.random();
        const h = o.createLinearGradient(r - c, 0, r + c, 0);
        h.addColorStop(0,   'rgba(0,0,0,0)');
        h.addColorStop(0.5, dark ? 'rgba(26,0,4,.30)' : 'rgba(255,168,160,.15)');
        h.addColorStop(1,   'rgba(0,0,0,0)');
        o.fillStyle = h;
        o.fillRect(r - c, 0, 2 * c, H);
    }

    // 4. Velvet pile: 2600 short diagonal fiber strokes
    for (let t = 0; t < 2600; t++) {
        const r = W * Math.random();
        const n = H * Math.random();
        const u = 40 + 300 * Math.random();
        const light = 0.55 > Math.random();
        o.strokeStyle = light
            ? 'rgba(255,236,228,' + (0.01  + 0.032 * Math.random()) + ')'
            : 'rgba(38,0,7,'     + (0.014 + 0.042 * Math.random()) + ')';
        o.lineWidth = 0.5 + 1.2 * Math.random();
        o.beginPath();
        o.moveTo(r, n);
        o.lineTo(r + (Math.random() - 0.5) * 7, n + u);
        o.stroke();
    }

    // 5. Damask swirl motifs — bezier curves in a staggered grid
    for (let n = 52; n < H; n += 168) {
        for (let r = 44; r < 402; r += 104) {
            const ex = r + (Math.floor(n / 168) % 2 ? 52 : 0);
            o.save();
            o.translate(ex, n);
            o.scale(1, 2.15);
            o.strokeStyle = 'rgba(233,184,88,.5)';
            o.lineWidth = 1.5;
            o.lineCap = 'round';
            o.beginPath();
            o.moveTo(0, -13);
            o.bezierCurveTo(9, -5, 11, 7, 3, 11);
            o.bezierCurveTo(-6, 15, -12, 7, -9, 1);
            o.bezierCurveTo(-6, -4, 0, -2, -1, 3);
            o.stroke();
            o.beginPath();
            o.arc(1, 17, 1.9, 0, 6.3);
            o.stroke();
            o.restore();
        }
    }

    // 6. Gold bead seam strip on the right (inner) edge
    const f = 23;
    const sy = W - f;
    const g = o.createLinearGradient(sy, 0, W, 0);
    g.addColorStop(0,    '#7A560F');
    g.addColorStop(0.22, '#E8B44C');
    g.addColorStop(0.5,  '#FBEEC4');
    g.addColorStop(0.78, '#E0A63C');
    g.addColorStop(1,    '#8C6413');
    o.fillStyle = g;
    o.fillRect(sy, 0, f, H);
    // Grain
    for (let n = 0; n < H; n += 3) {
        o.fillStyle = 'rgba(70,44,4,' + (0.16 + 0.2 * Math.random()) + ')';
        o.fillRect(sy, n, f, 1);
    }
    // Bead dots
    o.fillStyle = 'rgba(255,246,214,.85)';
    for (let n = 7; n < H; n += 17) o.fillRect(sy - 11, n, 5, 5);
    // Shadow line
    o.fillStyle = 'rgba(20,0,4,.32)';
    o.fillRect(sy - 17, 0, 5, H);
}

// Build and apply textures — NO CSS transforms on panels so CSS animation fires cleanly
const pLeft  = document.querySelector('#fb .p.l');
const pRight = document.querySelector('#fb .p.r');
const preroll = document.getElementById('preroll');

// Generate once
const { leftUrl, rightUrl } = generateCurtainTextures();

if (pLeft)  { pLeft.style.cssText  += ';background-image:url("' + leftUrl  + '");background-size:100% 100%;border:none'; }
if (pRight) { pRight.style.cssText += ';background-image:url("' + rightUrl + '");background-size:100% 100%;border:none'; }
if (preroll) {
    preroll.style.backgroundImage = 'url("' + leftUrl + '")';
    preroll.style.backgroundSize  = 'cover';
}

// Show curtain fallback, hide dead WebGL canvas
if (glCanvas) glCanvas.style.display = 'none';
if (fb)       fb.style.display = 'block';

// ─── Bell click → open sequence ──────────────────────────────────────────────
if (ringBtn) ringBtn.addEventListener('click', openInvitation, { once: true });

function openInvitation() {
    // Step 1 (0ms): begin hint exit animation
    if (hint) hint.classList.add('go');

    // Step 2 (500ms): curtains start sliding + hero fades in
    setTimeout(function () {
        // Unlock page scrolling
        document.documentElement.removeAttribute('data-shut');

        // CSS body.fbgo slides both panels simultaneously:
        //   .p.l → translateX(-101%)   .p.r → translateX(101%)
        //   transition: transform 2.4s cubic-bezier(.6,.02,.2,1)
        document.body.classList.add('fbgo');

        // Fade out #preroll immediately so nothing red shows through panels gap
        if (preroll) preroll.classList.add('off');

        // Fade out the dark dim overlay
        if (dim) dim.classList.add('go');

        // Fade in the hero invitation card
        if (page) {
            page.style.transition = 'opacity 1.1s ease 0.7s';
            page.style.opacity = '1';
        }

        // Brief warm wash glow flash
        if (wash) {
            wash.style.transition = 'opacity 0.9s ease';
            wash.style.opacity = '0.7';
            setTimeout(function () { wash.style.opacity = '0'; }, 1500);
        }

        // Play background audio
        if (audio) {
            audio.volume = 0.55;
            audio.play().catch(function () {});
        }
    }, 500);

    // Step 3 (2900ms = 500 + 2400): panels have fully exited → fade out veil
    setTimeout(function () {
        if (veil) {
            veil.style.transition = 'opacity 0.55s ease';
            veil.style.opacity = '0';
            veil.setAttribute('aria-hidden', 'true');
        }
        // Start invite-stage animations
        if (stage) stage.dataset.play = 'true';
        // Unlock the scrollable section
        var wrap = document.querySelector('[aria-hidden="true"][inert]');
        if (wrap) {
            wrap.removeAttribute('aria-hidden');
            wrap.removeAttribute('inert');
        }
        // Show scroll cue
        var cueEl = document.querySelector('.cue');
        if (cueEl && window.scrollY < 50) {
            cueEl.dataset.show = 'true';
        }
    }, 2900);

    // Step 4 (3600ms): veil fade done → remove from layout
    setTimeout(function () {
        if (veil) veil.style.display = 'none';
        if (hint) hint.style.display = 'none';
    }, 3600);
}

// ─── Scale invite-stage to viewport height ───────────────────────────────────
function scaleStage() {
    var host = document.querySelector('.invite-host');
    var stg  = document.querySelector('.invite-stage');
    if (!host || !stg) return;
    var rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    stg.style.transform = 'translate(-50%, -50%) scale(' + (rect.height / 1280) + ')';
}
window.addEventListener('resize', scaleStage);
scaleStage();

// ─── Scroll reveals, toran, cue, RSVP, parallax (run after DOM ready) ────────
document.addEventListener('DOMContentLoaded', function () {

    // Scroll reveal
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealEls.length) {
        var revObs = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.dataset.seen = 'true';
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        revealEls.forEach(function (el) { revObs.observe(el); });
    }

    // Toran drop
    var toran = document.querySelector('.toran');
    if (toran && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) { entry.target.dataset.hung = 'true'; obs.unobserve(entry.target); }
            });
        }, { rootMargin: '0px 0px -4% 0px' }).observe(toran);
    }

    // Scroll cue button
    var cue = document.querySelector('.cue');
    if (cue) {
        window.addEventListener('scroll', function () {
            // Show cue when near top of page, hide when scrolling down
            cue.dataset.show = (window.scrollY < window.innerHeight * 0.15) ? 'true' : 'false';
        }, { passive: true });
        cue.addEventListener('click', function () {
            window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: 'smooth' });
        });
    }

    // RSVP
    var rsvpInput   = document.querySelector('.rsvp-field input');
    var choiceBtns  = document.querySelectorAll('.rsvp-choice button');
    var countDisp   = document.querySelector('.rsvp-count b');
    var minusBtn    = document.querySelector('.rsvp-count button[aria-label="one fewer"]');
    var plusBtn     = document.querySelector('.rsvp-count button[aria-label="one more"]');
    var waLink      = document.querySelector('.rsvp-send');
    var state = { name: '', coming: 'yes', count: 2 };

    function updateRSVP() {
        choiceBtns.forEach(function (btn) {
            btn.dataset.on = btn.textContent.trim().toLowerCase().startsWith('yes')
                ? (state.coming === 'yes' ? 'true' : 'false')
                : (state.coming === 'no'  ? 'true' : 'false');
        });
        if (countDisp) countDisp.textContent = state.count;
        var countField = countDisp && countDisp.closest('.rsvp-field');
        if (countField) countField.style.display = state.coming === 'yes' ? 'block' : 'none';
        if (waLink) {
            var msg = state.coming === 'yes'
                ? 'Ganpati Bappa Morya! We are coming.' + (state.name ? '\n' + state.name : '') + ' \u2014 ' + state.count + ' ' + (state.count === 1 ? 'person' : 'people')
                : 'Ganpati Bappa Morya! We cannot make it this year \u2014 our blessings to the house.' + (state.name ? '\n\u2014 ' + state.name : '');
            waLink.href = 'https://wa.me/919588425092?text=' + encodeURIComponent(msg);
        }
    }

    if (rsvpInput) rsvpInput.addEventListener('input', function (e) { state.name = e.target.value; updateRSVP(); });
    choiceBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.coming = btn.textContent.trim().toLowerCase().startsWith('yes') ? 'yes' : 'no';
            updateRSVP();
        });
    });
    if (minusBtn) minusBtn.addEventListener('click', function () { state.count = Math.max(1, state.count - 1); updateRSVP(); });
    if (plusBtn)  plusBtn.addEventListener('click',  function () { state.count = Math.min(30, state.count + 1); updateRSVP(); });
    updateRSVP();

    // ─── Petals canvas animation (ported from original v() component) ────────
    (function initPetals() {
        var cvs = document.querySelector('canvas.petals');
        if (!cvs) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var ctx = cvs.getContext('2d');
        if (!ctx) return;

        // Petal colour pairs [top, bottom] — marigold / flame palette
        var COLORS = [
            ['#F5A623','#D9701A'],
            ['#F7C948','#E09A1B'],
            ['#EE7B2B','#C4521A'],
            ['#FBD97A','#E3A62E'],
            ['#E2542A','#A83A16']
        ];

        var W = 0, H = 0, dpr = 1, petals = [], rafId = 0, active = true;

        function resetPetal(p, fromTop) {
            var sz = 9 + 15 * Math.random();
            p.w     = sz;
            p.h     = sz * (1.5 + 0.5 * Math.random());
            p.x     = Math.random() * W;
            p.y     = fromTop ? -p.h - Math.random() * H * 0.4 : Math.random() * H;
            p.vy    = 16 + 30 * Math.random();
            p.drift = 14 + 26 * Math.random();
            p.phase = Math.random() * Math.PI * 2;
            p.spin  = (Math.random() - 0.5) * 1.1;
            p.rot   = Math.random() * Math.PI * 2;
            p.a     = 0.42 + 0.42 * Math.random();
            p.c     = COLORS[Math.random() * COLORS.length | 0];
        }

        function resize() {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            W   = cvs.clientWidth;
            H   = cvs.clientHeight;
            cvs.width  = Math.round(W * dpr);
            cvs.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var count = W < 640 ? 24 : 42;
            while (petals.length < count) { var p = {}; resetPetal(p, false); petals.push(p); }
            petals.length = count;
        }

        resize();
        var ro = new ResizeObserver(resize);
        ro.observe(cvs);

        var lastTime = performance.now();

        function frame(now) {
            if (!active) return;
            var dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < petals.length; i++) {
                var p = petals[i];
                p.y     += p.vy * dt;
                p.phase += 1.5 * dt;
                p.rot   += p.spin * dt;
                p.x     += Math.sin(p.phase) * p.drift * dt;
                if (p.y > H + p.h) resetPetal(p, true);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(Math.max(0.22, Math.abs(Math.cos(0.8 * p.phase))), 1);
                ctx.globalAlpha = p.a;
                var grad = ctx.createLinearGradient(0, -p.h / 2, 0, p.h / 2);
                grad.addColorStop(0, p.c[0]);
                grad.addColorStop(1, p.c[1]);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, -p.h / 2);
                ctx.bezierCurveTo( p.w/2, -p.h/4,  p.w/2, p.h/3, 0,  p.h/2);
                ctx.bezierCurveTo(-p.w/2,  p.h/3, -p.w/2, -p.h/4, 0, -p.h/2);
                ctx.fill();
                ctx.restore();
            }
            rafId = requestAnimationFrame(frame);
        }
        rafId = requestAnimationFrame(frame);

        // Pause when tab is hidden
        function onVisibility() {
            if (document.hidden) {
                active = false;
                cancelAnimationFrame(rafId);
            } else if (!active) {
                active = true;
                lastTime = performance.now();
                rafId = requestAnimationFrame(frame);
            }
        }
        document.addEventListener('visibilitychange', onVisibility);

        // Show/hide petals based on whether div.page is in viewport
        // CSS: .page[data-petals=on] .petals { opacity:1 }
        var pageDiv = cvs.parentElement;
        if (pageDiv && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                pageDiv.dataset.petals = entries[0].isIntersecting ? 'on' : 'off';
            }, { rootMargin: '-12% 0px' }).observe(pageDiv);
        } else if (pageDiv) {
            pageDiv.dataset.petals = 'on';
        }
    })();

    // Scene parallax
    document.querySelectorAll('.scene').forEach(function (scene) {
        var img = scene.querySelector('img');
        if (!img || !('IntersectionObserver' in window)) return;
        var visible = false, raf = null;
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible && !raf) raf = requestAnimationFrame(tick);
        }, { rootMargin: '10% 0px' }).observe(scene);
        function tick() {
            if (!visible) { raf = null; return; }
            var r = scene.getBoundingClientRect();
            var offset = (window.innerHeight / 2 - (r.top + r.height / 2)) / (window.innerHeight / 2 + r.height / 2);
            img.style.transform = 'translate3d(0,' + (7 * Math.max(-1, Math.min(1, offset))).toFixed(2) + '%, 0) scale(var(--push, 1.05))';
            raf = requestAnimationFrame(tick);
        }
    });
});
