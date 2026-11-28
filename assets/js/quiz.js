/* ============================================================
   Quiz wiedzy o kosmosie (/quiz/)
   Pytania są w pliku _data/quiz.yml (pierwsza odpowiedź = poprawna).
   ============================================================ */
(function () {
  "use strict";

  // Ile pytań w jednym teście
  var LICZBA_PYTAN = 15;

  // Nagrody – od najlepszej. "od" = najmniejsza liczba poprawnych odpowiedzi.
  // puchar: "zloty", "srebrny", "brazowy" albo null (bez pucharu).
  var NAGRODY = [
    { od: 13, puchar: "zloty",   tytul: "Mistrz Kosmosu",
      opis: "Wow! Znasz kosmos jak własną kieszeń. Gratulacje!" },
    { od: 10, puchar: "srebrny", tytul: "Odkrywca Kosmosu",
      opis: "Świetny wynik! Jeszcze kilka odkryć i zdobędziesz złoto." },
    { od: 7,  puchar: "brazowy", tytul: "Obserwator Gwiazd",
      opis: "Dobra robota! Poczytaj artykuły na blogu i spróbuj znowu." },
    { od: 0,  puchar: null,      tytul: "Kosmiczny Kadet",
      opis: "Każdy astronom kiedyś zaczynał! Zagraj jeszcze raz – pytania będą inne." }
  ];

  var NAZWY_PUCHAROW = { zloty: "Złoty puchar", srebrny: "Srebrny puchar", brazowy: "Brązowy puchar" };
  var LITERY = ["A", "B", "C"];
  var KLUCZ_OSTATNIE = "astrowojtek-quiz-ostatnie";

  var skrypt = document.currentScript;
  var baseurl = (skrypt && skrypt.getAttribute("data-baseurl")) || "";
  var kontener = document.getElementById("quiz");
  var baza;
  try {
    baza = JSON.parse(document.getElementById("quiz-dane").textContent) || [];
  } catch (e) {
    baza = [];
  }
  baza = baza.filter(function (p) { return p && p.pytanie && p.odpowiedzi && p.odpowiedzi.length >= 2; });
  if (!kontener || !baza.length) return;

  var stan = null;

  // ---------- pomocnicze ----------

  function el(tag, klasa, tekst) {
    var e = document.createElement(tag);
    if (klasa) e.className = klasa;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  function przetasuj(tablica) {
    var t = tablica.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = t[i]; t[i] = t[j]; t[j] = x;
    }
    return t;
  }

  function czytajOstatnie() {
    try { return JSON.parse(localStorage.getItem(KLUCZ_OSTATNIE)) || []; } catch (e) { return []; }
  }
  function zapiszOstatnie(lista) {
    try { localStorage.setItem(KLUCZ_OSTATNIE, JSON.stringify(lista)); } catch (e) { /* bez zapamiętywania */ }
  }

  function adres(link) {
    if (!link) return null;
    if (/^https?:\/\//.test(link)) return link;
    return baseurl + link;
  }

  function pokaz(widok) {
    kontener.innerHTML = "";
    kontener.appendChild(widok);
    var fokus = widok.querySelector("[data-fokus]");
    if (fokus) fokus.focus({ preventScroll: true });
  }

  // Pytania z poprzedniej gry trafiają na koniec kolejki, żeby kolejna gra była inna.
  function losujPytania() {
    var ostatnie = czytajOstatnie();
    var nowe = [], stare = [];
    baza.forEach(function (p, i) {
      (ostatnie.indexOf(p.pytanie) === -1 ? nowe : stare).push(i);
    });
    var wybrane = przetasuj(nowe).concat(przetasuj(stare)).slice(0, Math.min(LICZBA_PYTAN, baza.length));
    zapiszOstatnie(wybrane.map(function (i) { return baza[i].pytanie; }));

    return wybrane.map(function (i) {
      var p = baza[i];
      var odp = p.odpowiedzi.slice(0, 3).map(function (tekst, nr) {
        return { tekst: String(tekst), poprawna: nr === 0 };
      });
      return { pytanie: p.pytanie, odpowiedzi: przetasuj(odp), wyjasnienie: p.wyjasnienie, link: p.link };
    });
  }

  // ---------- puchar (SVG) ----------

  function rysujPuchar(rodzaj) {
    var ns = "http://www.w3.org/2000/svg";
    var id = "quiz-grad-" + rodzaj;
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 120 140");
    svg.setAttribute("class", "quiz-puchar quiz-puchar--" + rodzaj);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", NAZWY_PUCHAROW[rodzaj]);
    svg.innerHTML =
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" class="s1"/><stop offset="0.45" class="s2"/><stop offset="1" class="s3"/>' +
      '</linearGradient></defs>' +
      '<g class="quiz-puchar-korpus" fill="url(#' + id + ')">' +
        // uchwyty
        '<path d="M28 22 H12 C10 50 22 62 36 64 L38 56 C27 53 20 44 20 30 H28 Z"/>' +
        '<path d="M92 22 H108 C110 50 98 62 84 64 L82 56 C93 53 100 44 100 30 H92 Z"/>' +
        // czasza
        '<path d="M26 14 H94 V30 C94 58 80 76 60 78 C40 76 26 58 26 30 Z"/>' +
        // nóżka i podstawa
        '<path d="M52 78 H68 L66 98 H54 Z"/>' +
        '<path d="M40 98 H80 L84 112 H36 Z"/>' +
        '<rect x="30" y="112" width="60" height="14" rx="3"/>' +
      '</g>' +
      // gwiazda na czaszy
      '<path class="quiz-puchar-gwiazda" d="M60 28 L64.7 38.5 L76 39.6 L67.5 47.1 L70 58.3 L60 52.4 L50 58.3 L52.5 47.1 L44 39.6 L55.3 38.5 Z"/>' +
      // błysk
      '<path class="quiz-puchar-blysk" d="M33 22 C33 40 37 54 46 66" fill="none" stroke-width="4" stroke-linecap="round"/>';
    return svg;
  }

  function rysujGwiazdke() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 120 140");
    svg.setAttribute("class", "quiz-puchar quiz-puchar--brak");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path d="M60 18 L73 50 L107 52 L81 74 L89 108 L60 90 L31 108 L39 74 L13 52 L47 50 Z" ' +
      'class="quiz-gwiazdka"/>';
    return svg;
  }

  // ---------- widoki ----------

  function ekranStartowy() {
    var w = el("section", "quiz-karta quiz-start");
    w.appendChild(el("p", "quiz-wstep",
      "Sprawdź, ile wiesz o planetach, gwiazdach i kosmosie! Pytania dotyczą artykułów z bloga i ciekawostek ze strony Układ Słoneczny."));
    var lista = el("ul", "quiz-zasady");
    [
      LICZBA_PYTAN + " losowych pytań",
      "w każdym pytaniu 3 odpowiedzi – tylko jedna jest dobra",
      "na koniec dostaniesz puchar: złoty, srebrny albo brązowy"
    ].forEach(function (t) { lista.appendChild(el("li", null, t)); });
    w.appendChild(lista);

    var nagrody = el("div", "quiz-nagrody");
    NAGRODY.forEach(function (n, i) {
      if (!n.puchar) return;
      var gorna = i === 0 ? LICZBA_PYTAN : NAGRODY[i - 1].od - 1;
      var d = el("div", "quiz-nagroda");
      d.appendChild(rysujPuchar(n.puchar));
      d.appendChild(el("strong", null, n.tytul));
      d.appendChild(el("span", null, n.od + "–" + gorna + " pkt"));
      nagrody.appendChild(d);
    });
    w.appendChild(nagrody);

    var start = el("button", "quiz-przycisk", "Zaczynamy! 🚀");
    start.type = "button";
    start.addEventListener("click", nowaGra);
    w.appendChild(start);
    pokaz(w);
  }

  function nowaGra() {
    stan = { pytania: losujPytania(), nr: 0, punkty: 0, bledy: [] };
    ekranPytania();
  }

  function ekranPytania() {
    var p = stan.pytania[stan.nr];
    var ile = stan.pytania.length;
    var w = el("section", "quiz-karta quiz-pytanie");

    var gora = el("div", "quiz-gora");
    gora.appendChild(el("span", "quiz-licznik", "Pytanie " + (stan.nr + 1) + " z " + ile));
    gora.appendChild(el("span", "quiz-punkty", "Poprawne: " + stan.punkty));
    w.appendChild(gora);

    var pasek = el("div", "quiz-pasek");
    pasek.setAttribute("role", "progressbar");
    pasek.setAttribute("aria-valuemin", "0");
    pasek.setAttribute("aria-valuemax", String(ile));
    pasek.setAttribute("aria-valuenow", String(stan.nr));
    var wypelnienie = el("div", "quiz-pasek-wypelnienie");
    wypelnienie.style.width = (stan.nr / ile * 100) + "%";
    pasek.appendChild(wypelnienie);
    w.appendChild(pasek);

    var h = el("h2", "quiz-tresc", p.pytanie);
    h.tabIndex = -1;
    h.setAttribute("data-fokus", "");
    w.appendChild(h);

    var odpowiedzi = el("div", "quiz-odpowiedzi");
    var przyciski = p.odpowiedzi.map(function (o, i) {
      var b = el("button", "quiz-odpowiedz");
      b.type = "button";
      b.appendChild(el("span", "quiz-litera", LITERY[i]));
      b.appendChild(el("span", null, o.tekst));
      b.addEventListener("click", function () { odpowiedz(i); });
      odpowiedzi.appendChild(b);
      return b;
    });
    w.appendChild(odpowiedzi);

    var wynik = el("div", "quiz-informacja");
    wynik.setAttribute("aria-live", "polite");
    w.appendChild(wynik);

    var odpowiedziano = false;

    function odpowiedz(i) {
      if (odpowiedziano) return;
      odpowiedziano = true;
      var dobra = p.odpowiedzi[i].poprawna;
      var poprawna = p.odpowiedzi.filter(function (o) { return o.poprawna; })[0];
      if (dobra) stan.punkty++;
      else stan.bledy.push({ pytanie: p.pytanie, wybrana: p.odpowiedzi[i].tekst, poprawna: poprawna.tekst, link: p.link });

      przyciski.forEach(function (b, k) {
        b.disabled = true;
        if (p.odpowiedzi[k].poprawna) b.classList.add("quiz-odpowiedz--dobra");
        else if (k === i) b.classList.add("quiz-odpowiedz--zla");
      });
      gora.lastChild.textContent = "Poprawne: " + stan.punkty;
      wypelnienie.style.width = ((stan.nr + 1) / ile * 100) + "%";
      pasek.setAttribute("aria-valuenow", String(stan.nr + 1));

      wynik.className = "quiz-informacja " + (dobra ? "quiz-informacja--dobra" : "quiz-informacja--zla");
      wynik.appendChild(el("strong", null, dobra ? "Brawo, dobra odpowiedź! ✅" : "Niestety, to nie to. ❌ Poprawna odpowiedź: " + poprawna.tekst + "."));
      if (p.wyjasnienie) wynik.appendChild(el("p", null, p.wyjasnienie));

      var ostatnie = stan.nr + 1 >= ile;
      var dalej = el("button", "quiz-przycisk", ostatnie ? "Zobacz wynik 🏆" : "Dalej →");
      dalej.type = "button";
      dalej.addEventListener("click", function () {
        stan.nr++;
        if (ostatnie) ekranWyniku(); else ekranPytania();
      });
      wynik.appendChild(dalej);
      dalej.focus({ preventScroll: true });
      if (dalej.scrollIntoView) {
        var r = dalej.getBoundingClientRect();
        if (r.bottom > window.innerHeight) dalej.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    w.addEventListener("keydown", function (e) {
      var nr = { "1": 0, "2": 1, "3": 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()];
      if (nr != null && przyciski[nr] && !odpowiedziano) { e.preventDefault(); odpowiedz(nr); }
    });

    pokaz(w);
    kontener.scrollIntoView({ block: "nearest" });
  }

  function ekranWyniku() {
    var ile = stan.pytania.length;
    var pkt = stan.punkty;
    // przelicz progi, gdyby w bazie było mniej pytań niż LICZBA_PYTAN
    var skala = ile / LICZBA_PYTAN;
    var nagroda = NAGRODY.filter(function (n) { return pkt >= Math.round(n.od * skala); })[0] || NAGRODY[NAGRODY.length - 1];

    var w = el("section", "quiz-karta quiz-wynik");
    var naglowek = el("h2", "quiz-wynik-liczba", "Twój wynik: " + pkt + " / " + ile);
    naglowek.tabIndex = -1;
    naglowek.setAttribute("data-fokus", "");
    w.appendChild(naglowek);

    var nagr = el("div", "quiz-wynik-nagroda" + (nagroda.puchar ? " quiz-wynik-nagroda--" + nagroda.puchar : ""));
    nagr.appendChild(nagroda.puchar ? rysujPuchar(nagroda.puchar) : rysujGwiazdke());
    var opis = el("div", "quiz-wynik-opis");
    if (nagroda.puchar) opis.appendChild(el("span", "quiz-wynik-puchar", NAZWY_PUCHAROW[nagroda.puchar]));
    opis.appendChild(el("strong", "quiz-wynik-tytul", nagroda.tytul));
    opis.appendChild(el("p", null, nagroda.opis));
    nagr.appendChild(opis);
    w.appendChild(nagr);

    var znow = el("button", "quiz-przycisk", "Zagraj jeszcze raz");
    znow.type = "button";
    znow.addEventListener("click", nowaGra);
    w.appendChild(znow);

    if (stan.bledy.length) {
      var bl = el("div", "quiz-bledy");
      bl.appendChild(el("h3", null, "Gdzie był błąd?"));
      var lista = el("ol");
      stan.bledy.forEach(function (b) {
        var li = el("li");
        li.appendChild(el("span", "quiz-blad-pytanie", b.pytanie));
        var odp = el("span", "quiz-blad-odp");
        odp.appendChild(el("s", null, b.wybrana));
        odp.appendChild(document.createTextNode(" → "));
        odp.appendChild(el("strong", null, b.poprawna));
        li.appendChild(odp);
        var href = adres(b.link);
        if (href) {
          var a = el("a", "quiz-blad-link", "Poczytaj o tym");
          a.href = href;
          li.appendChild(a);
        }
        lista.appendChild(li);
      });
      bl.appendChild(lista);
      w.appendChild(bl);
    } else {
      w.appendChild(el("p", "quiz-bezbledu", "Wszystkie odpowiedzi poprawne – bez ani jednego błędu! 🌟"));
    }

    pokaz(w);
    kontener.scrollIntoView({ block: "nearest" });
  }

  ekranStartowy();
})();
