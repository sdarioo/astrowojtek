// Mapa Układu Słonecznego z góry z prawdziwym, aktualnym położeniem planet.
// Położenia liczy biblioteka Astronomy Engine (assets/js/lib/astronomy.browser.min.js).
// Dane o planetach pochodzą z pliku _data/planety.yml.
(function () {
  var svg = document.getElementById("us-svg");
  var panel = document.getElementById("us-panel");
  var daneEl = document.getElementById("us-dane");
  if (!svg || !panel || !daneEl || !window.Astronomy) return;

  var A = window.Astronomy;
  var NS = "http://www.w3.org/2000/svg";
  var KM_NA_JA = 149597870.7; // kilometry w 1 jednostce astronomicznej
  var OBRAZY = document.currentScript ? document.currentScript.getAttribute("data-obrazy") : "/assets/images/uklad-sloneczny/";
  var OBROT = A.Rotation_EQJ_ECL(); // z układu równikowego do płaszczyzny ekliptyki
  var KSIEZYC_ODSTEP = 24;          // umowna odległość Księżyca od Ziemi na mapie

  var ciala = JSON.parse(daneEl.textContent);
  var wgId = {};
  ciala.forEach(function (c) { wgId[c.id] = c; });
  var planety = ciala.filter(function (c) { return c.okres_dni; });

  var wybrane = null; // id klikniętego ciała
  var teraz = new Date();
  var elementy = {};  // id -> {grupa, orbita}

  // --- Skala: prawdziwa odległość (j.a.) -> promień na mapie ---
  // Skala logarytmiczna: planety wewnętrzne są rozsunięte, Pluton mieści się w ramce.
  function promien(r) {
    return 167 + 77.8 * Math.log(r);
  }

  // Położenie ciała w płaszczyźnie ekliptyki (j.a.), widok z północy.
  function wektorEkl(id, czas) {
    return A.RotateVector(OBROT, A.HelioVector(A.Body[id], czas));
  }

  function naMape(v) {
    var kat = Math.atan2(v.y, v.x);
    var R = promien(Math.sqrt(v.x * v.x + v.y * v.y));
    // oś y w SVG jest skierowana w dół, więc odwracamy znak
    return { x: R * Math.cos(kat), y: -R * Math.sin(kat) };
  }

  function el(nazwa, atrybuty, rodzic) {
    var e = document.createElementNS(NS, nazwa);
    for (var k in atrybuty) e.setAttribute(k, atrybuty[k]);
    if (rodzic) rodzic.appendChild(e);
    return e;
  }

  // --- Tło: gwiazdy (zawsze te same, dzięki prostemu generatorowi liczb) ---
  function rysujGwiazdy() {
    var ziarno = 7;
    function los() { ziarno = (ziarno * 16807) % 2147483647; return ziarno / 2147483647; }
    var g = el("g", { "class": "us-gwiazdy" }, svg);
    for (var i = 0; i < 180; i++) {
      el("circle", {
        cx: (los() * 1000 - 500).toFixed(1),
        cy: (los() * 1000 - 500).toFixed(1),
        r: (0.4 + los() * 1.1).toFixed(2),
        opacity: (0.25 + los() * 0.6).toFixed(2)
      }, g);
    }
  }

  // --- Orbity: położenie planety w 360 punktach w ciągu jednego obiegu ---
  function rysujOrbity() {
    var g = el("g", { "class": "us-orbity" }, svg);
    var start = A.MakeTime(teraz);
    planety.forEach(function (p) {
      var kroki = 360, punkty = [];
      for (var i = 0; i < kroki; i++) {
        var czas = start.AddDays(p.okres_dni * (i / kroki - 0.5));
        var m = naMape(wektorEkl(p.id, czas));
        punkty.push(m.x.toFixed(1) + "," + m.y.toFixed(1));
      }
      var orbita = el("polygon", { points: punkty.join(" "), "class": "us-orbita" }, g);
      elementy[p.id] = { orbita: orbita };
    });
  }

  // --- Kierunek odniesienia: punkt Barana (długość ekliptyczna 0°) ---
  function rysujKierunek() {
    var g = el("g", { "class": "us-kierunek" }, svg);
    // krótka strzałka przy prawej krawędzi, poza orbitami, żeby nie zasłaniała planet
    el("line", { x1: 474, y1: 0, x2: 494, y2: 0 }, g);
    el("path", { d: "M497 0 l-9 -4.5 v9 z" }, g);
    var t = el("text", { x: 486, y: -9, "text-anchor": "middle" }, g);
    t.textContent = "♈︎"; // ♈ jako zwykły znak, nie emoji
    el("title", {}, g).textContent = "Kierunek do punktu Barana";
  }

  // --- Słońce, planety i Księżyc ---
  function rysujCialo(c, rodzic) {
    var s = c.rozmiar;
    var grupa = el("g", {
      "class": "us-cialo",
      role: "button",
      tabindex: "0",
      "aria-label": c.nazwa
    }, rodzic);
    // większe, niewidoczne pole ułatwia trafienie palcem w małą planetę
    el("circle", { r: c.id === "Moon" ? 8 : Math.max(s / 2 + 6, 15), "class": "us-pole" }, grupa);
    el("circle", { r: s / 2 + 5, "class": "us-zaznaczenie" }, grupa);
    var wys = c.id === "Saturn" ? s * 125 / 320 : s; // Saturn jest szeroki (pierścienie)
    el("image", {
      href: OBRAZY + c.obraz,
      x: -s / 2, y: -wys / 2, width: s, height: wys
    }, grupa);
    if (c.id !== "Moon") {
      var napis = el("text", { y: wys / 2 + 15, "text-anchor": "middle", "class": "us-napis" }, grupa);
      napis.textContent = c.nazwa;
    }
    grupa.addEventListener("click", function () { wybierz(c.id); });
    grupa.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wybierz(c.id); }
    });
    elementy[c.id] = elementy[c.id] || {};
    elementy[c.id].grupa = grupa;
    return grupa;
  }

  function rysujCiala() {
    var defs = el("defs", {}, svg);
    var grad = el("radialGradient", { id: "us-blask" }, defs);
    el("stop", { offset: "0.35", "stop-color": "#ffb340", "stop-opacity": "0.55" }, grad);
    el("stop", { offset: "1", "stop-color": "#ff7a1a", "stop-opacity": "0" }, grad);
    el("circle", { r: 70, fill: "url(#us-blask)", "class": "us-blask" }, svg);

    var g = el("g", { "class": "us-ciala" }, svg);
    rysujCialo(wgId.Sun, g);
    // od najdalszej, żeby napisy bliższych planet były na wierzchu
    planety.slice().reverse().forEach(function (p) { rysujCialo(p, g); });
    rysujCialo(wgId.Moon, g);
  }

  function przesun(id, x, y) {
    elementy[id].grupa.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
  }

  // --- Aktualizacja położeń (co minutę) ---
  function aktualizuj() {
    teraz = new Date();
    var ziemia = null;
    planety.forEach(function (p) {
      var m = naMape(wektorEkl(p.id, teraz));
      przesun(p.id, m.x, m.y);
      if (p.id === "Earth") ziemia = m;
    });
    // Księżyc: prawdziwy kierunek od Ziemi, ale umowna odległość
    var k = A.RotateVector(OBROT, A.GeoMoon(teraz));
    var kat = Math.atan2(k.y, k.x);
    przesun("Moon", ziemia.x + KSIEZYC_ODSTEP * Math.cos(kat), ziemia.y - KSIEZYC_ODSTEP * Math.sin(kat));

    document.getElementById("us-czas").textContent = "Położenie planet: " +
      teraz.toLocaleString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    if (wybrane) pokazPanel(wybrane);
  }

  // --- Okienko z informacjami ---
  function liczba(x, miejsca) {
    return x.toLocaleString("pl-PL", { minimumFractionDigits: miejsca, maximumFractionDigits: miejsca });
  }
  function km(odlKm) {
    if (odlKm < 10000000) return liczba(Math.round(odlKm), 0) + " km";
    return liczba(odlKm / 1e6, 1) + " mln km";
  }
  function dlugosc(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (z) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]; });
  }

  // Dane liczone na żywo: [opis, wartość]
  function daneNaZywo(id) {
    var w = [];
    if (id === "Sun") {
      w.push(["Teraz od Ziemi", km(dlugosc(A.GeoVector(A.Body.Sun, teraz, true)) * KM_NA_JA)]);
    } else if (id === "Moon") {
      w.push(["Teraz od Ziemi", km(dlugosc(A.GeoMoon(teraz)) * KM_NA_JA)]);
    } else {
      var v = wektorEkl(id, teraz);
      var r = dlugosc(v);
      w.push(["Teraz od Słońca", km(r * KM_NA_JA) + " (" + liczba(r, 2) + " j.a.)"]);
      if (id !== "Earth") {
        w.push(["Teraz od Ziemi", km(dlugosc(A.GeoVector(A.Body[id], teraz, true)) * KM_NA_JA)]);
      }
      var stopnie = (Math.atan2(v.y, v.x) * 180 / Math.PI + 360) % 360;
      w.push(["Kierunek od Słońca", liczba(stopnie, 1) + "° od punktu Barana"]);
    }
    return w;
  }

  function pokazPanel(id) {
    var c = wgId[id];
    var html = '<div class="us-panel-naglowek">' +
      '<img src="' + esc(OBRAZY + c.obraz) + '" alt="">' +
      "<div><h2>" + esc(c.nazwa) + "</h2><p>" + esc(c.rodzaj) + "</p></div></div><dl>";
    var stale = c.dane || [];
    // wiersze „na żywo” wstawiamy zaraz po pierwszym wierszu (średniej odległości)
    var wiersze = stale.slice(0, 1)
      .concat(daneNaZywo(id).map(function (w) { return [w[0], w[1], true]; }))
      .concat(stale.slice(1));
    wiersze.forEach(function (w) {
      html += "<div" + (w[2] ? ' class="us-zywo"' : "") + "><dt>" + esc(w[0]) + "</dt><dd>" + esc(w[1]) + "</dd></div>";
    });
    html += "</dl>";
    if (c.ciekawostka) html += '<p class="us-ciekawostka"><strong>Ciekawostka:</strong> ' + esc(c.ciekawostka) + "</p>";
    panel.innerHTML = html;
  }

  function wybierz(id) {
    if (wybrane && elementy[wybrane]) {
      elementy[wybrane].grupa.classList.remove("wybrane");
      if (elementy[wybrane].orbita) elementy[wybrane].orbita.classList.remove("wybrane");
    }
    wybrane = id;
    elementy[id].grupa.classList.add("wybrane");
    if (elementy[id].orbita) elementy[id].orbita.classList.add("wybrane");
    pokazPanel(id);
    // na telefonie okienko jest pod mapą – przewiń, żeby było widać
    var r = panel.getBoundingClientRect();
    if (r.top > window.innerHeight - 80) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  rysujGwiazdy();
  rysujOrbity();
  rysujKierunek();
  rysujCiala();
  aktualizuj();
  setInterval(aktualizuj, 60000);
})();
