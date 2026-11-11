<#
.SYNOPSIS
  Dodaje artykuł przygotowany przez Wojtka do bloga.

.DESCRIPTION
  Folder z artykułem zawiera:
    - artykul.md       (tekst artykułu, patrz szablon-artykulu/)
    - zdjęcia          (np. okladka.jpg, krater.jpg)

  Skrypt:
    1. kopiuje artykul.md do _posts/RRRR-MM-DD-nazwa.md
    2. kopiuje zdjęcia do assets/images/posts/RRRR-MM-DD-nazwa/
    3. sprawdza, czy jest tytuł i czy istnieją wszystkie użyte zdjęcia
    4. z przełącznikiem -Opublikuj robi też git add / commit / push

  Nazwa folderu może zaczynać się od daty (2026-11-15-ksiezyc).
  Jeśli nie ma daty (np. "ksiezyc"), użyta zostanie dzisiejsza data albo -Data.

.EXAMPLE
  .\dodaj-artykul.ps1 -Folder "D:\Wojtek\2026-11-15-ksiezyc"

.EXAMPLE
  .\dodaj-artykul.ps1 -Folder "D:\Wojtek\ksiezyc" -Data 2026-11-15 -Opublikuj
#>
param(
  [Parameter(Mandatory = $true)] [string] $Folder,
  [string] $Data,
  [switch] $Opublikuj,
  [switch] $Nadpisz
)

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

function Blad($tekst) { Write-Host "BŁĄD: $tekst" -ForegroundColor Red; exit 1 }

if (-not (Test-Path -LiteralPath $Folder -PathType Container)) { Blad "Nie ma folderu: $Folder" }
$Folder = (Resolve-Path -LiteralPath $Folder).Path
$nazwaFolderu = Split-Path $Folder -Leaf

# --- Data i nazwa (slug) ---
if ($nazwaFolderu -match '^(\d{4}-\d{2}-\d{2})-(.+)$') {
  $dataArt = $Matches[1]; $slug = $Matches[2]
} else {
  $dataArt = if ($Data) { $Data } else { Get-Date -Format "yyyy-MM-dd" }
  $slug = $nazwaFolderu
}
if ($Data) { $dataArt = $Data }
if ($dataArt -notmatch '^\d{4}-\d{2}-\d{2}$') { Blad "Data musi mieć format RRRR-MM-DD, np. 2026-11-15" }

# Slug: małe litery, bez polskich znaków, spacje -> myślniki
$slug = $slug.ToLower().Replace('ł', 'l')
$slug = $slug.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
$slug = ($slug -replace '[^a-z0-9]+', '-').Trim('-')
if (-not $slug) { Blad "Nie udało się utworzyć nazwy artykułu z: $nazwaFolderu" }

$nazwa = "$dataArt-$slug"

# --- Plik z artykułem ---
$md = Join-Path $Folder "artykul.md"
if (-not (Test-Path -LiteralPath $md)) {
  $mdy = @(Get-ChildItem -LiteralPath $Folder -Filter *.md)
  if ($mdy.Count -ne 1) { Blad "W folderze musi być plik artykul.md (albo dokładnie jeden plik .md)" }
  $md = $mdy[0].FullName
}
$tresc = [IO.File]::ReadAllText($md, [Text.Encoding]::UTF8)

if ($tresc -notmatch '(?s)^\s*---\s*\r?\n(.*?)\r?\n---') { Blad "Artykuł musi zaczynać się od nagłówka między liniami --- (patrz szablon-artykulu/artykul.md)" }
$naglowek = $Matches[1]
if ($naglowek -notmatch '(?m)^title:\s*\S') { Blad "W nagłówku brakuje tytułu (linia title: ...)" }

# --- Czy wszystkie zdjęcia istnieją? ---
$zdjecia = @()
if ($naglowek -match '(?m)^okladka:\s*"?([^"\r\n]+?)"?\s*$') { $zdjecia += $Matches[1] }
$zdjecia += [regex]::Matches($tresc, 'plik="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$brakujace = $zdjecia | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Folder $_)) }
if ($brakujace) { Blad ("Brakuje zdjęć w folderze: " + ($brakujace -join ", ")) }

# --- Kopiowanie ---
$celMd = Join-Path $repo "_posts\$nazwa.md"
$celZdj = Join-Path $repo "assets\images\posts\$nazwa"
if ((Test-Path $celMd) -and -not $Nadpisz) { Blad "Artykuł $nazwa już istnieje. Użyj -Nadpisz, żeby go zastąpić." }

# Zapis w UTF-8 bez BOM (tego oczekuje Jekyll)
[IO.File]::WriteAllText($celMd, $tresc, (New-Object Text.UTF8Encoding $false))

$obrazy = Get-ChildItem -LiteralPath $Folder -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|gif|webp|svg)$' }
if ($obrazy) {
  New-Item -ItemType Directory -Force -Path $celZdj | Out-Null
  $obrazy | Copy-Item -Destination $celZdj -Force
}

Write-Host "Dodano artykuł: _posts\$nazwa.md" -ForegroundColor Green
Write-Host "Zdjęcia ($(@($obrazy).Count)): assets\images\posts\$nazwa\" -ForegroundColor Green

# --- Publikacja ---
if ($Opublikuj) {
  Push-Location $repo
  try {
    git add -- "_posts/$nazwa.md" "assets/images/posts/$nazwa"
    git commit -m "Nowy artykuł: $nazwa"
    git push
    Write-Host "Opublikowano. Strona odświeży się za 1-2 minuty." -ForegroundColor Green
  } finally { Pop-Location }
} else {
  Write-Host "Aby opublikować: git add . ; git commit -m `"Nowy artykuł`" ; git push"
}
