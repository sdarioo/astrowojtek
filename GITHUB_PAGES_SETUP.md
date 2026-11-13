# Publikacja bloga AstroWojtek na GitHub Pages

Blog jest zbudowany na **Jekyllu**, czyli silniku stron wbudowanym w GitHub Pages.
GitHub sam zamienia pliki Markdown z artykułami na stronę po każdym `git push`.
Nie trzeba niczego instalować na komputerze.

Adres bloga: **https://astrowojtek.pl/** (wcześniej https://sdarioo.github.io/astrowojtek/ – stary adres przekierowuje na nowy)

## 1. Wypchnij pliki na GitHuba

```bash
git add .
git commit -m "Szablon bloga"
git push -u origin main
```

## 2. Ustaw repozytorium jako publiczne

GitHub Pages jest darmowy tylko dla repozytoriów publicznych.

**Settings → General → Danger Zone → Change repository visibility → Public**

## 3. Włącz GitHub Pages

**Settings → Pages → Build and deployment**

- **Source:** `Deploy from a branch`
- **Branch:** `main`, folder `/ (root)` → **Save**

Jeśli Pages było już włączone dla strony testowej, nic nie trzeba zmieniać.
Jekyll uruchomi się sam, bo usunęliśmy plik `.nojekyll`.

## 4. Sprawdź wdrożenie

W zakładce **Actions** pojawi się zadanie *pages build and deployment* (1–2 minuty).

- Zielony znaczek: strona działa.
- Czerwony znaczek: kliknij w zadanie, a log pokaże, który plik ma błąd. Najczęściej to literówka w nagłówku artykułu.

## 5. Komentarze

GitHub Pages hostuje tylko statyczne pliki, więc komentarze muszą obsługiwać zewnętrzny serwis.
Szablon ma przygotowane miejsce na komentarze w `_includes/comments.html`.
Serwis wybiera się w `_config.yml`:

```yaml
comments:
  provider: ""          # "" = wyłączone, "disqus" albo "htmlcommentbox"
  disqus_shortname: ""
```

> Wybrany serwis: **Disqus** (`provider: "disqus"` jest już ustawiony).
> Komentarze pojawią się pod artykułami, gdy wpiszesz `disqus_shortname` (krok 5 poniżej).
> Cusdis odpadł: serwer cusdis.com nie odpowiada, a projekt został zarchiwizowany.

### Opcja A: Disqus (komentarze jako gość) – wybrana

1. Załóż konto na https://disqus.com → **I want to install Disqus on my site**.
2. Podaj nazwę strony. Disqus nada jej *shortname*, np. `astrowojtek`.
3. W **Settings → Community → Guest Commenting** włącz komentowanie bez logowania.
4. W **Settings → Community → Moderation** wybierz **Premoderate all comments**, żeby każdy komentarz czekał na akceptację.
5. W `_config.yml` ustaw `provider: "disqus"` i `disqus_shortname: "astrowojtek"`.

Darmowy plan Disqusa może wyświetlać reklamy.

### Opcja B: HTML Comment Box

1. Wejdź na https://www.htmlcommentbox.com, zaloguj się jako moderator i wygeneruj kod.
2. Wklej ten kod do `_includes/htmlcommentbox.html` (zastąp obecną zawartość).
3. W `_config.yml` ustaw `provider: "htmlcommentbox"`.

## 6. Dodatki (opcjonalne)

- **Link do strony na GitHubie:** na stronie repozytorium kliknij ⚙️ przy **About** i zaznacz *Use your GitHub Pages website*.
- **Własna domena** (np. `astrowojtek.pl`):
  1. Wpisz ją w **Settings → Pages → Custom domain**.
  2. U rejestratora domeny dodaj rekordy `A` na adresy `185.199.108.153`, `185.199.109.153`, `185.199.110.153` i `185.199.111.153` oraz rekord `CNAME` dla `www` wskazujący na `sdarioo.github.io.` (z kropką na końcu).
  3. W `_config.yml` zmień `url` na `https://astrowojtek.pl` i `baseurl` na `""`.
  4. Gdy GitHub wystawi certyfikat, zaznacz **Enforce HTTPS** (certyfikat jest darmowy, nie trzeba go kupować).

  Tak jest skonfigurowany ten blog (domena `astrowojtek.pl` w home.pl).
- **Podgląd na własnym komputerze** (przed pushem):
  - z Dockerem:
    ```bash
    docker run --rm -it -p 4000:4000 -v "${PWD}:/srv/jekyll" jekyll/jekyll:3.8 jekyll serve --watch --force_polling
    ```
  - z Ruby: `bundle install`, potem `bundle exec jekyll serve`

  Strona będzie pod adresem http://localhost:4000/

## Struktura projektu

| Ścieżka | Zawartość |
|---|---|
| `_posts/` | Artykuły (Markdown) |
| `assets/images/posts/<artykuł>/` | Zdjęcia artykułów |
| `o-mnie.md` | Strona „O mnie” |
| `_config.yml` | Tytuł, opis autora, komentarze |
| `_layouts/`, `_includes/` | Szablon HTML |
| `assets/css/style.css` | Wygląd (kolory w sekcji `:root`) |
| `assets/js/` | Kalendarz i wyszukiwarka |
| `szablon-artykulu/` | Wzór artykułu dla Wojtka |
| `JAK-DODAC-ARTYKUL.md` | Instrukcja dodawania artykułów |
