# Publishing AstroWojtek on GitHub Pages

The site is plain static HTML/CSS (`index.html`, `style.css`) served from the
root of the `main` branch. The empty `.nojekyll` file tells GitHub to serve the
files as-is, without running Jekyll.

## 1. Push the files to GitHub

```bash
git add .
git commit -m "Add first test page"
git push -u origin main
```

## 2. Make sure the repository is public

GitHub Pages is free only for **public** repositories (private repos need a paid plan).

- Open https://github.com/sdarioo/astrowojtek → **Settings** → **General**
- Scroll down to **Danger Zone** → **Change repository visibility** → **Public**
  (skip this if it is already public)

## 3. Turn on GitHub Pages

- In the repository go to **Settings** → **Pages** (left sidebar, under "Code and automation")
- **Build and deployment**
  - **Source:** `Deploy from a branch`
  - **Branch:** `main`, folder `/ (root)` → click **Save**

## 4. Wait for the deployment

- Go to the **Actions** tab — a workflow called *pages build and deployment* runs.
  It usually takes 1–2 minutes.
- When it finishes, **Settings → Pages** shows: *"Your site is live at …"*

The blog will be available at:

**https://sdarioo.github.io/astrowojtek/**

## 5. Optional extras

- **Enforce HTTPS:** in **Settings → Pages**, tick *Enforce HTTPS* (normally on by default).
- **Show the link on the repo page:** on the repo main page click the ⚙️ next to
  **About** and tick *Use your GitHub Pages website*.
- **Custom domain** (e.g. `astrowojtek.pl`): buy the domain, enter it in
  **Settings → Pages → Custom domain**, and at your domain registrar add DNS records:
  - `A` records for the apex domain pointing to
    `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - or a `CNAME` record for `www` pointing to `sdarioo.github.io`

## Updating the blog later

Every push to `main` re-deploys the site automatically — edit files, commit, push,
and the changes appear within a minute or two (hard-refresh the browser with
Ctrl+F5 if you still see the old version).
