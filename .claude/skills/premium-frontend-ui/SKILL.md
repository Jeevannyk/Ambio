---
name: premium-frontend-ui
description: Elite frontend UI craftsmanship guidelines for award-level, immersive web experiences. Use when asked to build a premium landing page, Awwwards-style component, immersive UI, high-end portfolio, or any frontend requiring top-tier visual polish, motion design, and performance.
---

# Premium Frontend UI Craftsmanship

Apply these standards when building any high-end, immersive, or award-level frontend.

## 1. Creative Foundation

Commit to a strong visual identity before writing layout code:

- **Editorial Brutalism** — high-contrast mono palettes, oversized type, sharp edges, raw grids
- **Organic Fluidity** — soft gradients, deep rounded corners, glassmorphism, spring physics
- **Cyber / Technical** — dark mode, glowing neon accents, monospaced type, staggered reveals
- **Cinematic Pacing** — full-viewport imagery, slow cross-fades, scroll-dependent storytelling

## 2. Structural Architecture

### 2.1 Entry Sequence
- Implement a lightweight preloader — handle fonts, images, 3D models
- Transition away fluidly: split-door reveal, scale-up zoom, or staggered text sweep

### 2.2 Hero Architecture
- Full-bleed containers (`100vh` / `100dvh`)
- Break headlines into `<span>` per word/character for cascading entrance animations
- Floating elements or clipping paths for depth behind primary copy

### 2.3 Navigation
- No static navbars — sticky headers that hide on scroll-down, reveal on scroll-up
- Hover states reveal rich content (mega-menus with image previews)

## 3. Motion Design System

### 3.1 Scroll-Driven Narratives (GSAP ScrollTrigger)
- **Pinned containers** — lock sections while content reveals past them
- **Horizontal journeys** — translate vertical scroll into horizontal movement for galleries
- **Parallax mapping** — varying scroll speeds for bg / midground / foreground layers

### 3.2 Micro-Interactions
- **Magnetic components** — calculate mouse distance, pull button toward cursor dynamically
- **Custom cursor** — lerp-smoothed tracking element following mouse
- **Dimensional hover** — `scale`, `rotateX`, `translate3d` for tactile feedback

## 4. Typography & Visual Texture

- **Scale contrast** — headlines `clamp()` up to `12vw`, body min `16px–18px`
- **Variable/premium fonts** — never system defaults
- **Noise overlay** — CSS/SVG grain at `mix-blend-mode: overlay`, opacity `0.02–0.05`
- **Glass depth** — `backdrop-filter: blur()` + ultra-thin semi-transparent borders

## 5. Performance Rules

- Animate only `transform` and `opacity` — never `width`, `height`, `top`, `margin`
- `will-change: transform` on complex moving elements, remove post-animation
- Wrap cursor/hover logic in `@media (hover: hover) and (pointer: fine)`
- Wrap heavy animations in `@media (prefers-reduced-motion: no-preference)`

## 6. Implementation Stack

### React / Next.js
- **Framer Motion** — layout transitions, spring physics
- **Lenis** (`@studio-freight/lenis`) — smooth scroll context
- **React Three Fiber** (`@react-three/fiber`) — WebGL / 3D interactions

### Vanilla / HTML / Astro
- **GSAP** — timeline sequencing, ScrollTrigger
- **Lenis** via CDN — scroll smoothing
- **SplitType** — accessible typography chunking

## Auto-Apply Checklist

When building any premium frontend, automatically:
1. Wrap in scroll-smoothed architecture
2. CSS with composited layers (`transform` / `opacity` only)
3. Staggered component entrance animations
4. Fluid type scale with `clamp()`
5. Strong intentional aesthetic — no generic defaults
