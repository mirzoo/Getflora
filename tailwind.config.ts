import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        gf: {
          text: {
            primary: "var(--gf-text-primary)",
            secondary: "var(--gf-text-secondary)",
            tertiary: "var(--gf-text-tertiary)",
            action: "var(--gf-text-action)",
            "action-hover": "var(--gf-text-action-hover)",
            positive: "var(--gf-text-positive)",
            negative: "var(--gf-text-negative)",
            "on-accent": "var(--gf-text-primary-on-accent)",
          },
          bg: {
            base: "var(--gf-bg-base)",
            alt: "var(--gf-bg-base-alt)",
            accent: "var(--gf-bg-accent)",
            "accent-hover": "var(--gf-bg-accent-hover)",
            "accent-opposite": "var(--gf-bg-accent-opposite)",
          },
          border: {
            DEFAULT: "var(--gf-border-normal)",
            hover: "var(--gf-border-hover)",
          },
          status: {
            negative: "var(--gf-status-negative)",
            positive: "var(--gf-status-positive)",
            info: "var(--gf-status-info)",
            warning: "var(--gf-status-warning)",
            neutral: "var(--gf-status-neutral)",
          },
          neutral: {
            headings: "var(--gf-neutral-headings)",
            dark: "var(--gf-neutral-dark)",
            "dark-2": "var(--gf-neutral-dark-2)",
          },
        },
      },
      fontSize: {
        "gf-h1": ["var(--gf-text-h1)", { lineHeight: "var(--gf-leading-h1)", fontWeight: "700" }],
        "gf-h2": ["var(--gf-text-h2)", { lineHeight: "var(--gf-leading-h2)", fontWeight: "700" }],
        "gf-h3": ["var(--gf-text-h3)", { lineHeight: "var(--gf-leading-h3)", fontWeight: "700" }],
        "gf-h4": ["var(--gf-text-h4)", { lineHeight: "var(--gf-leading-h4)", fontWeight: "700" }],
        "gf-h5": ["var(--gf-text-h5)", { lineHeight: "var(--gf-leading-h5)", fontWeight: "600" }],
        "gf-h6": ["var(--gf-text-h6)", { lineHeight: "var(--gf-leading-h6)", fontWeight: "600" }],
        "gf-body-l": ["var(--gf-text-body-l)", { lineHeight: "var(--gf-leading-body-l)" }],
        "gf-body-m": ["var(--gf-text-body-m)", { lineHeight: "var(--gf-leading-body-m)" }],
        "gf-body-s": ["var(--gf-text-body-s)", { lineHeight: "var(--gf-leading-body-s)" }],
        "gf-body-xs": ["var(--gf-text-body-xs)", { lineHeight: "var(--gf-leading-body-xs)" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
