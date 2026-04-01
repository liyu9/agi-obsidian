---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications.

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use
- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts)
- Choosing color schemes, typography systems, spacing standards
- Reviewing UI code for UX, accessibility, or visual consistency
- Implementing navigation, animations, or responsive behavior

### Skip
- Pure backend logic development
- Only API or database design
- Performance optimization unrelated to UI
- Infrastructure or DevOps work

## Rule Categories by Priority

| Priority | Category | Key Checks |
|----------|----------|------------|
| 1 | Accessibility | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels |
| 2 | Touch & Interaction | Min 44×44px touch targets, 8px+ spacing |
| 3 | Performance | WebP/AVIF, Lazy loading, CLS < 0.1 |
| 4 | Style Selection | Match product type, SVG icons, Consistency |
| 5 | Layout & Responsive | Mobile-first, viewport meta, no horizontal scroll |
| 6 | Typography & Color | Base 16px, Line-height 1.5, Semantic colors |
| 7 | Animation | Duration 150–300ms, ease-out enters |
| 8 | Forms & Feedback | Visible labels, error near field |
| 9 | Navigation | Predictable back, bottom nav ≤5 |
| 10 | Charts | Legends, tooltips |

## Quick Reference

### Accessibility (CRITICAL)
- `color-contrast` - Minimum 4.5:1 ratio
- `focus-states` - Visible focus rings
- `alt-text` - Descriptive alt text
- `aria-labels` - For icon-only buttons
- `keyboard-nav` - Tab order matches visual
- `reduced-motion` - Respect prefers-reduced-motion

### Touch & Interaction (CRITICAL)
- `touch-target-size` - Min 44×44pt
- `touch-spacing` - 8px+ gap between targets
- `loading-buttons` - Disable during async
- `error-feedback` - Clear error messages near problem

### Performance (HIGH)
- `image-optimization` - WebP/AVIF, lazy load
- `image-dimension` - Prevent layout shift
- `font-loading` - Use font-display: swap
- `lazy-loading` - Dynamic imports
- `virtualize-lists` - Virtualize 50+ items

### Style Selection (HIGH)
- `style-match` - Match style to product type
- `no-emoji-icons` - Use SVG icons
- `color-palette-from-product` - Industry-appropriate
- `state-clarity` - Hover/pressed/disabled distinct

### Layout & Responsive (HIGH)
- `viewport-meta` - width=device-width, initial-scale=1
- `mobile-first` - Design mobile first
- `breakpoint-consistency` - Systematic breakpoints
- `readable-font-size` - Min 16px body

### Typography & Color (MEDIUM)
- `line-height` - Use 1.5-1.75 for body
- `font-pairing` - Match heading/body personalities
- `color-semantic` - Use tokens, not raw hex
- `color-dark-mode` - Desaturated tonal variants

### Animation (MEDIUM)
- `duration-timing` - 150–300ms micro-interactions
- `transform-performance` - Use transform/opacity only
- `easing` - ease-out for entering, ease-in for exiting
- `motion-meaning` - Cause-effect, not decorative

### Forms & Feedback (MEDIUM)
- `input-labels` - Visible label per input
- `error-placement` - Show error below field
- `submit-feedback` - Loading then success/error
- `inline-validation` - Validate on blur

## Design System Recommendations

For color palettes, typography pairings, and style guidelines, use domain-specific searches:
- `--domain color` for color systems
- `--domain typography` for fonts
- `--domain style` for design styles
- `--domain ux` for UX guidelines
- `--domain layout` for layout patterns
- `--domain chart` for chart types