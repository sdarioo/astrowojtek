// Komentarze i polubienia AstroWojtka.
// Rozmawia z własnym serwisem (adres w _config.yml: comments.api_url).
// Kontrakt API: SERWIS-KOMENTARZY-WYMAGANIA.md.
// Cała treść od użytkowników trafia na stronę przez textContent (nigdy innerHTML).
(function () {
  "use strict";

  var root = document.querySelector(".aw-komentarze");
  if (!root) return;

  var API = (root.getAttribute("data-api") || "").replace(/\/+$/, "");
  var SLUG = root.getAttribute("data-slug");

  var el = {
    postLike: root.querySelector("[data-aw-like-post]"),
    postLikes: root.querySelector("[data-aw-post-likes]"),
    count: root.querySelector("[data-aw-count]"),
    loadStatus: root.querySelector("[data-aw-load-status]"),
    list: root.querySelector("[data-aw-list]"),
    form: root.querySelector("[data-aw-form]"),
    closed: root.querySelector("[data-aw-closed]"),
    status: root.querySelector("[data-aw-status]"),
    chars: root.querySelector("[data-aw-chars]")
  };
  var poleAutor = el.form.querySelector("[name=author]");
  var poleTresc = el.form.querySelector("[name=text]");
  var poleWww = el.form.querySelector("[name=website]");
  var przyciskWyslij = el.form.querySelector("button[type=submit]");

  var TIMEOUT_ZAPIS = 20000;   // zimny start serwera + moderacja AI
  var TIMEOUT_ODCZYT = 10000;
  var POLLING_CO = 1500;
  var POLLING_MAKS = 15000;

  // ---------- localStorage (może być niedostępny – wtedy po prostu nic nie pamiętamy) ----------
  function czytaj(klucz) {
    try { return window.localStorage.getItem(klucz); } catch (e) { return null; }
  }
  function zapisz(klucz, wartosc) {
    try {
      if (wartosc === null) window.localStorage.removeItem(klucz);
      else window.localStorage.setItem(klucz, wartosc);
    } catch (e) { /* ignorujemy */ }
  }
  function czytajJson(klucz, domyslna) {
    try { return JSON.parse(czytaj(klucz)) || domyslna; } catch (e) { return domyslna; }
  }

  var KLUCZ_NICK = "aw-nick";
  var KLUCZ_OCZEKUJACE = "aw-oczekujace"; // [{id, slug}]
  function kluczLikePost() { return "aw-like:post:" + SLUG; }
  function kluczLikeKom(id) { return "aw-like:c:" + id; }

  // ---------- HTTP ----------
  function zapytanie(metoda, sciezka, body, timeout) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeout || TIMEOUT_ODCZYT) : null;
    var opcje = { method: metoda, headers: { "Accept": "application/json" } };
    if (ctrl) opcje.signal = ctrl.signal;
    if (body) {
      opcje.headers["Content-Type"] = "application/json";
      opcje.body = JSON.stringify(body);
    }
    return fetch(API + sciezka, opcje)
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (dane) {
          return { status: res.status, dane: dane, retryAfter: res.headers.get("Retry-After") };
        });
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  // ---------- formatowanie ----------
  var formatDaty = new Intl.DateTimeFormat("pl-PL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  function data(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : formatDaty.format(d);
  }
  function odmienKomentarze(n) {
    if (n === 1) return "1 komentarz";
    var j = n % 10, d = n % 100;
    if (j >= 2 && j <= 4 && (d < 12 || d > 14)) return n + " komentarze";
    return n + " komentarzy";
  }
  function minuty(sekundy) {
    var m = Math.max(1, Math.ceil((parseInt(sekundy, 10) || 60) / 60));
    return m === 1 ? "minutę" : (m < 5 ? m + " minuty" : m + " minut");
  }

  // ---------- serduszka ----------
  function ustawSerce(btn, polubione, liczba) {
    btn.classList.toggle("aw-aktywne", polubione);
    btn.setAttribute("aria-pressed", polubione ? "true" : "false");
    var licznik = btn.querySelector(".aw-licznik");
    if (licznik && typeof liczba === "number") licznik.textContent = liczba;
  }

  function przelaczLike(btn, klucz, sciezka) {
    var polubione = czytaj(klucz) === "1";
    var licznik = btn.querySelector(".aw-licznik");
    var przed = parseInt(licznik.textContent, 10) || 0;
    // optymistycznie
    ustawSerce(btn, !polubione, Math.max(0, przed + (polubione ? -1 : 1)));
    zapisz(klucz, polubione ? null : "1");
    btn.disabled = true;
    zapytanie(polubione ? "DELETE" : "POST", sciezka)
      .then(function (r) {
        if (r.status >= 200 && r.status < 300 && typeof r.dane.likes === "number") {
          ustawSerce(btn, !polubione, r.dane.likes);
        } else {
          throw new Error("like " + r.status);
        }
      })
      .catch(function () {
        ustawSerce(btn, polubione, przed);
        zapisz(klucz, polubione ? "1" : null);
      })
      .finally(function () { btn.disabled = false; });
  }

  // ---------- lista komentarzy ----------
  function elementKomentarza(k) {
    var li = document.createElement("li");
    li.className = "aw-komentarz";
    li.id = "komentarz-" + k.id;

    var naglowek = document.createElement("div");
    naglowek.className = "aw-naglowek";
    var autor = document.createElement("strong");
    autor.className = "aw-autor";
    autor.textContent = k.author;
    var kiedy = document.createElement("time");
    kiedy.className = "aw-data";
    kiedy.dateTime = k.created_at;
    kiedy.textContent = data(k.created_at);
    naglowek.appendChild(autor);
    naglowek.appendChild(kiedy);

    var tresc = document.createElement("p");
    tresc.className = "aw-tresc";
    tresc.textContent = k.text;

    var serce = document.createElement("button");
    serce.type = "button";
    serce.className = "aw-serce";
    serce.setAttribute("aria-label", "Polub komentarz");
    var ikona = document.createElement("span");
    ikona.className = "aw-ikona";
    ikona.setAttribute("aria-hidden", "true");
    ikona.textContent = "♥";
    var licznik = document.createElement("span");
    licznik.className = "aw-licznik";
    serce.appendChild(ikona);
    serce.appendChild(licznik);
    ustawSerce(serce, czytaj(kluczLikeKom(k.id)) === "1", k.likes || 0);
    serce.addEventListener("click", function () {
      przelaczLike(serce, kluczLikeKom(k.id), "/v1/comments/" + encodeURIComponent(k.id) + "/like");
    });

    li.appendChild(naglowek);
    li.appendChild(tresc);
    li.appendChild(serce);
    return li;
  }

  var liczbaKomentarzy = 0;
  function ustawLiczbe(n) {
    liczbaKomentarzy = n;
    el.count.textContent = n ? "(" + n + ")" : "";
  }

  function dodajDoListy(k) {
    if (document.getElementById("komentarz-" + k.id)) return;
    el.list.appendChild(elementKomentarza(k));
    ustawLiczbe(liczbaKomentarzy + 1);
    el.loadStatus.hidden = true;
  }

  function ustawOtwarte(otwarte) {
    el.form.hidden = !otwarte;
    el.closed.hidden = otwarte;
  }

  function wczytaj() {
    if (!API) {
      el.loadStatus.textContent = "Komentarze nie są jeszcze skonfigurowane.";
      return;
    }
    zapytanie("GET", "/v1/posts/" + encodeURIComponent(SLUG))
      .then(function (r) {
        if (r.status !== 200) throw new Error("GET " + r.status);
        var d = r.dane;
        ustawSerce(el.postLike, czytaj(kluczLikePost()) === "1", d.likes || 0);
        el.postLike.disabled = false;

        el.list.textContent = "";
        (d.comments || []).forEach(function (k) { el.list.appendChild(elementKomentarza(k)); });
        ustawLiczbe((d.comments || []).length);
        if (liczbaKomentarzy) {
          el.loadStatus.hidden = true;
        } else {
          el.loadStatus.textContent = "Nie ma jeszcze komentarzy. Bądź pierwszy!";
        }
        ustawOtwarte(d.comments_open !== false);
        sprawdzOczekujace();
      })
      .catch(function () {
        el.loadStatus.textContent = "Komentarze są chwilowo niedostępne. Spróbuj później.";
      });
  }

  // ---------- wysyłanie ----------
  function status(tekst, rodzaj) {
    el.status.textContent = tekst;
    el.status.className = "aw-status" + (rodzaj ? " aw-status-" + rodzaj : "");
  }

  function oczekujace() { return czytajJson(KLUCZ_OCZEKUJACE, []); }
  function dodajOczekujacy(id) {
    var lista = oczekujace().filter(function (o) { return o.id !== id; });
    lista.push({ id: id, slug: SLUG });
    zapisz(KLUCZ_OCZEKUJACE, JSON.stringify(lista.slice(-20)));
  }
  function usunOczekujacy(id) {
    zapisz(KLUCZ_OCZEKUJACE, JSON.stringify(oczekujace().filter(function (o) { return o.id !== id; })));
  }

  // Obsługa wyniku moderacji (z POST albo z odpytywania GET /v1/comments/{id}).
  // Zwraca true, gdy wynik jest ostateczny.
  function wynikModeracji(d, poWyslaniu) {
    if (d.status === "approved" && d.comment) {
      dodajDoListy(d.comment);
      usunOczekujacy(d.comment.id);
      if (poWyslaniu) {
        status("Opublikowano! Dziękujemy za komentarz.", "ok");
        poleTresc.value = "";
        el.chars.textContent = "0";
      }
      return true;
    }
    if (d.status === "rejected") {
      if (d.id) usunOczekujacy(d.id);
      status("Komentarz nie został opublikowany" + (d.reason ? ": " + d.reason : "."), "blad");
      return true;
    }
    return false;
  }

  function odpytuj(id) {
    var start = Date.now();
    function krok() {
      zapytanie("GET", "/v1/comments/" + encodeURIComponent(id))
        .then(function (r) {
          if (r.status === 200 && wynikModeracji(r.dane, true)) return;
          if (Date.now() - start < POLLING_MAKS) {
            setTimeout(krok, POLLING_CO);
          } else {
            status("Komentarz czeka na sprawdzenie. Pojawi się, gdy zostanie zatwierdzony.", "info");
          }
        })
        .catch(function () {
          status("Komentarz czeka na sprawdzenie. Pojawi się, gdy zostanie zatwierdzony.", "info");
        });
    }
    setTimeout(krok, POLLING_CO);
  }

  // Komentarze wysłane wcześniej, które czekały na moderację.
  function sprawdzOczekujace() {
    oczekujace().filter(function (o) { return o.slug === SLUG; }).forEach(function (o) {
      zapytanie("GET", "/v1/comments/" + encodeURIComponent(o.id)).then(function (r) {
        if (r.status === 404) { usunOczekujacy(o.id); return; }
        if (r.status !== 200) return;
        if (r.dane.status === "approved") { usunOczekujacy(o.id); return; } // jest już na liście
        if (r.dane.status === "rejected") {
          usunOczekujacy(o.id);
          status("Twój wcześniejszy komentarz nie został opublikowany" +
            (r.dane.reason ? ": " + r.dane.reason : "."), "blad");
        } else {
          status("Twój wcześniejszy komentarz wciąż czeka na sprawdzenie.", "info");
        }
      }).catch(function () { /* spróbujemy przy następnej wizycie */ });
    });
  }

  function tokenTurnstile() {
    var pole = el.form.querySelector("[name='cf-turnstile-response']");
    return pole ? pole.value : "";
  }
  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (e) { /* ignorujemy */ }
    }
  }

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var autor = poleAutor.value.trim();
    var tresc = poleTresc.value.trim();
    if (!autor) { status("Wpisz swoje imię lub nick.", "blad"); poleAutor.focus(); return; }
    if (!tresc) { status("Napisz treść komentarza.", "blad"); poleTresc.focus(); return; }
    if (el.form.querySelector(".cf-turnstile") && !tokenTurnstile()) {
      status("Poczekaj chwilę na sprawdzenie, czy nie jesteś robotem, i spróbuj ponownie.", "blad");
      return;
    }

    zapisz(KLUCZ_NICK, autor);
    przyciskWyslij.disabled = true;
    status("Sprawdzam komentarz…", "info");

    zapytanie("POST", "/v1/posts/" + encodeURIComponent(SLUG) + "/comments", {
      author: autor,
      text: tresc,
      website: poleWww.value,
      turnstile_token: tokenTurnstile()
    }, TIMEOUT_ZAPIS)
      .then(function (r) {
        var d = r.dane || {};
        if (r.status === 201 || r.status === 200) {
          if (!wynikModeracji(d, true)) status("Nieoczekiwana odpowiedź serwera.", "blad");
        } else if (r.status === 202 && d.id) {
          dodajOczekujacy(d.id);
          status("Sprawdzam komentarz… to może chwilę potrwać.", "info");
          odpytuj(d.id);
        } else if (r.status === 409) {
          ustawOtwarte(false);
          status("", "");
        } else if (r.status === 429) {
          status("Za dużo komentarzy w krótkim czasie. Spróbuj ponownie za " + minuty(r.retryAfter) + ".", "blad");
        } else if (r.status === 400) {
          status(d.message || "Sprawdź treść komentarza i spróbuj ponownie.", "blad");
        } else if (r.status === 403) {
          status("Nie udało się potwierdzić, że nie jesteś robotem. Spróbuj ponownie.", "blad");
        } else {
          status("Nie udało się wysłać komentarza. Spróbuj później.", "blad");
        }
      })
      .catch(function () {
        status("Nie udało się połączyć z serwerem. Spróbuj później.", "blad");
      })
      .finally(function () {
        przyciskWyslij.disabled = false;
        resetTurnstile();
      });
  });

  poleTresc.addEventListener("input", function () {
    el.chars.textContent = poleTresc.value.length;
  });

  el.postLike.addEventListener("click", function () {
    przelaczLike(el.postLike, kluczLikePost(), "/v1/posts/" + encodeURIComponent(SLUG) + "/like");
  });

  poleAutor.value = czytaj(KLUCZ_NICK) || "";
  wczytaj();
})();
