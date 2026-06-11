---
version: "1.0"
name: Citadel Design System
description: Zero-trust corporate treasury platform. Dark canvas with emerald trust indicators, financial data density, and security-first UI patterns.
---

# Citadel Design System

## Brand Identity

**Tagline:** Corporate treasury, zero trust by default.

**Visual Metaphor:** A vault — dark, secure, precise. Emerald accents indicate trust and approval. Red indicates blockage and risk. The UI should feel like a Bloomberg Terminal meets a security dashboard.

## Color Palette

### Canvas & Background
```css
--canvas:           #0a0a0f     /* Main background — near-black */
--canvas-elevated:  #111118     /* Card backgrounds */
--canvas-overlay:   #1a1a24     /* Modal/overlay backgrounds */
--canvas-grid:      rgba(255,255,255,0.03)  /* Subtle grid pattern */
```

### Brand Colors
```css
--brand-primary:    #10b981     /* Emerald — trust, approval, success */
--brand-primary-soft: #059669   /* Softer emerald for hover states */
--brand-glow:       rgba(16,185,129,0.15)  /* Emerald glow effect */
--brand-gradient:   linear-gradient(135deg, #10b981, #059669)
```

### Semantic Colors
```css
--trust-elite:      #10b981     /* 80-100 trust score */
--trust-trusted:    #22c55e     /* 60-79 trust score */
--trust-standard:   #eab308     /* 40-59 trust score */
--trust-restricted: #ef4444     /* 0-39 trust score */

--status-approved:  #10b981     /* Venice AI approved */
--status-blocked:   #ef4444     /* Venice AI blocked */
--status-pending:   #f59e0b     /* Awaiting review */
--status-active:    #3b82f6     /* Agent running */

--risk-low:         #10b981
--risk-medium:      #f59e0b
--risk-high:        #ef4444
--risk-critical:    #dc2626
```

### Text Colors
```css
--text-primary:     #f2f2f2     /* Main headings */
--text-secondary:   #a1a1aa     /* Body text */
--text-tertiary:    #71717a     /* Captions, labels */
--text-muted:       #52525b     /* Disabled text */
```

### Border Colors
```css
--border-default:   #27272a     /* Standard borders */
--border-subtle:    #1e1e22     /* Subtle dividers */
--border-emerald:   rgba(16,185,129,0.3)  /* Active/focus borders */
```

## Typography

### Font Stack
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
```

### Type Scale
```css
--text-display:     3rem (48px)    /* Hero headlines */
--text-h1:          1.875rem (30px) /* Page titles */
--text-h2:          1.5rem (24px)   /* Section headers */
--text-h3:          1.25rem (20px)  /* Card titles */
--text-body:        1rem (16px)     /* Body text */
--text-sm:          0.875rem (14px) /* Captions */
--text-xs:          0.75rem (12px)  /* Labels, badges */
--text-mono:        0.8125rem (13px) /* Code, addresses */
```

### Font Weights
```css
--font-bold:        700
--font-semibold:    600
--font-medium:      500
--font-normal:      400
```

## Spacing

```css
--space-1:  0.25rem  /* 4px */
--space-2:  0.5rem   /* 8px */
--space-3:  0.75rem  /* 12px */
--space-4:  1rem     /* 16px */
--space-5:  1.25rem  /* 20px */
--space-6:  1.5rem   /* 24px */
--space-8:  2rem     /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
```

## Border Radius

```css
--radius-sm:  0.375rem  /* 6px — badges, small elements */
--radius-md:  0.5rem    /* 8px — buttons, inputs */
--radius-lg:  0.75rem   /* 12px — cards */
--radius-xl:  1rem      /* 16px — modals */
--radius-full: 9999px   /* Pills, avatars */
```

## Shadows & Effects

```css
--shadow-sm:   0 1px 2px rgba(0,0,0,0.3)
--shadow-md:   0 4px 6px rgba(0,0,0,0.4)
--shadow-lg:   0 10px 15px rgba(0,0,0,0.5)
--shadow-glow: 0 0 20px rgba(16,185,129,0.15)  /* Emerald glow */

