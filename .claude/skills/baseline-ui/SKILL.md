---
name: baseline-ui
description: Quickly deslop UI code by fixing spacing, hierarchy, typography, and small layout issues. Use when the interface needs a fast cleanup or polish pass.
---

# Baseline UI

Enforces an opinionated UI baseline to prevent AI-generated interface slop.

> **TAS 각색본** — 원본: [UI Skills](https://www.ui-skills.com/) `ui-skills@0.2.4` (ibelick, MIT).
> 원본은 Tailwind CSS · `motion/react` · Base UI/Radix 스택을 전제한다. 이 저장소는
> **styled-components + `globalStyle.ts` CSS 변수 토큰**이고 Tailwind·motion·Radix가 **0건**이라,
> `Stack` / `Components` / `Typography` / `Layout` 절의 스택 종속 규칙을 이 저장소의 표현 수단으로 치환했다.
> **규칙을 뺀 것이 아니라 매핑한 것이다.** 스택 무관 절(Animation · Performance · Design 등)은 원문 그대로다.
> 각색 내역과 재동기화 절차는 [`../README.md`](../README.md) 참고.

## How to use

- `/baseline-ui`
  Apply these constraints to any UI work in this conversation.

- `/baseline-ui <file>`
  Review the file against all constraints below and output:
  - violations (quote the exact line/snippet)
  - why it matters (1 short sentence)
  - a concrete fix (code-level suggestion)

## Stack

- MUST use the design tokens defined in `client/styles/globalStyle.ts` (`--font`, `--gap-md`, `--radius-lg`, `--brand-color`, …) unless a custom value already exists or is explicitly requested
- NEVER write a `font-size` px literal — always a token (`--big-font`/`--large-font`/`--font`/`--medium-font`/`--small-font`/`--xsmall-font`/`--tiny-font`, display: `--display-sm/md/lg`). Repo-wide count is 0; the only exception is `components/policy/policyCss.ts` (standalone HTML the app `GlobalStyle` never reaches)
- NEVER invent a token-looking fallback (`var(--red-color, #d94a4a)`) — if the token does not exist, use the real one (`--danger-color`, `--success-color`) or add it to `globalStyle.ts`
- MUST style with `styled-components`; use props-based branching (`styled.button<{ $primary?: boolean }>`) and the `css` helper for shared fragments, not string-concatenated class logic
- MUST use the shared font stack from `client/styles/fontStack.ts` — never redeclare `font-family` per component
- NEVER add an animation library. There is no `motion`/`framer-motion` dependency; use CSS `transition`/`@keyframes`. Introducing one needs explicit approval (CLAUDE.md Front-End Standards)

## Components

- MUST use the project's existing primitives first: `components/ui/` (`Buttons`, `Input`, `FormControls`, `LabelBadge`, `ConfirmDialog`, `FieldError`, `Spinner`, `ToggleSwitch`, `Icons`, …), `components/settings/settings-styles.ts` for settings surfaces, `components/calendar/overlays/ModalStyles.ts` for layers
- MUST brief the reason and get approval **before** creating a new component (CLAUDE.md Front-End Standards)
- MUST prefer native HTML elements for anything with keyboard or focus behavior — native `button`, `a`, `input`, `radio`, `checkbox`, `select`, `details`, `dialog`. This repo has no Base UI / Radix / React Aria, and custom replacements for built-in browser behavior are prohibited
- NEVER use tag selectors in styles — IDs or class names only (CLAUDE.md Front-End Standards)
- NEVER mix primitive systems within the same interaction surface
- MUST add an `aria-label` to icon-only buttons (`CloseIconButton`, `AuthActionIcon` already do)
- NEVER rebuild keyboard or focus behavior by hand — reuse `useDialogAccessibility` from `ModalStyles.ts` (focus trap, Escape, focus restore) unless explicitly requested

## Interaction

- MUST use a confirmation layer for destructive or irreversible actions — reuse `ui/ConfirmDialog`, or the existing patterns in `AccountDeleteModal` / `AsideGuestLogout`
- SHOULD use structural skeletons for loading states (the app-level boot gate in `_app.tsx` covers first paint; per-surface loads still need one)
- NEVER use `100vh`, use `100dvh` (repo convention: `ModalStyles.ts` declares `100vh` then `100dvh` as the fallback pair)
- MUST respect `safe-area-inset` for fixed elements (`MobileTabBar` bottom, `Header` top notch)
- MUST show errors next to where the action happens — use `ui/FieldError`
- NEVER block paste in `input` or `textarea` elements

## Animation

- NEVER add animation unless it is explicitly requested
- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` on entrance
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- SHOULD respect `prefers-reduced-motion`
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces

## Typography

- MUST use `text-wrap: balance` for headings and `text-wrap: pretty` for body/paragraphs
- MUST use `font-variant-numeric: tabular-nums` for data (prices, counts, times — revenue KPIs and timeline columns especially)
- SHOULD use `text-overflow: ellipsis` (with `overflow: hidden`) or `-webkit-line-clamp` for dense UI
- NEVER modify `letter-spacing` unless explicitly requested

## Layout

- MUST use the fixed z-index scale — `OVERLAY_Z_INDEX` in `ModalStyles.ts` and the layering table in `docs/design-spec.md` §6. No arbitrary `z-index` values
- SHOULD set `width` and `height` to the same token for square elements, or use `aspect-ratio: 1`
- MUST keep mobile-only rules inside `@media (max-width: 640px)` so desktop rendering is unchanged (repo convention across 43 files)

## Performance

- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation
- NEVER use `useEffect` for anything that can be expressed as render logic

## Design

- NEVER use gradients unless explicitly requested
- NEVER use purple or multicolor gradients
- NEVER use glow effects as primary affordances
- SHOULD use the shadow tokens (`--shadow-sm`, `--shadow-md`, `--card-shadow`, `--modal-shadow`) unless explicitly requested
- MUST give empty states one clear next action
- SHOULD limit accent color usage to one per view
- SHOULD use existing tokens from `globalStyle.ts` before introducing new ones
