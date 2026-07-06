/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
              "on-secondary-fixed": "#002113",
              "surface-container-lowest": "#060e20",
              "on-tertiary-fixed-variant": "#2f2ebe",
              "on-background": "#dae2fd",
              "background": "#0b1326",
              "surface-dim": "#0b1326",
              "secondary-fixed-dim": "#4edea3",
              "primary-container": "#4b8eff",
              "surface-container-highest": "#2d3449",
              "on-secondary-fixed-variant": "#005236",
              "outline": "#8b90a0",
              "tertiary-container": "#8083ff",
              "outline-variant": "#414755",
              "tertiary-fixed-dim": "#c0c1ff",
              "tertiary-fixed": "#e1e0ff",
              "secondary-fixed": "#6ffbbe",
              "surface-container-low": "#131b2e",
              "secondary": "#4edea3",
              "on-primary-fixed": "#001a41",
              "on-primary": "#002e69",
              "tertiary": "#c0c1ff",
              "surface-tint": "#adc6ff",
              "on-tertiary-container": "#0d0096",
              "on-surface-variant": "#c1c6d7",
              "surface-container": "#171f33",
              "surface": "#0b1326",
              "on-secondary-container": "#00311f",
              "inverse-on-surface": "#283044",
              "inverse-surface": "#dae2fd",
              "secondary-container": "#00a572",
              "error-container": "#93000a",
              "on-primary-container": "#00285c",
              "inverse-primary": "#005bc1",
              "surface-bright": "#31394d",
              "on-tertiary": "#1000a9",
              "on-secondary": "#003824",
              "primary-fixed-dim": "#adc6ff",
              "error": "#ffb4ab",
              "surface-variant": "#2d3449",
              "primary": "#adc6ff",
              "surface-container-high": "#222a3d",
              "on-error": "#690005",
              "on-surface": "#dae2fd",
              "primary-fixed": "#d8e2ff",
              "on-tertiary-fixed": "#07006c",
              "on-primary-fixed-variant": "#004493",
              "on-error-container": "#ffdad6"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "container-max": "1440px",
              "sidebar-collapsed": "80px",
              "sidebar-width": "260px",
              "gutter": "24px",
              "margin-mobile": "16px",
              "margin-desktop": "32px"
      },
      "fontFamily": {
              "display-lg": [
                      "Inter"
              ],
              "label-sm": [
                      "Inter"
              ],
              "body-md": [
                      "Inter"
              ],
              "headline-lg-mobile": [
                      "Inter"
              ],
              "headline-lg": [
                      "Inter"
              ],
              "label-mono": [
                      "JetBrains Mono"
              ]
      },
      "fontSize": {
              "display-lg": [
                      "48px",
                      {
                              "lineHeight": "1.2",
                              "letterSpacing": "-0.02em",
                              "fontWeight": "700"
                      }
              ],
              "label-sm": [
                      "11px",
                      {
                              "lineHeight": "1",
                              "fontWeight": "600"
                      }
              ],
              "body-md": [
                      "16px",
                      {
                              "lineHeight": "1.6",
                              "fontWeight": "400"
                      }
              ],
              "headline-lg-mobile": [
                      "24px",
                      {
                              "lineHeight": "1.3",
                              "fontWeight": "600"
                      }
              ],
              "headline-lg": [
                      "32px",
                      {
                              "lineHeight": "1.3",
                              "fontWeight": "600"
                      }
              ],
              "label-mono": [
                      "12px",
                      {
                              "lineHeight": "1.4",
                              "letterSpacing": "0.05em",
                              "fontWeight": "500"
                      }
              ]
      }
    },
  },
  plugins: [],
}
