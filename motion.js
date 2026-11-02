/* Optional motion. Content and enquiry controls work independently in app.js. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduceMotion = reduced.matches, finePointer = fine.matches;
  if (!("IntersectionObserver" in window) || !("ResizeObserver" in window)) return;
  function $(selector) { return d.querySelector(selector); }
  function $$(selector) { return Array.from(d.querySelectorAll(selector)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  var toggle = $("#motion-toggle"), scatter = $("#particle-scatter");
  var paused = false, jobs = [], raf = 0, last = 0, clock = 0, entrances = [];
  function enabled() { return !reduceMotion && !paused; }
  function runnable(job) { return job.visible && !job.done; }

  // One clock for all continuous effects; no off-screen or background work.
  function sync() {
    if (!enabled() || d.hidden || !jobs.some(runnable)) {
      cancelAnimationFrame(raf); raf = 0; last = 0;
    } else if (!raf) {
      last = 0; raf = requestAnimationFrame(tick);
    }
  }
  function tick(time) {
    raf = 0;
    if (!enabled() || d.hidden) return;
    var delta = last ? Math.min((time - last) / 16.667, 2) : 1;
    last = time; clock += delta * 16.667;
    jobs.forEach(function (job) {
      if (runnable(job) && job.frame(clock, delta) === false) job.done = true;
    });
    if (jobs.some(runnable)) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      jobs.forEach(function (job) {
        if (job.element === entry.target) {
          job.visible = entry.isIntersecting;
          if (!job.visible && job.leave) job.leave();
        }
      });
    });
    sync();
  });
  function loop(element, frame, leave) {
    var job = { element: element, frame: frame, leave: leave, visible: false, done: false };
    jobs.push(job); observer.observe(element);
    return job;
  }

  var pointerResets = [];
  function pointer(element, move, leave) {
    var bounds;
    function reset() { bounds = null; leave(); }
    element.addEventListener("pointerenter", function () {
      if (!enabled() || !finePointer) return;
      var rect = element.getBoundingClientRect();
      bounds = { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    element.addEventListener("pointermove", function (event) {
      if (!bounds || !enabled() || !finePointer) return;
      move(event.pageX - bounds.left, event.pageY - bounds.top, bounds);
    });
    element.addEventListener("pointerleave", reset);
    pointerResets.push(reset);
  }

  var hero = $(".hero"), field = $("#hero-field"), deck = $("#deck");
  var fieldContext = field.getContext("2d");
  var width = 0, height = 0, dots = [], target = { x: 0, y: 0, active: false };
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 }, scroll = 0;
  function sizeField() {
    width = hero.clientWidth; height = hero.clientHeight;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    field.width = Math.round(width * ratio); field.height = Math.round(height * ratio);
    if (!fieldContext) return;
    fieldContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots = [];
    for (var y = 15; y < height; y += 30) {
      for (var x = 15; x < width; x += 30) dots.push({ x: x, y: y });
    }
  }
  pointer(hero, function (x, y, bounds) {
    target.x = x; target.y = y; target.active = true;
    tilt.tx = clamp((y / bounds.height - 0.5) * -7, -3.5, 3.5);
    tilt.ty = clamp((x / bounds.width - 0.5) * 9, -4.5, 4.5);
  }, function () { target.active = false; tilt.tx = tilt.ty = 0; });
  window.addEventListener("scroll", function () { scroll = window.scrollY; }, { passive: true });
  function resetDeck() {
    tilt.x = tilt.y = tilt.tx = tilt.ty = 0;
    deck.style.removeProperty("--tilt-x"); deck.style.removeProperty("--tilt-y"); deck.style.removeProperty("--float");
  }
  if (fieldContext) new ResizeObserver(sizeField).observe(hero);
  loop(hero, function (time, delta) {
    if (fieldContext) {
      var mx = target.active ? target.x : width * (0.65 + 0.22 * Math.sin(time / 3300));
      var my = target.active ? target.y : height * (0.45 + 0.24 * Math.cos(time / 4200));
      fieldContext.clearRect(0, 0, width, height);
      var glow = fieldContext.createRadialGradient(mx, my, 0, mx, my, 260);
      glow.addColorStop(0, "rgba(255,120,79,.075)"); glow.addColorStop(1, "rgba(255,120,79,0)");
      fieldContext.fillStyle = glow; fieldContext.fillRect(0, 0, width, height);
      dots.forEach(function (dot) {
        var dx = dot.x - mx, dy = dot.y - my, distance = Math.sqrt(dx * dx + dy * dy) || 1;
        var force = Math.max(0, 1 - distance / 190), push = force * force * 17;
        var size = 0.7 + force * 0.8;
        fieldContext.fillStyle = force > 0 ? "rgba(255,148,105," + (0.12 + force * 0.55) + ")" : "rgba(187,200,157,.12)";
        fieldContext.fillRect(dot.x + dx / distance * push, dot.y + dy / distance * push, size * 2, size * 2);
      });
      field.dataset.ready = "";
    }
    var ease = 1 - Math.pow(0.9, delta);
    tilt.x += (tilt.tx - tilt.x) * ease; tilt.y += (tilt.ty - tilt.y) * ease;
    deck.style.setProperty("--tilt-x", (tilt.x + Math.min(scroll / 200, 3)).toFixed(2) + "deg");
    deck.style.setProperty("--tilt-y", tilt.y.toFixed(2) + "deg");
    deck.style.setProperty("--float", (Math.sin(time / 1400) * 5).toFixed(2) + "px");
  }, function () { target.active = false; resetDeck(); });

  $$(".tile").forEach(function (tile) {
    pointer(tile, function (x, y) {
      tile.style.setProperty("--mx", x.toFixed(1) + "px"); tile.style.setProperty("--my", y.toFixed(1) + "px");
      tile.dataset.hover = "";
    }, function () { delete tile.dataset.hover; });
  });
  $$(".btn").forEach(function (button) {
    if (!button.querySelector("span[aria-hidden]")) return;
    pointer(button, function (x, y, bounds) {
      if (button.disabled) return;
      button.style.setProperty("--mag-x", clamp((x / bounds.width - 0.5) * 12, -6, 6).toFixed(1) + "px");
      button.style.setProperty("--mag-y", clamp((y / bounds.height - 0.5) * 8, -4, 4).toFixed(1) + "px");
    }, function () { button.style.removeProperty("--mag-x"); button.style.removeProperty("--mag-y"); });
  });

  // Animate only on entry, never by hiding the underlying content.
  var reveal = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      reveal.unobserve(entry.target);
      if (!enabled() || d.hidden || !entry.target.animate) return;
      var animation = entry.target.animate([
        { opacity: 0.75, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" });
      entrances.push(animation);
      animation.onfinish = function () { entrances = entrances.filter(function (other) { return other !== animation; }); };
    });
  }, { threshold: 0.12 });
  $$(".sec-head, .intro-heading, .benefits article, .price, .ai-note, .tile, .contact h2").forEach(function (element) { reveal.observe(element); });

  var comparison = $("#ba"), slider = comparison.querySelector("input"), hintTime = 0;
  function resetHint() { comparison.style.setProperty("--pos", slider.value + "%"); }
  var hint = loop(comparison, function (time, delta) {
    if (comparison.contains(d.activeElement)) { resetHint(); return false; }
    hintTime += delta * 16.667;
    var progress = Math.min(hintTime / 1400, 1);
    comparison.style.setProperty("--pos", (50 - Math.sin(progress * Math.PI * 2) * Math.sin(progress * Math.PI) * 16).toFixed(2) + "%");
    if (progress === 1) { resetHint(); return false; }
  }, function () { if (hintTime) { hint.done = true; resetHint(); } });
  ["pointerdown", "focusin", "input"].forEach(function (event) {
    comparison.addEventListener(event, function () { hint.done = true; resetHint(); sync(); });
  });

  var stage = $("#particle-stage"), canvas = $("#particles"), context = canvas.getContext("2d");
  var particles = [], stageWidth = 0, stageHeight = 0, radius = 65;
  var mouse = { x: -999, y: -999 }, pointSize = 1.5;
  function drawParticles() {
    if (!context) return;
    context.clearRect(0, 0, stageWidth, stageHeight);
    particles.forEach(function (particle) {
      context.fillStyle = particle.colour;
      context.fillRect(particle.x, particle.y, pointSize, pointSize);
    });
    stage.dataset.ready = "";
  }
  function settle() {
    particles.forEach(function (particle) { particle.x = particle.homeX; particle.y = particle.homeY; particle.vx = particle.vy = 0; });
    mouse.x = mouse.y = -999;
  }
  function buildParticles() {
    if (!context) return;
    stageWidth = stage.clientWidth; stageHeight = stage.clientHeight;
    if (!stageWidth || !stageHeight) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2), sample = d.createElement("canvas");
    sample.width = Math.round(stageWidth); sample.height = Math.round(stageHeight);
    var sampleContext = sample.getContext("2d");
    if (!sampleContext) return;
    canvas.width = Math.round(stageWidth * ratio); canvas.height = Math.round(stageHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    sampleContext.font = "700 100px " + getComputedStyle(d.body).fontFamily;
    var fontSize = Math.min(stageHeight * 0.55, stageWidth * 0.83 / sampleContext.measureText("FRONT").width * 100);
    sampleContext.font = "700 " + fontSize + "px " + getComputedStyle(d.body).fontFamily;
    sampleContext.textAlign = "center"; sampleContext.textBaseline = "middle";
    sampleContext.fillText("FRONT", stageWidth / 2, stageHeight / 2);
    var data = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
    var spacing = Math.max(3, Math.round(fontSize / 32));
    pointSize = Math.max(1.5, spacing * 0.6); particles = [];
    for (var y = 0; y < sample.height; y += spacing) {
      for (var x = 0; x < sample.width; x += spacing) {
        if (data[(y * sample.width + x) * 4 + 3] < 160) continue;
        var mix = x / stageWidth;
        particles.push({
          homeX: x, homeY: y, x: x, y: y, vx: 0, vy: 0,
          colour: "rgb(255," + Math.round(120 + mix * 78) + "," + Math.round(79 + mix * 76) + ")"
        });
      }
    }
    drawParticles();
  }
  pointer(stage, function (x, y) { mouse.x = x; mouse.y = y; }, function () { mouse.x = mouse.y = -999; });
  scatter.addEventListener("click", function () {
    if (!enabled()) return;
    particles.forEach(function (particle) {
      var dx = particle.x - stageWidth / 2, dy = particle.y - stageHeight / 2, length = Math.sqrt(dx * dx + dy * dy) || 1;
      particle.vx = dx / length * (9 + Math.random() * 14);
      particle.vy = dy / length * (9 + Math.random() * 14) + (Math.random() - 0.5) * 10;
    });
  });
  if (context) new ResizeObserver(buildParticles).observe(stage);
  loop(stage, function (time, delta) {
    var damping = Math.pow(0.84, delta);
    particles.forEach(function (particle) {
      var dx = particle.x - mouse.x, dy = particle.y - mouse.y, distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance < radius) {
        var force = (1 - distance / radius) * 3.5 * delta;
        particle.vx += dx / distance * force; particle.vy += dy / distance * force;
      }
      var drift = Math.sin(time / 900 + particle.homeX * 0.015) * 0.7;
      particle.vx = (particle.vx + (particle.homeX - particle.x) * 0.045 * delta) * damping;
      particle.vy = (particle.vy + (particle.homeY + drift - particle.y) * 0.045 * delta) * damping;
      particle.x += particle.vx * delta; particle.y += particle.vy * delta;
    });
    drawParticles();
  }, function () { settle(); });

  function cancelEntrances() {
    entrances.forEach(function (animation) { animation.cancel(); }); entrances = [];
  }
  function updateMotion() {
    root.classList.toggle("motion-paused", !enabled());
    toggle.hidden = reduceMotion;
    toggle.textContent = paused ? "Resume motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
    scatter.hidden = !enabled() || !context;
    if (!enabled()) {
      cancelEntrances(); pointerResets.forEach(function (reset) { reset(); });
      resetDeck(); settle(); resetHint();
    }
    sync();
  }
  toggle.addEventListener("click", function () { paused = !paused; updateMotion(); });
  reduced.addEventListener("change", function (event) { reduceMotion = event.matches; updateMotion(); });
  fine.addEventListener("change", function (event) {
    finePointer = event.matches;
    pointerResets.forEach(function (reset) { reset(); });
  });
  window.addEventListener("resize", function () { pointerResets.forEach(function (reset) { reset(); }); });
  d.addEventListener("visibilitychange", function () {
    root.classList.toggle("motion-suspended", d.hidden);
    if (d.hidden) { cancelEntrances(); pointerResets.forEach(function (reset) { reset(); }); }
    sync();
  });
  sizeField(); buildParticles();
  root.classList.add("motion-ready");
  updateMotion();
})();
