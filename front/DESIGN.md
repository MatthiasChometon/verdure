# verdure — Design system

> Identité visuelle et design system de verdure. Issu d'une *design discovery*
> (méthodologie réutilisable). Les **tokens** vivent dans
> `infrastructure/ui/style/main.css` (`@theme` + alias `:root`/`.dark`) et le thème
> composant dans `app.config.ts`. Toute évolution ⇒ régénérer les snapshots
> visuels (`pnpm test:visual:update`).

## 1. Nord (north star)

**« Une serre cosy au cœur d'une forêt tropicale, à l'heure dorée. »**
Prendre soin de ses plantes doit se sentir calme, vivant et un peu enchanté.

- **Archétype** : le Soignant (Caregiver), teinté d'Explorateur (la nature, la découverte).
- **Valeurs** : soin, calme, nature, fiabilité.
- **Principes de design**
  1. **Calme vivant** — l'interface respire (motion ambiant) mais n'agite jamais.
  2. **Chaleur naturelle** — lumière chaude, courbes organiques, profondeur douce ; jamais le blanc clinique.
  3. **La plante d'abord** — le contenu et les photos de plantes sont les héros, l'habillage s'efface.
  4. **Accessible par nature** — motion optionnel, contraste solide, fonctionne hors ligne.

- **Mots-clés visuels** : canopée, feuillage, terre cuite, brume matinale, lumière dorée, feuilles qui dérivent.

## 2. Couleur

- **Canopée** (`--color-green-*`, primary) — vert feuillage naturel, plus profond et doux que l'ancien vert néon. Base 500 `#3a8c5d`, primary 700 en clair / 400 en sombre.
- **Terre cuite** (`--color-clay-*`, secondary) — chaleur terracotta, **par petites touches** (moments, accents).
- **Neutres** — `stone` (gris chauds), jamais `slate` froid.
- **Scène ambiante** (alias) — `--canopy-page` (brume chaude en clair / nuit de jungle en sombre), `--canopy-glow` (halo de lumière), `--foliage` (teinte du feuillage SVG).
- **Sémantique** — success/info/warning/error via Nuxt UI.
- **Dark mode = « nuit de jungle »** : vert-noir chaud, halo vert tamisé. Seuls les **alias** sont remappés en `.dark`.
- Contraste : cible **WCAG 2.2 AA / RGAA 4**.

## 3. Typographie

- **Display** — **Fraunces** (serif douce et chaleureuse) : `h1` + marque. Var `--font-display`.
- **Corps / UI** — **Figtree** (sans humaniste chaleureuse) : tout le reste. Var `--font-sans`.
- Auto-hébergées via `@nuxt/fonts` (compatibles CSP stricte + PWA hors ligne).

## 4. Formes & profondeur

- Rayons plus organiques : `--ui-radius: 0.5rem`.
- Profondeur douce et chaude (halo `--canopy-glow` fixé derrière le contenu), pas d'ombres dures.
- Iconographie : **Lucide** uniquement (`i-lucide-*`, la CSP bloque l'API Iconify).

## 5. Motion & vie

- **Couche feuillage ambiant** (`<UiAnimationAmbientFoliage>`, montée dans `app.vue`) : fronds dans les coins qui respirent lentement + feuilles SVG qui **traversent la scène**. `aria-hidden`, `pointer-events:none`, en arrière-plan (`z-index:-10`).
- **`prefers-reduced-motion`** : dérive coupée, seul le cadre de feuillage calme subsiste (règle dans chaque composant animé, cf. `<UiAnimationReveal>`).
- Perf : uniquement `transform`/`opacity`, `will-change` mesuré, peu d'éléments. SVG plutôt que WebP pour le feuillage (net, minuscule, thémable, offline).
- Révélations d'entrée via `<UiAnimationReveal>`.

## 6. Où poser quoi

- **Tokens / base** : `infrastructure/ui/style/main.css`.
- **Thème composant** (primary/secondary/neutral) : `app.config.ts`.
- **Fonts** : `infrastructure/ui/nuxt.config.ts` (`fonts.families`).
- **Composants d'animation** : `infrastructure/ui/layers/animation/components/` (préfixe `UiAnimation`).

Méthode réutilisable : mémoire *design-system-methodology*.
