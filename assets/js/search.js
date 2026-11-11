// Wyszukiwarka: pobiera search.json i szuka w tytułach i treści artykułów.
// Działa też bez polskich znaków ("ksiezyc" znajdzie "Księżyc").
(function () {
  var script = document.currentScript;
  var indexUrl = script.getAttribute("data-index");
  var pole = document.getElementById("szukaj-pole");
  var info = document.getElementById("szukaj-info");
  var lista = document.getElementById("szukaj-wyniki");

  function normalizuj(s) {
    return (s || "")
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function wyciagnijFragment(tekst, slowo) {
    var i = normalizuj(tekst).indexOf(slowo);
    if (i < 0) return tekst.slice(0, 160) + (tekst.length > 160 ? "…" : "");
    var start = Math.max(0, i - 60);
    return (start > 0 ? "…" : "") + tekst.slice(start, start + 200) + "…";
  }

  var q = new URLSearchParams(window.location.search).get("q") || "";
  pole.value = q;
  if (!q.trim()) {
    info.textContent = "Wpisz słowo, którego szukasz.";
    return;
  }

  var slowa = normalizuj(q).split(/\s+/).filter(Boolean);

  fetch(indexUrl)
    .then(function (r) { return r.json(); })
    .then(function (posty) {
      var wyniki = posty.filter(function (p) {
        var t = normalizuj(p.title + " " + p.text);
        return slowa.every(function (s) { return t.indexOf(s) >= 0; });
      });

      info.textContent = wyniki.length
        ? "Znalezione artykuły: " + wyniki.length
        : "Nic nie znaleziono dla „" + q + "”.";

      wyniki.forEach(function (p) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = p.url;
        a.textContent = p.title;
        var data = document.createElement("span");
        data.className = "data";
        data.textContent = " · " + p.dateText;
        var frag = document.createElement("p");
        frag.textContent = wyciagnijFragment(p.text, slowa[0]);
        li.append(a, data, frag);
        lista.appendChild(li);
      });
    })
    .catch(function () {
      info.textContent = "Nie udało się wczytać wyszukiwarki.";
    });
})();
