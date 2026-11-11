# Jak dodać nowy artykuł

## Część dla Wojtka: przygotowanie artykułu

1. Skopiuj folder `szablon-artykulu` i nazwij go od daty i tematu, np.:

   ```
   2026-11-15-pelnia-ksiezyca
   ```

   - data na początku: **rok-miesiąc-dzień**
   - potem kilka słów oddzielonych myślnikami
   - najlepiej bez polskich liter i bez spacji (skrypt i tak je poprawi)

2. Wrzuć do tego folderu swoje zdjęcia, np. `okladka.jpg` i `krater.jpg`.

3. Otwórz `artykul.md` w Notatniku, VS Code albo innym edytorze tekstu i napisz artykuł.

### Wygląd pliku `artykul.md`

```markdown
---
title: "Pełnia Księżyca"
okladka: okladka.jpg
---

Pierwszy akapit. Pojawi się też na stronie głównej jako zapowiedź.

Drugi akapit, po pustej linii.

## Śródtytuł

Tekst **pogrubiony**, *pochylony*, a tu [link](https://www.nasa.gov).

{% include zdjecie.html plik="krater.jpg" podpis="Krater Kopernik" %}
```

| Element | Co oznacza |
|---|---|
| Linie `---` | Początek i koniec nagłówka. Muszą zostać. |
| `title:` | Tytuł artykułu, w cudzysłowie. |
| `okladka:` | Nazwa pliku ze zdjęciem tytułowym. Bez tej linii pokaże się ikonka 🔭. |
| `okladka_podpis:` | Opcjonalny. Podpis pod zdjęciem tytułowym, np. autor i licencja zdjęcia z internetu. |
| `opis:` | Opcjonalny. Własna zapowiedź na stronie głównej, gdy pierwszy akapit się nie nadaje. |
| `## Tekst` | Śródtytuł. |
| `- coś` | Punkt na liście. |
| `{% include zdjecie.html ... %}` | Zdjęcie w środku tekstu. W `plik` wpisz nazwę pliku z folderu, a w `podpis` opis pod zdjęciem (podpis jest opcjonalny). |

**Wskazówki:**

- Zapisuj plik w kodowaniu UTF-8, żeby polskie litery wyświetlały się dobrze. Notatnik i VS Code robią to domyślnie.
- Zdjęcia z telefonu bywają bardzo duże. Najlepiej zmniejszyć je do ok. 1600 px szerokości (np. w programie Paint: Zmień rozmiar).
- Nazwy zdjęć zapisuj bez spacji i polskich liter, np. `pelnia-1.jpg`.

## Część dla taty: publikacja

W PowerShellu, w katalogu repozytorium:

```powershell
.\dodaj-artykul.ps1 -Folder "D:\Wojtek\2026-11-15-pelnia-ksiezyca"
```

Skrypt:

- sprawdza, czy artykuł ma tytuł i czy są wszystkie użyte zdjęcia,
- kopiuje artykuł do `_posts/`, a zdjęcia do `assets/images/posts/<nazwa>/`.

Potem wystarczy `git add .`, `git commit -m "Nowy artykuł"` i `git push`. Zamiast tego możesz od razu dodać przełącznik `-Opublikuj`, a skrypt zrobi commit i push sam.

Inne opcje:

- `-Data 2026-11-15`: ustala datę, gdy folder nie ma jej w nazwie.
- `-Nadpisz`: zastępuje istniejący artykuł, np. po poprawkach.

Jeśli Windows zablokuje uruchomienie skryptu, jednorazowo wykonaj:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Strona odświeży się na GitHubie po 1–2 minutach.

### Poprawianie albo usuwanie artykułu

- **Poprawka:** edytuj plik w `_posts/`, albo popraw folder Wojtka i uruchom skrypt z `-Nadpisz`.
- **Usunięcie:** skasuj plik z `_posts/` i folder z `assets/images/posts/`.
- **Szkic:** artykuł z datą w przyszłości nie pojawi się na stronie, dopóki ta data nie minie. Uwaga: strona przebudowuje się tylko po pushu, więc po tej dacie trzeba zrobić dowolny push.
