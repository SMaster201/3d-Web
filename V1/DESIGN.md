---
name: Synthetic Intelligence Guardian
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8b90a0'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#4b8eff'
  on-primary-container: '#00285c'
  inverse-primary: '#005bc1'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#8083ff'
  on-tertiary-container: '#0d0096'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 260px
  sidebar-collapsed: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is engineered for high-stakes AI monitoring and digital forensics. It evokes an "AI Lab" aesthetic—precise, authoritative, and sophisticated. The personality is hyper-modern and vigilant, prioritizing data clarity while maintaining a futuristic cybersecurity edge.

The visual style utilizes **Glassmorphism** and **Corporate/Modern** elements. It features deep, layered backgrounds that provide a sense of infinite digital space, overlaid with translucent, high-tech surfaces. The interface should feel like a premium command center: dark, immersive, and highly responsive. Emphasis is placed on real-time feedback loops and technical precision.

## Colors

The palette is anchored in a "Deep Space" foundation to minimize eye strain during long monitoring sessions.

- **Primary (AI Blue):** Used for interactive states, primary actions, and active scan indicators.
- **Secondary (Success Green):** Reserved for "Verified Human" status, healthy system pings, and successful detections.
- **Background Stack:** The primary background is `#0F172A`. Elevated surfaces use semi-transparent variations of `#1E293B` to allow background blurs to bleed through.
- **Accents:** High-vibrancy reds and ambers are used sparingly to highlight anomalies or system failures.

## Typography

The system uses **Inter** for its neutral, highly legible character, ensuring that dense data remains accessible. For technical strings, timestamps, and metadata, **JetBrains Mono** is introduced to reinforce the developer-centric, "AI Lab" feel.

Headlines should use tighter letter spacing for a more compact, assertive look. Labels and metadata should utilize all-caps and increased tracking (letter spacing) when using the monospace font to ensure distinct hierarchy against body text.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a fixed-width collapsible sidebar. The main viewport is designed to be the focal point, expanding to fill available space to maximize the visibility of high-resolution video and image feeds.

- **Grid:** A 12-column grid is used for the main content area.
- **Sidebars:** Utilize a semi-transparent glass panel fixed to the left.
- **Viewports:** Video containers should maintain a 16:9 or 4:3 aspect ratio and utilize `object-fit: cover` to fill their allocated slots.
- **Responsive:** On tablet, the sidebar collapses to icons only. On mobile, the sidebar becomes a bottom navigation bar or a hidden drawer, and the 12-column grid collapses to a single column.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and subtle **Tonal Layers**. Instead of traditional heavy shadows, this design system uses:

- **Backdrop Blurs:** Surfaces use a 12px to 20px Gaussian blur with a 60% opacity fill.
- **Inner Glows:** A 1px subtle top-border (white with 10% opacity) simulates a light source hitting the edge of a glass pane.
- **Shadows:** Only used for floating modals, utilizing a large, 40px spread with very low opacity (15%) tinted with the Primary Blue color.
- **Borders:** Low-contrast borders (`#334155`) define shapes without breaking the dark-mode immersion.

## Shapes

The design system employs a **Rounded** (0.5rem base) corner radius to soften the technical nature of the data and make the interface feel modern and premium. 

- **Cards/Panels:** Use `rounded-lg` (1rem) for major containers like the video viewport or data modules.
- **Buttons/Inputs:** Use the base `rounded` (0.5rem) for a sleek, standard feel.
- **Status Indicators:** Always use 100% border-radius (perfect circles) for status dots to ensure they are instantly recognizable as "lights."

## Components

### Buttons
Primary buttons use a solid AI Blue fill with white text. Secondary buttons use a glass background with a subtle border. All buttons should have a 200ms transition on hover, slightly increasing the backdrop blur or brightness.

### Glass Sidebar
The sidebar is a full-height blur panel. Active navigation items are indicated by a vertical 4px bar on the left edge in AI Blue and a subtle background tint. Icons should be "Line" style with a 1.5px stroke width.

### Video Viewport
A heavy container with an inner shadow to create a "recessed" feel. Controls are overlaid at the bottom using a gradient scrim for legibility.

### Status Indicators
Small 8px circles.
- `Online/Safe`: Secondary Green with a subtle outer pulse animation.
- `Anomaly Detected`: Status Error Red with a steady glow.
- `Processing`: AI Blue with a rotating dashed border.

### Data Cards
Modular units with `rounded-lg` corners. Headers inside cards should use the `label-mono` typography for a technical data-readout appearance.

### Input Fields
Dark backgrounds (`#1E293B`) with a 1px border that glows AI Blue on focus. Use JetBrains Mono for the input text to emphasize data entry precision.