--backdrop-blur: blur(12px)
```

## Component Patterns

### Cards
- Background: `--canvas-elevated`
- Border: 1px solid `--border-default`
- Border-radius: `--radius-lg`
- Padding: `--space-6`
- Hover: border color transitions to `--border-emerald`

### Buttons
```css
/* Primary */
background: var(--brand-primary)
color: var(--canvas)
border-radius: var(--radius-md)
font-weight: var(--font-semibold)
padding: var(--space-2) var(--space-4)

/* Secondary */
background: transparent
border: 1px solid var(--border-default)
color: var(--text-primary)

/* Ghost */
background: transparent
color: var(--text-secondary)
```

### Badges
```css
/* Approved */
background: rgba(16,185,129,0.15)
color: #10b981
border: 1px solid rgba(16,185,129,0.3)

/* Blocked */
background: rgba(239,68,68,0.15)
color: #ef4444
border: 1px solid rgba(239,68,68,0.3)

/* Pending */
background: rgba(245,158,11,0.15)
color: #f59e0b
border: 1px solid rgba(245,158,11,0.3)
```

### Data Tables
- Zebra striping with subtle `--canvas-elevated` rows
- Monospace for addresses, amounts, tx hashes
- Right-align numeric columns
- Sticky headers with `--canvas` background

### Trust Score Display
```css
/* Circular progress indicator */
--trust-ring: 4px solid var(--trust-color)
--trust-bg: rgba(255,255,255,0.05)

/* Color mapping */
80-100: var(--trust-elite)    /* Green */
60-79:  var(--trust-trusted)  /* Light green */
40-59:  var(--trust-standard) /* Yellow */
0-39:   var(--trust-restricted) /* Red */
```

## Layout Principles

### Grid System
- Max width: 1280px (7xl)
- Padding: 24px (mobile), 32px (tablet), 48px (desktop)
- Gap: 16px (cards), 24px (sections)

### Sidebar
- Width: 256px (fixed)
- Background: `--canvas`
- Border-right: 1px solid `--border-default`
- Logo + nav items + footer

### Header
- Height: 64px (fixed)
- Background: `--canvas` with backdrop blur
- Border-bottom: 1px solid `--border-default`

## Animation

```css
--transition-fast:   150ms ease
--transition-normal: 200ms ease
--transition-slow:   300ms ease

/* Framer Motion presets */
--spring-stiff: stiffness: 350, damping: 30
--spring-smooth: stiffness: 200, damping: 20
```

## Iconography

- Library: Lucide React
- Size: 16px (inline), 20px (buttons), 24px (headers)
- Color: inherit from text color
- Stroke width: 2px

## Security UI Patterns

### Permission Cards
- Show scope, limits, expiry prominently
- Green border for active, red for expired
- Clock icon for time-limited permissions

### Audit Trail
- Timeline layout with vertical line
- Green dots for approved, red for blocked
- Expandable reasoning sections

### Agent Status
- Pulse animation for running agents
- Trust score badge prominently displayed
- Budget bar with color-coded thresholds

## Responsive Breakpoints

```css
--bp-sm:  640px   /* Mobile landscape */
--bp-md:  768px   /* Tablet */
--bp-lg:  1024px  /* Desktop */
--bp-xl:  1280px  /* Large desktop */
--bp-2xl: 1536px  /* Ultra-wide */
```

## Accessibility

- Minimum contrast ratio: 4.5:1 (text), 3:1 (large text)
- Focus indicators: 2px solid `--brand-primary`
- Reduced motion: respect `prefers-reduced-motion`
- Screen reader: proper ARIA labels on all interactive elements

## Do's and Don'ts

### Do
- Use emerald ONLY for trust/approval/success states
- Keep data density high — this is a financial dashboard
- Use monospace for addresses, amounts, hashes
- Show confidence percentages for AI decisions
- Use subtle animations for state changes

### Don't
- Use emerald for decorative purposes
- Overuse animations — keep it professional
- Hide security information behind clicks
- Use bright colors for backgrounds
- Mix more than 2 accent colors
