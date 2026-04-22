---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#45474c'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#00190e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00301e'
  on-tertiary-container: '#00a472'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar_width: 280px
  container_max_width: 1440px
---

## Brand & Style

The brand personality of this design system is rooted in executive precision and effortless authority. It is designed for high-stakes corporate environments where clarity and data integrity are paramount. The aesthetic is **Corporate / Modern**, leaning heavily into **Minimalism** to ensure that administrative complexity is met with visual simplicity. 

The UI should evoke a sense of calm reliability. This is achieved through generous whitespace, a strictly governed color palette, and an "information-first" hierarchy. Every element exists to facilitate a decision or provide a clear status update, removing any decorative "noise" that might distract from the high-end administrative workflow.

## Colors

The color strategy for this design system utilizes deep, stable blues to establish a foundation of trust and professionalism.

- **Primary & Neutral:** The deep corporate blues (#1E293B and #334155) are used for navigation, primary headers, and core text, ensuring high legibility and a sober tone.
- **Accents (Functional):** Color is used purposefully rather than decoratively. **Royal Blue (#3B82F6)** is reserved for Sales and Transactional actions, while **Emerald Green (#10B981)** identifies Income, Purchases, and positive growth.
- **Backgrounds:** A crisp white (#FFFFFF) is used for active surfaces (cards/modals), contrasted against a subtle gray (#F8FAFC) for the application backdrop to reduce eye strain during prolonged use.

## Typography

This design system utilizes **Inter** across all levels to take advantage of its exceptional legibility and neutral, functional character. 

- **Headlines:** Use a tighter letter-spacing and semi-bold weights to create a strong visual anchor for page titles.
- **Body Text:** Standardized at 14px for administrative density, ensuring a large amount of information can be parsed without feeling cramped.
- **Data Display:** For tables and financial figures, ensure the use of tabular num (tnum) OpenType features to keep columns of numbers perfectly aligned for easier comparison.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid hybrid model**. 

- **Navigation:** An elegant, fixed-width sidebar (280px) sits on the left, providing persistent access to high-level modules.
- **Content Area:** A fluid 12-column grid that expands to a maximum of 1440px. Gutters are fixed at 24px (lg) to maintain breathing room between data-heavy cards.
- **Rhythm:** A 4px baseline grid governs all internal padding. Components should use 16px (md) internal padding as a standard, increasing to 24px (lg) for high-level dashboard summaries.

## Elevation & Depth

This design system uses **Ambient Shadows** and **Tonal Layers** to create a sophisticated sense of hierarchy without relying on heavy borders.

- **Level 0 (Background):** #F8FAFC. No shadow.
- **Level 1 (Cards/Tables):** White surface with a very soft, diffused shadow (0px 1px 3px rgba(0,0,0,0.05), 0px 10px 15px -3px rgba(0,0,0,0.03)).
- **Level 2 (Slide-overs/Modals):** High elevation. These use a more pronounced shadow to indicate focus and sit atop a 40% opacity #1E293B overlay.
- **Separators:** Use 1px borders in #E2E8F0 for internal card divisions (like table headers) rather than shadows to maintain a clean, flat aesthetic.

## Shapes

The shape language is **Soft (1)**, utilizing a 0.25rem (4px) base radius. This provides a subtle "friendliness" while maintaining the sharp, professional edges expected in a corporate environment. 

- **Small Components:** Buttons, inputs, and checkboxes use the 4px radius.
- **Large Components:** Cards and the slide-over drawer use a `rounded-lg` (8px) radius to soften the larger surface areas.
- **Interactive States:** Hover states should not change shape, but rather utilize subtle background color shifts to indicate interactivity.

## Components

- **Buttons:** Primary buttons use #1E293B with white text. Secondary buttons are ghost-style with #334155 borders. Transactional buttons use #3B82F6 or #10B981 depending on the financial context.
- **Sidebar:** A dark themed #1E293B sidebar. Active states use a subtle left-border accent in Royal Blue and a low-opacity white background tint for the menu item.
- **Cards:** Clean white containers with 24px padding. Titles are consistently H3 in #1E293B.
- **Tables:** No vertical borders. Use #F8FAFC for the header background. Row heights are generous (56px) to ensure touch-targets and readability are maintained.
- **Slide-overs:** Sophisticated drawers that slide from the right. They occupy 400px - 600px of the screen width and use a white background with a subtle internal border to separate the footer actions from the scrollable body.
- **Inputs:** Minimalist style with a 1px #E2E8F0 border that transitions to #3B82F6 on focus. Labels sit clearly above the input field using `label-sm` styling.