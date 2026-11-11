// Kalendarz w menu bocznym: dni, w których pojawił się artykuł, są linkami.
(function () {
  var el = document.getElementById("kalendarz");
  if (!el) return;

  var MIESIACE = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  var DNI = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  var postyWgDnia = {}; // "2026-11-15" -> [{title, url}]
  var rok, miesiac;     // aktualnie pokazywany miesiąc (miesiac: 0-11)

  function klucz(r, m, d) {
    return r + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  function rysuj() {
    var pierwszy = new Date(rok, miesiac, 1);
    var dniWMiesiacu = new Date(rok, miesiac + 1, 0).getDate();
    var przesuniecie = (pierwszy.getDay() + 6) % 7; // poniedziałek = 0
    var dzis = new Date();

    var html = '<div class="kal-naglowek">' +
      '<button type="button" class="kal-poprz" aria-label="Poprzedni miesiąc">‹</button>' +
      "<span>" + MIESIACE[miesiac] + " " + rok + "</span>" +
      '<button type="button" class="kal-nast" aria-label="Następny miesiąc">›</button>' +
      "</div><table><thead><tr>";
    DNI.forEach(function (d) { html += "<th>" + d + "</th>"; });
    html += "</tr></thead><tbody><tr>";

    for (var i = 0; i < przesuniecie; i++) html += "<td></td>";
    for (var d = 1; d <= dniWMiesiacu; d++) {
      var posty = postyWgDnia[klucz(rok, miesiac, d)];
      var jestDzis = d === dzis.getDate() && miesiac === dzis.getMonth() && rok === dzis.getFullYear();
      var klasa = (posty ? "kal-wpis " : "") + (jestDzis ? "kal-dzis" : "");
      var komorka = posty
        ? '<a href="' + posty[0].url + '" title="' + posty.map(function (p) { return p.title; }).join(", ").replace(/"/g, "&quot;") + '">' + d + "</a>"
        : "<span>" + d + "</span>";
      html += '<td class="' + klasa.trim() + '">' + komorka + "</td>";
      if ((przesuniecie + d) % 7 === 0 && d < dniWMiesiacu) html += "</tr><tr>";
    }
    html += "</tr></tbody></table>";
    el.innerHTML = html;

    el.querySelector(".kal-poprz").onclick = function () { zmien(-1); };
    el.querySelector(".kal-nast").onclick = function () { zmien(1); };
  }

  function zmien(o) {
    miesiac += o;
    if (miesiac < 0) { miesiac = 11; rok--; }
    if (miesiac > 11) { miesiac = 0; rok++; }
    rysuj();
  }

  fetch(el.getAttribute("data-index"))
    .then(function (r) { return r.json(); })
    .then(function (posty) {
      posty.forEach(function (p) {
        (postyWgDnia[p.date] = postyWgDnia[p.date] || []).push(p);
      });
      // Zaczynamy od miesiąca najnowszego artykułu (albo bieżącego, gdy brak artykułów)
      var start = posty.length ? new Date(posty[0].date + "T12:00:00") : new Date();
      rok = start.getFullYear();
      miesiac = start.getMonth();
      rysuj();
    })
    .catch(function () {
      el.textContent = "Nie udało się wczytać kalendarza.";
    });
})();
