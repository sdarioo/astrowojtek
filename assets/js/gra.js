/* ==================================================
   STAR-SHIP-WARS 9.0 - wersja JavaScript (Canvas 2D)
   Przeniesiona 1:1 z wersji Godot 4 (gra.txt).
   8 SWIATOW - PLANETY UKLADU SLONECZNEGO
   W KAZDYM SWIECIE MASZ OSOBNE 3 ZYCIA

   Cala grafika jest generowana kodem (zadnych plikow):
   - planety: proceduralne tekstury z oswietleniem 3D
   - statek i UFO: metaliczne cieniowanie, szklo, swiatla
   - swiatlo: warstwa z mieszaniem addytywnym (poswiata)
   - wybuchy: ogien, dym, iskry, fala uderzeniowa
   ================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('gra-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Rozdzielczosc logiczna (jak domyslne okno Godota); obraz skaluje sie do strony.
  var W = 1152;
  var H = 648;
  var S = 1; // skala: piksele canvasa / jednostki logiczne

  var PLAYER_SPEED = 350.0;
  var BULLET_SPEED = 650.0;
  var ENEMY_BULLET_SPEED = 280.0;
  var STAR_SPEED = 230.0;
  var PLANET_SPEED = 220.0;
  var LIVES_PER_WORLD = 3;
  var PLANET_TEX_SIZE = 200;

  var TAU = Math.PI * 2;
  var PI = Math.PI;
  var FONT = '"Exo 2", "Segoe UI", system-ui, sans-serif';

  // ==================================================
  // POMOCNICZE: liczby losowe, kolory, interpolacja
  // ==================================================

  function randf() { return Math.random(); }
  function randfRange(a, b) { return a + Math.random() * (b - a); }
  function randi(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(e0, e1, x) {
    if (e0 === e1) return x < e0 ? 0 : 1;
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // kolor = [r, g, b, a] w zakresie 0..1
  function col(r, g, b, a) { return [r, g, b, a === undefined ? 1 : a]; }
  function col8(r, g, b, a) { return [r / 255, g / 255, b / 255, a === undefined ? 1 : a / 255]; }
  function colLerp(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), lerp(c1[3], c2[3], t)];
  }
  function css(c) {
    return 'rgba(' + Math.round(clamp(c[0], 0, 1) * 255) + ',' + Math.round(clamp(c[1], 0, 1) * 255) + ',' +
      Math.round(clamp(c[2], 0, 1) * 255) + ',' + clamp(c[3], 0, 1).toFixed(3) + ')';
  }
  var WHITE = col(1, 1, 1);
  var BLACK = col(0, 0, 0);

  // ==================================================
  // SZUM SIMPLEX (zamiennik FastNoiseLite) + FBM
  // ==================================================

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GRAD3 = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ]);
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var F3 = 1 / 3;
  var G3 = 1 / 6;

  function makeSimplex(seed) {
    var rnd = mulberry32(seed * 7919 + 13);
    var p = new Uint8Array(256);
    var i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    var perm = new Uint8Array(512);
    var pm12 = new Uint8Array(512);
    for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }

    function n2(xin, yin) {
      var n0 = 0, n1 = 0, n2v = 0;
      var s = (xin + yin) * F2;
      var i = Math.floor(xin + s), j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var x0 = xin - (i - t), y0 = yin - (j - t);
      var i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255, g;
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) { g = pm12[ii + perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0); }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) { g = pm12[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1); }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) { g = pm12[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n2v = t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2); }
      return 70 * (n0 + n1 + n2v);
    }

    function n3(xin, yin, zin) {
      var n0 = 0, n1 = 0, n2v = 0, n3v = 0;
      var s = (xin + yin + zin) * F3;
      var i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      var x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      var ii = i & 255, jj = j & 255, kk = k & 255, g;
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 > 0) { g = pm12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0 + GRAD3[g + 2] * z0); }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 > 0) { g = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1 + GRAD3[g + 2] * z1); }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 > 0) { g = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2v = t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2 + GRAD3[g + 2] * z2); }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 > 0) { g = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3v = t3 * t3 * (GRAD3[g] * x3 + GRAD3[g + 1] * y3 + GRAD3[g + 2] * z3); }
      return 32 * (n0 + n1 + n2v + n3v);
    }

    return { n2: n2, n3: n3 };
  }

  // Jak FastNoiseLite: FBM, lacunarity 2, gain 0.5, wynik znormalizowany do ok. -1..1.
  function makeNoise(seed, frequency, octaves) {
    var layers = [];
    for (var i = 0; i < octaves; i++) layers.push(makeSimplex(seed + i));
    var amp = 0.5, ampFractal = 1.0;
    for (i = 1; i < octaves; i++) { ampFractal += amp; amp *= 0.5; }
    var bounding = 1 / ampFractal;

    return {
      get2: function (x, y) {
        x *= frequency; y *= frequency;
        var sum = 0, a = bounding;
        for (var o = 0; o < layers.length; o++) {
          sum += layers[o].n2(x, y) * a;
          x *= 2; y *= 2; a *= 0.5;
        }
        return sum;
      },
      get3: function (x, y, z) {
        x *= frequency; y *= frequency; z *= frequency;
        var sum = 0, a = bounding;
        for (var o = 0; o < layers.length; o++) {
          sum += layers[o].n3(x, y, z) * a;
          x *= 2; y *= 2; z *= 2; a *= 0.5;
        }
        return sum;
      }
    };
  }

  // ==================================================
  // STAN GRY
  // ==================================================

  var player = { x: 150, y: H / 2 };
  var playerTilt = 0.0;

  var lives = LIVES_PER_WORLD;
  var score = 0;
  var gameOver = false;
  var victory = false;

  var bullets = [];
  var enemyBullets = [];
  var ufos = [];
  var stars = [];
  var particles = [];

  var shootTimer = 0.0;
  var spawnTimer = 0.0;
  var invulnerability = 0.0;
  var elapsedTime = 0.0;
  var bannerTimer = 3.0;
  var shake = 0.0;
  var shakeX = 0.0;
  var shakeY = 0.0;

  // tekstury (offscreen canvas)
  var nebulaImage = null;
  var nebulaTinted = {};
  var planetTextures = {};
  var glowGradients = {};

  // ==================================================
  // SWIATY
  // ==================================================

  var worldNumber = 1;

  var planetNames = [
    'MERKURY', 'WENUS', 'ZIEMIA', 'MARS',
    'JOWISZ', 'SATURN', 'URAN', 'NEPTUN'
  ];

  var planetColors = [
    col8(160, 130, 110),
    col8(220, 155, 90),
    col8(50, 120, 230),
    col8(190, 85, 55),
    col8(210, 165, 115),
    col8(220, 195, 125),
    col8(100, 210, 220),
    col8(45, 75, 210)
  ];

  // promien planety na ekranie
  var planetRadii = [44.0, 60.0, 62.0, 50.0, 96.0, 70.0, 68.0, 66.0];

  // kolor atmosfery (alfa = sila poswiaty na krawedzi)
  var planetAtmos = [
    col(0.8, 0.8, 0.8, 0.0),
    col(1.0, 0.8, 0.5, 0.7),
    col(0.4, 0.7, 1.0, 0.9),
    col(0.9, 0.55, 0.35, 0.35),
    col(0.9, 0.8, 0.65, 0.35),
    col(0.95, 0.88, 0.65, 0.35),
    col(0.6, 0.95, 1.0, 0.6),
    col(0.35, 0.55, 1.0, 0.7)
  ];

  var ufoPalette = [
    col(1.0, 0.25, 0.3),
    col(1.0, 0.85, 0.3),
    col(0.3, 1.0, 0.55),
    col(0.35, 0.75, 1.0)
  ];

  var ufoLimit = 20;
  var ufosSpawned = 0;
  var ufosDefeated = 0;

  var planetActive = false;
  var planetPos = { x: 0, y: 0 };

  // ==================================================
  // START
  // ==================================================

  function init() {
    var starColors = [
      col(0.85, 0.90, 1.0),
      col(1.0, 0.95, 0.80),
      col(1.0, 0.80, 0.65),
      col(0.70, 0.85, 1.0)
    ];

    for (var i = 0; i < 150; i++) {
      var spd = randfRange(40, STAR_SPEED);
      stars.push({
        x: randfRange(0, W),
        y: randfRange(0, H),
        speed: spd,
        size: 0.6 + (spd / STAR_SPEED) * 2.0,
        color: starColors[randi(starColors.length)],
        tw: randfRange(1.5, 4.0),
        ph: randfRange(0.0, TAU)
      });
    }

    nebulaImage = makeNebulaImage();
    getPlanetTexture(0);
  }

  // ==================================================
  // TEKSTURY PROCEDURALNE
  // ==================================================

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Poswiata: biala plama o profilu (1 - d)^2, zabarwiana kolorem.
  // W przegladarce zamiast tekstury uzywamy gradientu radialnego w ukladzie jednostkowym.
  function glowGradient(c) {
    var r = Math.round(clamp(c[0], 0, 1) * 255);
    var g = Math.round(clamp(c[1], 0, 1) * 255);
    var b = Math.round(clamp(c[2], 0, 1) * 255);
    var key = (r << 16) | (g << 8) | b;
    var grad = glowGradients[key];
    if (grad) return grad;

    grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (var i = 0; i <= 10; i++) {
      var t = i / 10;
      var a = Math.pow(1 - t, 2);
      grad.addColorStop(t, 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(4) + ')');
    }
    glowGradients[key] = grad;
    return grad;
  }

  function makeNebulaImage() {
    var w = 320;
    var h = 180;
    var data = new Float32Array(w * h * 4);

    var n1 = makeNoise(7, 0.012, 5);
    var n2 = makeNoise(31, 0.02, 5);

    var c1 = col(0.35, 0.15, 0.65), c2 = col(0.10, 0.35, 0.80), c3 = col(0.80, 0.25, 0.50);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var v = n1.get2(x, y);
        var a = clamp((v + 0.05) * 1.5, 0.0, 1.0);
        a = a * a;
        var c = n2.get2(x, y) * 0.5 + 0.5;
        var cc = colLerp(c1, c2, c);
        cc = colLerp(cc, c3, clamp((v - 0.2) * 2.0, 0.0, 1.0));
        var o = (y * w + x) * 4;
        data[o] = cc[0]; data[o + 1] = cc[1]; data[o + 2] = cc[2]; data[o + 3] = a * 0.55;
      }
    }

    return { w: w, h: h, data: data };
  }

  // Mglawica w kolorze swiata (odpowiednik modulate w draw_texture_rect).
  function getNebula(idx) {
    if (nebulaTinted[idx]) return nebulaTinted[idx];

    var tint = colLerp(planetColors[idx], WHITE, 0.55);
    var n = nebulaImage;
    var cv = makeCanvas(n.w, n.h);
    var cx = cv.getContext('2d');
    var img = cx.createImageData(n.w, n.h);
    var d = img.data;
    for (var i = 0; i < n.data.length; i += 4) {
      d[i] = n.data[i] * tint[0] * 255;
      d[i + 1] = n.data[i + 1] * tint[1] * 255;
      d[i + 2] = n.data[i + 2] * tint[2] * 255;
      d[i + 3] = n.data[i + 3] * 0.8 * 255;
    }
    cx.putImageData(img, 0, 0);
    nebulaTinted[idx] = cv;
    return cv;
  }

  function getPlanetTexture(idx) {
    if (planetTextures[idx]) return planetTextures[idx];
    var tex = makePlanetTexture(idx, PLANET_TEX_SIZE);
    planetTextures[idx] = tex;
    return tex;
  }

  // Zwraca { full, dim } - pelna tekstura oraz przyciemniona (planeta w tle).
  function makePlanetTexture(idx, size) {
    var n1 = makeNoise(100 + idx * 17, 1.0, 5);
    var n2 = makeNoise(500 + idx * 31, 1.0, 4);

    var lx = -0.55, ly = -0.5, lz = 0.67;
    var ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ll; ly /= ll; lz /= ll;

    var r = size / 2.0;
    var atm = planetAtmos[idx];

    var full = makeCanvas(size, size);
    var dim = makeCanvas(size, size);
    var fctx = full.getContext('2d');
    var dctx = dim.getContext('2d');
    var fimg = fctx.createImageData(size, size);
    var dimg = dctx.createImageData(size, size);
    var fd = fimg.data;
    var dd = dimg.data;

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = (x + 0.5 - r) / r;
        var ny = (y + 0.5 - r) / r;
        var d2 = nx * nx + ny * ny;
        if (d2 >= 1.0) continue; // przezroczysty piksel

        var nz = Math.sqrt(1.0 - d2);
        var c = planetSurfaceColor(idx, n1, n2, nx, ny, nz);

        // oswietlenie 3D
        var diff = Math.max(0.0, nx * lx + ny * ly + nz * lz);
        var shade = 0.05 + 0.95 * Math.pow(diff, 0.85);
        shade *= (0.55 + 0.45 * nz);

        var lit = col(c[0] * shade, c[1] * shade, c[2] * shade, 1.0);

        // atmosfera na krawedzi
        var rim = Math.pow(1.0 - nz, 2.5);
        var rimAmount = clamp(rim * atm[3] * 1.4, 0.0, 1.0) * (0.25 + 0.75 * diff);
        lit = colLerp(lit, col(atm[0], atm[1], atm[2]), rimAmount);

        // wygladzenie krawedzi
        var alpha = clamp((1.0 - Math.sqrt(d2)) * r / 1.5, 0.0, 1.0);

        var o = (y * size + x) * 4;
        fd[o] = clamp(lit[0], 0, 1) * 255;
        fd[o + 1] = clamp(lit[1], 0, 1) * 255;
        fd[o + 2] = clamp(lit[2], 0, 1) * 255;
        fd[o + 3] = alpha * 255;
        dd[o] = fd[o] * 0.55;
        dd[o + 1] = fd[o + 1] * 0.55;
        dd[o + 2] = fd[o + 2] * 0.6;
        dd[o + 3] = fd[o + 3];
      }
    }

    fctx.putImageData(fimg, 0, 0);
    dctx.putImageData(dimg, 0, 0);
    return { full: full, dim: dim };
  }

  function planetSurfaceColor(idx, n1, n2, nx, ny, nz) {
    var a = n1.get3(nx * 2.5, ny * 2.5, nz * 2.5);
    var b = n1.get3(nx * 8.0, ny * 8.0, nz * 8.0);
    var c = n2.get3(nx * 3.2, ny * 3.2, nz * 3.2);
    var cc = WHITE;
    var band, dx, dy, spot, ice;

    switch (idx) {
      case 0: {
        // Merkury - szara, pokryta kraterami
        var g = 0.46 + a * 0.20 + b * 0.16;
        var crater = clamp(1.0 - Math.abs(n2.get3(nx * 10.0, ny * 10.0, nz * 10.0)) * 9.0, 0.0, 1.0);
        g -= crater * 0.14;
        cc = col(g * 1.02, g * 0.96, g * 0.90);
        break;
      }
      case 1: {
        // Wenus - gesta, wirujaca atmosfera
        var swirl = 0.5 + 0.5 * Math.sin(ny * 7.0 + a * 5.0);
        cc = colLerp(col(0.80, 0.52, 0.24), col(0.96, 0.82, 0.52), swirl);
        cc = colLerp(cc, col(1.0, 0.95, 0.8), clamp(c, 0.0, 1.0) * 0.3);
        break;
      }
      case 2: {
        // Ziemia - oceany, ladzie, lod, chmury
        var land = smoothstep(0.02, 0.10, a + b * 0.08);
        var ocean = colLerp(col(0.04, 0.16, 0.42), col(0.10, 0.38, 0.72), clamp(0.5 + a, 0.0, 1.0));
        var ground = colLerp(col(0.18, 0.40, 0.16), col(0.52, 0.42, 0.25), clamp(0.5 + b * 1.5 + Math.abs(ny) * 0.3, 0.0, 1.0));
        cc = colLerp(ocean, ground, land);
        ice = smoothstep(0.80, 0.90, Math.abs(ny) + b * 0.06);
        cc = colLerp(cc, col(0.95, 0.97, 1.0), ice);
        var cloud = smoothstep(0.02, 0.35, c);
        cc = colLerp(cc, col(1.0, 1.0, 1.0), cloud * 0.8);
        break;
      }
      case 3: {
        // Mars - rdzawa pustynia i czapy polarne
        var t = clamp(0.5 + a * 0.9 + b * 0.25, 0.0, 1.0);
        cc = colLerp(col(0.46, 0.20, 0.12), col(0.78, 0.40, 0.22), t);
        ice = smoothstep(0.86, 0.93, Math.abs(ny) + b * 0.04);
        cc = colLerp(cc, col(0.95, 0.92, 0.90), ice);
        break;
      }
      case 4: {
        // Jowisz - pasy i Wielka Czerwona Plama
        band = 0.5 + 0.5 * Math.sin(ny * 14.0 + a * 2.4 + b * 0.8);
        cc = colLerp(col(0.50, 0.32, 0.20), col(0.90, 0.78, 0.60), band);
        dx = (nx - 0.25) / 0.24;
        dy = (ny - 0.30) / 0.11;
        spot = clamp(1.0 - (dx * dx + dy * dy), 0.0, 1.0);
        cc = colLerp(cc, col(0.72, 0.28, 0.16), smoothstep(0.0, 0.5, spot));
        break;
      }
      case 5: {
        // Saturn - delikatne pasy
        band = 0.5 + 0.5 * Math.sin(ny * 11.0 + a * 1.2 + b * 0.4);
        cc = colLerp(col(0.72, 0.60, 0.38), col(0.92, 0.82, 0.58), band);
        break;
      }
      case 6: {
        // Uran - gladki, blekitny
        band = 0.5 + 0.5 * Math.sin(ny * 6.0 + a * 0.6);
        cc = colLerp(col(0.46, 0.78, 0.84), col(0.62, 0.90, 0.92), band);
        break;
      }
      case 7: {
        // Neptun - gleboki blekit, ciemna plama i chmury
        band = 0.5 + 0.5 * Math.sin(ny * 9.0 + a * 1.5);
        cc = colLerp(col(0.10, 0.22, 0.70), col(0.20, 0.42, 0.92), band);
        dx = (nx + 0.2) / 0.22;
        dy = (ny - 0.2) / 0.12;
        spot = clamp(1.0 - (dx * dx + dy * dy), 0.0, 1.0);
        cc = colLerp(cc, col(0.04, 0.08, 0.35), smoothstep(0.0, 0.5, spot));
        var cirrus = smoothstep(0.35, 0.6, b + c * 0.3);
        cc = colLerp(cc, col(0.85, 0.92, 1.0), cirrus * 0.5);
        break;
      }
    }

    return cc;
  }

  // ==================================================
  // WEJSCIE (klawiatura + dotyk)
  // ==================================================

  var keys = {};
  var acceptPressed = false;
  var started = false;   // gra rusza po pierwszym kliknieciu
  var focused = false;   // klawisze lapiemy tylko, gdy gra ma fokus
  var touchActive = false;
  var touchY = H / 2;
  var usingTouch = false;

  var GAME_KEYS = {
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
    Space: 1, Enter: 1, NumpadEnter: 1, KeyW: 1, KeyS: 1, KeyX: 1
  };

  function isDown(code) { return keys[code] === true; }

  canvas.addEventListener('keydown', function (e) {
    if (GAME_KEYS[e.code]) e.preventDefault(); // spacja i strzalki nie przewijaja strony
    keys[e.code] = true;
    usingTouch = false;
    if (!e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) {
      acceptPressed = true;
    }
  });
  canvas.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('focus', function () { focused = true; started = true; });
  canvas.addEventListener('blur', function () { focused = false; keys = {}; touchActive = false; });

  function logicalY(e) {
    var rect = canvas.getBoundingClientRect();
    return (e.clientY - rect.top) / rect.height * H;
  }

  canvas.addEventListener('pointerdown', function (e) {
    canvas.focus();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      usingTouch = true;
      touchActive = true;
      touchY = logicalY(e);
      if (gameOver || victory) acceptPressed = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nic */ }
      e.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (touchActive) touchY = logicalY(e);
  });
  function endTouch() { touchActive = false; }
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);

  // ==================================================
  // GLOWNA PETLA
  // ==================================================

  function process(delta) {
    var running = started && focused;

    // pauza w trakcie gry - wszystko stoi
    if (started && !running) return;

    // wstrzas ekranu
    if (shake > 0) {
      shake = Math.max(0.0, shake - delta);
      shakeX = randfRange(-1, 1) * shake * 18.0;
      shakeY = randfRange(-1, 1) * shake * 18.0;
    } else {
      shakeX = 0;
      shakeY = 0;
    }

    updateStars(delta);
    if (!started) return; // ekran startowy: tylko gwiazdy

    updateParticles(delta);

    if (gameOver || victory) {
      if (acceptPressed) restartGame();
      return;
    }

    elapsedTime += delta;

    shootTimer -= delta;
    spawnTimer -= delta;
    invulnerability -= delta;
    bannerTimer -= delta;

    movePlayer(delta);
    updatePlayerBullets(delta);
    updateUfos(delta);
    updateEnemyBullets(delta);

    if (!planetActive && ufosSpawned < ufoLimit) {
      if (spawnTimer <= 0) {
        spawnUfo();
        spawnTimer = 1.0;
      }
    }

    if (planetActive) updatePlanet(delta);

    checkCollisions();
    updateWorldState();
  }

  // ==================================================
  // LICZBA UFO W SWIECIE
  // ==================================================

  function calculateUfoLimit() {
    return 20 + (worldNumber - 1) * 5;
  }

  function updateWorldState() {
    if (planetActive) return;

    if (ufosSpawned >= ufoLimit) {
      if (ufosDefeated >= ufoLimit && ufos.length === 0) activatePlanet();
    }
  }

  function activatePlanet() {
    planetActive = true;
    planetPos = { x: W + 150, y: H / 2.0 };

    bullets = [];
    enemyBullets = [];
    ufos = [];
  }

  function updatePlanet(delta) {
    planetPos.x -= PLANET_SPEED * delta;

    var r = planetRadii[worldNumber - 1];
    if (planetPos.x < -(r * 2.0)) planetPos.x = W + r * 2.0;
  }

  // ==================================================
  // PRZEJSCIE DO NASTEPNEGO SWIATA
  // ==================================================

  function enterPlanet() {
    planetActive = false;

    // blysk przy wlocie w planete
    addParticle('flash', planetPos.x, planetPos.y, 0, 0, 0.8, 450.0, col(1, 1, 1, 1));

    // Ostatni swiat (Neptun) - zwyciestwo!
    if (worldNumber >= 8) {
      victory = true;
      return;
    }

    worldNumber += 1;
    getPlanetTexture(worldNumber - 1);

    ufoLimit = calculateUfoLimit();
    ufosSpawned = 0;
    ufosDefeated = 0;

    bullets = [];
    enemyBullets = [];
    ufos = [];

    // NOWY SWIAT = NOWE 3 ZYCIA (punkty zostaja)
    lives = LIVES_PER_WORLD;

    spawnTimer = 1.0;
    invulnerability = 2.0;
    bannerTimer = 3.0;

    player = { x: 150, y: H / 2.0 };
  }

  // ==================================================
  // GWIAZDY
  // ==================================================

  function updateStars(delta) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= s.speed * delta;
      if (s.x < 0) {
        s.x = W;
        s.y = randfRange(0, H);
      }
    }
  }

  // ==================================================
  // STATEK
  // ==================================================

  function movePlayer(delta) {
    var dirY = 0.0;

    if (isDown('KeyW') || isDown('ArrowUp')) {
      player.y -= PLAYER_SPEED * delta;
      dirY -= 1.0;
    }

    if (isDown('KeyS') || isDown('ArrowDown')) {
      player.y += PLAYER_SPEED * delta;
      dirY += 1.0;
    }

    // dotyk: statek podaza za palcem z ta sama predkoscia
    if (touchActive) {
      var diff = touchY - player.y;
      if (Math.abs(diff) > 4) {
        var step = Math.min(Math.abs(diff), PLAYER_SPEED * delta);
        player.y += diff > 0 ? step : -step;
        dirY += diff > 0 ? 1.0 : -1.0;
      }
    }

    playerTilt = lerp(playerTilt, dirY * 0.16, 0.15);

    player.y = clamp(player.y, 55.0, H - 55.0);
    player.x = 150.0;

    if (isDown('Space') || isDown('KeyX') || touchActive) {
      if (shootTimer <= 0) {
        shootPlayerBullet();
        shootTimer = 0.20;
      }
    }
  }

  function shootPlayerBullet() {
    bullets.push({ x: player.x + 50, y: player.y, vx: BULLET_SPEED, vy: 0 });
    addParticle('flash', player.x + 52, player.y, 0, 0, 0.07, 24.0, col(0.6, 0.9, 1.0, 1.0));
  }

  function updatePlayerBullets(delta) {
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * delta;
      b.y += b.vy * delta;
      if (b.x > W + 40) bullets.splice(i, 1);
    }
  }

  // ==================================================
  // UFO
  // ==================================================

  function spawnUfo() {
    if (ufosSpawned >= ufoLimit) return;

    ufos.push({
      x: W + 60,
      y: randfRange(65, H - 65),
      hp: 2,
      speed: randfRange(100, 165),
      shootTimer: randfRange(1.0, 2.5),
      phase: randfRange(0.0, TAU),
      tilt: 0.0
    });

    ufosSpawned += 1;
  }

  function updateUfos(delta) {
    for (var i = ufos.length - 1; i >= 0; i--) {
      var u = ufos[i];

      var difference = player.y - u.y;
      var dy = clamp(difference, -100.0 * delta, 100.0 * delta);
      u.y += dy;

      if (delta > 0) {
        var ratio = dy / (100.0 * delta);
        u.tilt = lerp(u.tilt, ratio * 0.2, 0.1);
      }

      u.x -= u.speed * delta;
      u.phase += delta * 3.0;
      u.shootTimer -= delta;

      if (u.shootTimer <= 0) {
        shootEnemy(u.x, u.y);
        u.shootTimer = randfRange(1.3, 2.4);
      }

      // uszkodzone UFO dymi
      if (u.hp < 2 && randf() < delta * 12.0) {
        addParticle('smoke', u.x, u.y - 4, 50, randfRange(-12, 12), 0.9, 5.0, col(0.15, 0.15, 0.17, 1.0));
      }

      // UFO, ktore przeleci za statek, wraca z prawej strony.
      if (u.x < -60) u.x = W + 60;
    }
  }

  function shootEnemy(x, y) {
    var dx = player.x - x;
    var dy = player.y - y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    enemyBullets.push({ x: x, y: y, vx: dx / len * ENEMY_BULLET_SPEED, vy: dy / len * ENEMY_BULLET_SPEED });
  }

  function updateEnemyBullets(delta) {
    for (var i = enemyBullets.length - 1; i >= 0; i--) {
      var b = enemyBullets[i];
      b.x += b.vx * delta;
      b.y += b.vy * delta;

      if (b.x < -40 || b.x > W + 40) enemyBullets.splice(i, 1);
      else if (b.y < -40 || b.y > H + 40) enemyBullets.splice(i, 1);
    }
  }

  // ==================================================
  // KOLIZJE
  // ==================================================

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function checkCollisions() {
    var b, u;

    // Pociski gracza trafiaja UFO.
    for (b = bullets.length - 1; b >= 0; b--) {
      var bullet = bullets[b];
      var hit = false;

      for (u = ufos.length - 1; u >= 0; u--) {
        var ufo = ufos[u];

        if (dist(bullet.x, bullet.y, ufo.x, ufo.y) < 38) {
          ufo.hp -= 1;
          hit = true;
          spawnHit(bullet.x, bullet.y);

          if (ufo.hp <= 0) {
            spawnExplosion(ufo.x, ufo.y, 1.0);
            ufos.splice(u, 1);
            ufosDefeated += 1;
            score += 100;
          }
          break;
        }
      }

      if (hit) bullets.splice(b, 1);
    }

    // Kontakt z planeta.
    if (planetActive) {
      var r = planetRadii[worldNumber - 1];
      if (dist(player.x, player.y, planetPos.x, planetPos.y) < r + 33.0) {
        enterPlanet();
        return;
      }
    }

    if (invulnerability > 0) return;

    // Kontakt z UFO.
    for (u = ufos.length - 1; u >= 0; u--) {
      if (dist(player.x, player.y, ufos[u].x, ufos[u].y) < 42) {
        spawnExplosion(ufos[u].x, ufos[u].y, 1.0);
        ufos.splice(u, 1);
        ufosDefeated += 1;
        loseLife();
        return;
      }
    }

    // Trafienie pociskiem.
    for (b = enemyBullets.length - 1; b >= 0; b--) {
      if (dist(player.x, player.y, enemyBullets[b].x, enemyBullets[b].y) < 26) {
        spawnHit(enemyBullets[b].x, enemyBullets[b].y);
        enemyBullets.splice(b, 1);
        loseLife();
        return;
      }
    }
  }

  function loseLife() {
    lives -= 1;
    invulnerability = 2.0;
    shake = 0.4;

    spawnExplosion(player.x, player.y, 0.9);

    if (lives <= 0) {
      gameOver = true;
      spawnExplosion(player.x, player.y, 1.6);
      shake = 0.8;
    }
  }

  // ==================================================
  // CZASTECZKI I WYBUCHY
  // ==================================================

  function addParticle(kind, x, y, vx, vy, life, size, color) {
    particles.push({ kind: kind, x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, color: color });
  }

  function spawnHit(x, y) {
    addParticle('flash', x, y, 0, 0, 0.10, 28.0, col(1.0, 0.9, 0.6, 1.0));

    for (var i = 0; i < 5; i++) {
      var ang = randf() * TAU;
      var spd = randfRange(100.0, 260.0);
      addParticle('spark', x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, randfRange(0.15, 0.35), 2.0, col(1.0, 0.85, 0.5, 1.0));
    }
  }

  function spawnExplosion(x, y, scale) {
    var i, ang, spd;
    addParticle('flash', x, y, 0, 0, 0.20, 80.0 * scale, col(1.0, 0.95, 0.8, 1.0));
    addParticle('ring', x, y, 0, 0, 0.5, 8.0, col(1.0, 0.7, 0.3, 1.0));

    var fireCount = Math.floor(16.0 * scale) + 8;
    for (i = 0; i < fireCount; i++) {
      ang = randf() * TAU;
      spd = randfRange(30.0, 200.0) * scale;
      addParticle('fire', x, y, Math.cos(ang) * spd, Math.sin(ang) * spd,
        randfRange(0.4, 0.9), randfRange(14.0, 30.0) * scale,
        col(1.0, randfRange(0.35, 0.7), 0.1, 1.0));
    }

    for (i = 0; i < 8; i++) {
      ang = randf() * TAU;
      spd = randfRange(20.0, 90.0) * scale;
      addParticle('smoke', x, y, Math.cos(ang) * spd, Math.sin(ang) * spd,
        randfRange(0.9, 1.6), randfRange(10.0, 18.0) * scale,
        col(0.12, 0.12, 0.14, 1.0));
    }

    for (i = 0; i < 14; i++) {
      ang = randf() * TAU;
      spd = randfRange(150.0, 450.0) * scale;
      addParticle('spark', x, y, Math.cos(ang) * spd, Math.sin(ang) * spd,
        randfRange(0.3, 0.7), 2.0, col(1.0, 0.85, 0.5, 1.0));
    }
  }

  function updateParticles(delta) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;

      var k;
      if (p.kind === 'smoke') {
        p.size += 14.0 * delta;
        k = Math.max(0.0, 1.0 - 1.5 * delta);
        p.vx *= k; p.vy *= k;
      } else if (p.kind === 'ring') {
        p.size += 260.0 * delta;
      } else if (p.kind !== 'flash') {
        k = Math.max(0.0, 1.0 - 1.8 * delta);
        p.vx *= k; p.vy *= k;
      }
    }
  }

  // ==================================================
  // POMOCNICZE FUNKCJE RYSOWANIA
  // ==================================================

  function fillRect(x, y, w, h, c) {
    ctx.fillStyle = css(c);
    ctx.fillRect(x, y, w, h);
  }

  function strokeRect(x, y, w, h, c, width) {
    ctx.strokeStyle = css(c);
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
  }

  function fillCircle(x, y, r, c) {
    ctx.fillStyle = css(c);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function line(x1, y1, x2, y2, c, width) {
    ctx.strokeStyle = css(c);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function arc(x, y, r, a0, a1, c, width) {
    ctx.strokeStyle = css(c);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
  }

  function polygon(pts, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function linearGradient(x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], css(stops[i + 1]));
    return g;
  }

  // Tekst z cieniem; (x, y) to linia bazowa jak w draw_string.
  function txt(x, y, text, size, c, center, width) {
    ctx.font = '600 ' + size + 'px ' + FONT;
    ctx.textBaseline = 'alphabetic';
    var tx = x;
    if (center) {
      ctx.textAlign = 'center';
      tx = x + width / 2;
    } else {
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = css(col(0, 0, 0, 0.7 * c[3]));
    ctx.fillText(text, tx + 2, y + 2);
    ctx.fillStyle = css(c);
    ctx.fillText(text, tx, y);
  }

  // Poswiata w elipsie (gl / gl_rect z wersji Godot).
  function glEllipse(cx, cy, rx, ry, c) {
    if (c[3] <= 0.004 || rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.globalAlpha = clamp(c[3], 0, 1);
    ctx.fillStyle = glowGradient(c);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function gl(x, y, radius, c) {
    glEllipse(x, y, radius, radius, c);
  }

  function glRect(x, y, w, h, c) {
    glEllipse(x + w / 2, y + h / 2, w / 2, h / 2, c);
  }

  // Owal z pionowym gradientem (gora jasna, dol ciemny).
  function drawShadedOval(cx, cy, rx, ry, topCol, bottomCol) {
    ctx.fillStyle = linearGradient(0, cy - ry, 0, cy + ry, [0, topCol, 1, bottomCol]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  function drawDome(cx, cy, rx, ry) {
    ctx.fillStyle = linearGradient(0, cy, 0, cy - ry, [
      0, col(0.10, 0.40, 0.62, 0.85),
      1, col(0.78, 0.98, 1.0, 0.85)
    ]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, PI, TAU);
    ctx.closePath();
    ctx.fill();
  }

  function nowSeconds() { return performance.now() / 1000; }

  function playerVisible() {
    if (gameOver || victory) return false;
    return invulnerability <= 0 || Math.floor(performance.now() / 120) % 2 === 0;
  }

  // ==================================================
  // RYSOWANIE - GLOWNA WARSTWA
  // ==================================================

  function drawMain() {
    drawBackground();

    if (planetActive) drawPlanet();

    var i;
    for (i = 0; i < ufos.length; i++) drawUfo(ufos[i]);

    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.kind === 'smoke') {
        var a = p.life / p.max;
        fillCircle(p.x, p.y, p.size, col(0.12, 0.12, 0.14, 0.45 * a));
      }
    }

    for (i = 0; i < bullets.length; i++) drawPlayerBullet(bullets[i].x, bullets[i].y);
    for (i = 0; i < enemyBullets.length; i++) drawEnemyBullet(enemyBullets[i].x, enemyBullets[i].y);

    if (playerVisible()) drawPlayer();

    drawHud();
    drawWorldBanner();

    if (gameOver) drawGameOver();
    if (victory) drawVictory();
  }

  // ==================================================
  // TLO
  // ==================================================

  function drawBackground() {
    fillRect(-40, -40, W + 80, H + 80, col8(3, 4, 18));

    // mglawica w kolorze aktualnego swiata
    ctx.drawImage(getNebula(worldNumber - 1), -40, -40, W + 80, H + 80);

    // odlegla planeta swiata (przyciemniona)
    var bx = W * 0.80, by = H * 0.24;
    var br = planetRadii[worldNumber - 1] * 1.5;
    ctx.drawImage(getPlanetTexture(worldNumber - 1).dim, bx - br, by - br, br * 2.0, br * 2.0);

    // gwiazdy
    var t = nowSeconds();
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.75 + 0.25 * Math.sin(t * s.tw + s.ph);
      var c = s.color;
      fillCircle(s.x, s.y, s.size, col(c[0], c[1], c[2], tw));
    }
  }

  // ==================================================
  // PLANETA
  // ==================================================

  var RING_BANDS = [
    [1.30, 5.0, col(0.55, 0.48, 0.36, 0.55)],
    [1.42, 9.0, col(0.90, 0.82, 0.62, 0.85)],
    [1.56, 6.0, col(0.78, 0.70, 0.52, 0.80)],
    [1.64, 2.5, col(0.25, 0.22, 0.18, 0.60)],
    [1.74, 9.0, col(0.86, 0.78, 0.60, 0.75)]
  ];

  function drawRings(px, py, r, front) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.35);
    ctx.scale(1.0, 0.28);

    var a0 = front ? 0.0 : PI;
    var a1 = front ? PI : TAU;

    for (var i = 0; i < RING_BANDS.length; i++) {
      var b = RING_BANDS[i];
      arc(0, 0, r * b[0], a0, a1, b[2], b[1]);
    }

    ctx.restore();
  }

  function drawPlanet() {
    var px = planetPos.x, py = planetPos.y;
    var idx = worldNumber - 1;
    var r = planetRadii[idx];

    if (idx === 5) drawRings(px, py, r, false);

    ctx.drawImage(getPlanetTexture(idx).full, px - r, py - r, r * 2.0, r * 2.0);

    if (idx === 5) drawRings(px, py, r, true);

    txt(px - 100, py + r + 40, planetNames[idx], 22, WHITE, true, 200);
    txt(px - 110, py + r + 68, 'WLEĆ W PLANETĘ!', 16, col8(100, 230, 255), true, 220);
  }

  // ==================================================
  // STATEK GRACZA
  // ==================================================

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(playerTilt);

    // --- skrzydla (gora jasna, dol w cieniu) ---
    polygon([14, -7, -8, -30, -32, -34, -26, -8], linearGradient(14, 0, -32, 0, [
      0, col8(205, 212, 226), 0.48, col8(160, 170, 192), 0.87, col8(95, 105, 130), 1, col8(70, 80, 108)
    ]));
    polygon([14, 7, -8, 30, -32, 34, -26, 8], linearGradient(14, 0, -32, 0, [
      0, col8(130, 140, 160), 0.48, col8(100, 110, 135), 0.87, col8(60, 68, 90), 1, col8(45, 52, 75)
    ]));

    // krawedzie natarcia i paski
    line(14, -7, -8, -30, col(1, 1, 1, 0.35), 1.5);
    line(14, 7, -8, 30, col(1, 1, 1, 0.15), 1.5);
    line(-12, -26, -30, -32, col8(230, 70, 50), 2.0);
    line(-12, 26, -30, 32, col8(180, 50, 40), 2.0);
    line(-4, -12, -24, -26, col(0, 0, 0, 0.25), 1.0);
    line(-4, 12, -24, 26, col(0, 0, 0, 0.25), 1.0);

    // --- dysza silnika ---
    fillRect(-39, -8, 8, 16, col8(35, 38, 50));
    fillRect(-38, -6, 3, 12, col8(90, 95, 112));

    // --- kadlub ---
    polygon([50, 0, 30, -6, 0, -10, -26, -10, -32, -6, -32, 6, -26, 10, 0, 10, 30, 6],
      linearGradient(0, -10, 0, 10, [0, col8(222, 230, 242), 1, col8(55, 65, 90)]));

    line(44, -1.5, -24, -8.5, col(1, 1, 1, 0.55), 1.5);
    line(12, -9, 12, 9, col(0, 0, 0, 0.25), 1.0);
    line(-10, -9, -10, 9, col(0, 0, 0, 0.25), 1.0);
    line(30, 3, -26, 6, col8(230, 90, 40), 2.0);

    // --- kokpit (szklo) ---
    polygon([28, -1.5, 18, -7, 4, -8, -4, -4, 0, 0, 18, 0], linearGradient(0, -8, 0, 0, [
      0, col8(135, 228, 252), 0.45, col8(100, 205, 245), 1, col8(30, 95, 155)
    ]));
    line(22, -5, 8, -6.5, col(1, 1, 1, 0.85), 1.5);

    ctx.restore();
  }

  // ==================================================
  // UFO
  // ==================================================

  function ufoLight(i, phase) {
    var c = ufoPalette[i % 4];
    var k = 0.5 + 0.5 * Math.sin(phase * 2.0 + i * 0.9);
    return col(c[0], c[1], c[2], k);
  }

  function ufoLightPos(i) {
    var x = -30.0 + i * 10.0;
    var f = x / 36.0;
    return { x: x, y: 3.0 + 5.0 * Math.sqrt(Math.max(0.0, 1.0 - f * f)) };
  }

  var UFO_LIGHT_OFF = col(0.15, 0.15, 0.20);

  function drawUfo(u) {
    var px = u.x, py = u.y + Math.sin(u.phase) * 2.5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(u.tilt);

    // dolny kadlub
    drawShadedOval(0, 5, 22, 9, col8(110, 120, 140), col8(25, 30, 48));

    // glowny talerz (metal)
    drawShadedOval(0, 0, 38, 12, col8(230, 236, 248), col8(70, 80, 105));
    line(-37, 1.5, 37, 1.5, col(0.1, 0.12, 0.2, 0.6), 1.5);

    // gorny panel
    drawShadedOval(0, -3, 28, 7, col8(245, 248, 255), col8(150, 165, 190));

    // szwy plyt
    for (var s = -2; s <= 2; s++) {
      line(s * 10, -9, s * 13, -1, col(0, 0, 0, 0.18), 1.0);
    }

    // odblask na metalu
    drawShadedOval(-14, -4, 12, 2.5, col(1, 1, 1, 0.55), col(1, 1, 1, 0.0));

    // kopula
    drawDome(0, -6, 17, 17);

    // pilot w kopule
    drawShadedOval(0, -5, 4.5, 5.5, col(0.55, 0.90, 0.50), col(0.15, 0.45, 0.20));
    fillCircle(-2, -6, 1.3, BLACK);
    fillCircle(2, -6, 1.3, BLACK);
    drawShadedOval(-5, -12, 6, 3, col(1, 1, 1, 0.65), col(1, 1, 1, 0.0));

    // swiatla na obrzezu
    for (var i = 0; i < 7; i++) {
      var lc = ufoLight(i, u.phase);
      var base = colLerp(UFO_LIGHT_OFF, col(lc[0], lc[1], lc[2]), lc[3]);
      var lp = ufoLightPos(i);
      fillCircle(lp.x, lp.y, 2.3, base);
    }

    ctx.restore();

    // pasek zycia
    if (u.hp < 2) {
      fillRect(u.x - 20, u.y - 43, 40, 5, col8(65, 20, 30));
      fillRect(u.x - 20, u.y - 43, 20, 5, col8(255, 55, 55));
    }
  }

  // ==================================================
  // POCISKI
  // ==================================================

  function drawPlayerBullet(x, y) {
    line(x - 14, y, x + 10, y, col(0.55, 0.9, 1.0), 3.5);
    line(x - 10, y, x + 10, y, WHITE, 1.5);
  }

  function drawEnemyBullet(x, y) {
    fillCircle(x, y, 5.5, col(0.8, 0.12, 0.08));
    fillCircle(x, y, 3.0, col(1.0, 0.95, 0.8));
  }

  // ==================================================
  // WARSTWA POSWIATY (ADDYTYWNA)
  // ==================================================

  function drawGlow() {
    var i, p;

    // cieple swiatlo odleglego Slonca
    gl(-40, -40, 520.0, col(1.0, 0.75, 0.4, 0.16));

    // poswiata jasnych gwiazd
    var t = nowSeconds();
    for (i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.size > 1.9) {
        var tw = 0.75 + 0.25 * Math.sin(t * s.tw + s.ph);
        gl(s.x, s.y, s.size * 5.0, col(s.color[0], s.color[1], s.color[2], 0.35 * tw));
      }
    }

    // poswiata atmosfery planety
    if (planetActive) {
      var idx = worldNumber - 1;
      var pc = planetColors[idx];
      gl(planetPos.x, planetPos.y, planetRadii[idx] * 1.8, col(pc[0], pc[1], pc[2], 0.30));
    }

    // UFO: swiatlo spod talerza, lampki, uszkodzenia
    for (i = 0; i < ufos.length; i++) {
      var u = ufos[i];
      var ux = u.x, uy = u.y + Math.sin(u.phase) * 2.5;
      glRect(ux - 26, uy + 8, 52, 46, col(0.4, 0.9, 1.0, 0.12));
      gl(ux, uy - 6, 20.0, col(0.4, 0.9, 1.0, 0.18));

      for (var l = 0; l < 7; l++) {
        var lc = ufoLight(l, u.phase);
        var lp = ufoLightPos(l);
        gl(ux + lp.x, uy + lp.y, 10.0, col(lc[0], lc[1], lc[2], lc[3] * 0.8));
      }

      if (u.hp < 2 && randf() < 0.5) {
        gl(ux + randfRange(-20, 20), uy + randfRange(-6, 8), 9.0, col(1.0, 0.6, 0.2, 0.7));
      }
    }

    // pociski gracza
    for (i = 0; i < bullets.length; i++) {
      glRect(bullets[i].x - 34, bullets[i].y - 10, 60, 20, col(0.3, 0.8, 1.0, 0.9));
    }

    // pociski UFO
    for (i = 0; i < enemyBullets.length; i++) {
      gl(enemyBullets[i].x, enemyBullets[i].y, 16.0, col(1.0, 0.2, 0.1, 0.9));
    }

    // statek: plomien silnika, swiatla, oslona
    if (playerVisible()) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(playerTilt);

      var f = 0.8 + randf() * 0.4;
      glRect(-39.0 - 100.0 * f, -20.0, 110.0 * f, 40.0, col(1.0, 0.5, 0.2, 0.35));
      glRect(-39.0 - 70.0 * f, -14.0, 70.0 * f + 20.0, 28.0, col(0.35, 0.65, 1.0, 0.9));
      glRect(-39.0 - 30.0 * f, -6.0, 40.0 * f, 12.0, col(0.8, 0.95, 1.0, 1.0));
      gl(-36, 0, 18.0, col(0.6, 0.85, 1.0, 0.8));

      // swiatla nawigacyjne
      var blink = 0.5 + 0.5 * Math.sin(t * 6.0);
      gl(-32, -34, 9.0, col(1.0, 0.1, 0.1, 0.4 + 0.6 * blink));
      gl(-32, 34, 9.0, col(0.1, 1.0, 0.2, 0.4 + 0.6 * (1.0 - blink)));

      // odblask kokpitu
      gl(12, -3, 12.0, col(0.3, 0.8, 1.0, 0.25));

      // oslona po trafieniu
      if (invulnerability > 0) {
        gl(0, 0, 60.0, col(0.3, 0.7, 1.0, 0.30));
        arc(0, 0, 48.0, 0.0, TAU, col(0.5, 0.85, 1.0, 0.6), 2.0);
      }

      ctx.restore();
    }

    // czasteczki: ogien, iskry, blyski, fale uderzeniowe
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      var a = clamp(p.life / p.max, 0.0, 1.0);
      var c = p.color;

      switch (p.kind) {
        case 'fire':
          gl(p.x, p.y, p.size * (0.5 + 0.5 * a), col(c[0], c[1] * a, c[2], 0.9 * a));
          break;
        case 'flash':
          gl(p.x, p.y, p.size * (1.0 + (1.0 - a) * 0.6), col(c[0], c[1], c[2], a));
          break;
        case 'spark':
          line(p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, col(c[0], c[1], c[2], a), 2.0);
          break;
        case 'ring':
          arc(p.x, p.y, p.size, 0.0, TAU, col(c[0], c[1], c[2], a * 0.7), 3.0);
          break;
      }
    }
  }

  // ==================================================
  // HUD
  // ==================================================

  function drawMiniShip(x, y) {
    polygon([x + 10, y, x - 6, y - 6, x - 3, y, x - 6, y + 6], linearGradient(x + 10, y - 6, x - 6, y + 6, [
      0, col8(230, 240, 255), 0.5, col8(140, 160, 195), 1, col8(60, 75, 110)
    ]));
  }

  function drawHud() {
    // panel
    fillRect(10, 8, 330, 190, col(0.0, 0.04, 0.10, 0.45));
    strokeRect(10, 8, 330, 190, col(0.3, 0.7, 1.0, 0.4), 1.5);

    txt(20, 35, 'STAR-SHIP-WARS', 24, col8(100, 220, 255));
    txt(20, 70, 'PUNKTY: ' + score, 22, WHITE);

    txt(20, 102, 'ŻYCIA: ' + lives + ' / ' + LIVES_PER_WORLD, 22, col8(100, 255, 120));

    for (var i = 0; i < lives; i++) drawMiniShip(215 + i * 30, 95);

    txt(20, 135, 'ŚWIAT: ' + worldNumber + ' / 8  ' + planetNames[worldNumber - 1], 22, col8(255, 220, 100));

    if (!planetActive) {
      txt(20, 168, 'UFO: ' + ufosDefeated + ' / ' + ufoLimit, 20, col8(180, 220, 255));
    }
  }

  function drawWorldBanner() {
    if (bannerTimer <= 0 || gameOver || victory) return;
    if (!started || !focused) return; // pod nakladka startu/pauzy baner tylko by przeszkadzal

    var a = clamp(bannerTimer, 0.0, 1.0);
    var cy = H / 2.0;

    txt(0, cy - 40, 'ŚWIAT ' + worldNumber + ': ' + planetNames[worldNumber - 1], 44, col(1.0, 0.86, 0.4, a), true, W);
    txt(0, cy + 10, 'MASZ ' + LIVES_PER_WORLD + ' ŻYCIA W TYM ŚWIECIE!', 24, col(0.4, 1.0, 0.5, a), true, W);

    if (worldNumber === 8) {
      txt(0, cy + 50, 'OSTATNI ŚWIAT – FINAŁ NA NEPTUNIE!', 20, col(1.0, 0.5, 0.5, a), true, W);
    }
  }

  // ==================================================
  // GAME OVER / ZWYCIESTWO
  // ==================================================

  function restartHint() {
    return usingTouch ? 'DOTKNIJ – ZAGRAJ PONOWNIE' : 'ENTER – ZAGRAJ PONOWNIE';
  }

  function drawGameOver() {
    fillRect(0, 0, W, H, col8(0, 0, 0, 170));

    txt(0, H / 2 - 35, 'GAME OVER', 46, col8(255, 70, 70), true, W);
    txt(0, H / 2 + 10, 'ŚWIAT: ' + planetNames[worldNumber - 1] + '   WYNIK: ' + score, 25, WHITE, true, W);
    txt(0, H / 2 + 55, restartHint(), 20, col8(100, 220, 255), true, W);
  }

  function drawVictory() {
    fillRect(0, 0, W, H, col8(0, 0, 0, 170));

    txt(0, H / 2 - 45, 'WYGRANA!', 52, col8(100, 255, 150), true, W);
    txt(0, H / 2 + 5, 'POKONAŁEŚ 8 ŚWIATÓW!', 24, WHITE, true, W);
    txt(0, H / 2 + 45, 'WYNIK: ' + score, 23, col8(255, 220, 100), true, W);
    txt(0, H / 2 + 85, restartHint(), 20, col8(100, 220, 255), true, W);
  }

  // Ekran startowy i pauza (tylko w wersji na stronie).
  function drawStartOverlay() {
    fillRect(0, 0, W, H, col8(0, 0, 0, 150));

    if (!started) {
      txt(0, H / 2 - 40, 'STAR-SHIP-WARS', 52, col8(100, 220, 255), true, W);
      txt(0, H / 2 + 10, 'KLIKNIJ, ABY ZAGRAĆ', 26, WHITE, true, W);
      txt(0, H / 2 + 55, 'W / S lub ↑ / ↓ – lot     SPACJA lub X – strzał', 18, col8(180, 220, 255), true, W);
      txt(0, H / 2 + 85, 'Na telefonie: przytrzymaj palec i przesuwaj', 18, col8(180, 220, 255), true, W);
    } else {
      txt(0, H / 2 - 10, 'PAUZA', 46, col8(255, 220, 100), true, W);
      txt(0, H / 2 + 35, 'KLIKNIJ, ABY GRAĆ DALEJ', 22, WHITE, true, W);
    }
  }

  // ==================================================
  // RESTART
  // ==================================================

  function restartGame() {
    bullets = [];
    enemyBullets = [];
    ufos = [];
    particles = [];

    lives = LIVES_PER_WORLD;
    score = 0;

    gameOver = false;
    victory = false;

    worldNumber = 1;
    ufoLimit = 20;
    ufosSpawned = 0;
    ufosDefeated = 0;

    planetActive = false;
    planetPos = { x: 0, y: 0 };

    player = { x: 150, y: H / 2.0 };
    playerTilt = 0.0;

    shootTimer = 0.0;
    spawnTimer = 0.0;
    invulnerability = 0.0;
    elapsedTime = 0.0;
    bannerTimer = 3.0;
    shake = 0.0;
  }

  // ==================================================
  // ROZMIAR CANVASA I PETLA ANIMACJI
  // ==================================================

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      glowGradients = {}; // gradienty sa zwiazane z kontekstem - na wszelki wypadek od nowa
    }
    S = canvas.width / W;
  }

  function render() {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.lineCap = 'butt';

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawMain();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow();
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    if (!started || !focused) drawStartOverlay();
  }

  var last = performance.now();
  function frame(now) {
    var delta = (now - last) / 1000;
    last = now;
    if (delta > 0.05) delta = 0.05;
    if (delta < 0) delta = 0;

    process(delta);
    render();
    acceptPressed = false;
    window.requestAnimationFrame(frame);
  }

  // przycisk pelnego ekranu
  var fsButton = document.getElementById('gra-pelny-ekran');
  var screenBox = document.getElementById('gra-ekran');
  if (fsButton && screenBox && screenBox.requestFullscreen) {
    fsButton.hidden = false;
    fsButton.addEventListener('click', function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        screenBox.requestFullscreen().then(function () { canvas.focus(); }).catch(function () { /* nic */ });
      }
    });
  }

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('blur', function () { keys = {}; touchActive = false; });

  init();
  resize();
  window.requestAnimationFrame(frame);
})();
