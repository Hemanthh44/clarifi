/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── Clean Green / Emerald Brand Palette ──────────────
        brand: {
          berry: "#047857", // signature rich emerald green
          berryDark: "#065F46", // deep forest emerald
          berryDeep: "#064E3B",
          rose: "#10B981", // vibrant mint emerald
          roseLight: "#ECFDF5", // soft mint wash pill background
          roseBorder: "#D1FAE5", // soft mint border
          coral: "#34D399",
        },
        bg: {
          DEFAULT: "#FFFFFF", // crisp pure white
          soft: "#F8FAF9", // soft mint-gray tint
          secondary: "#F0FDF4",
          card: "#FFFFFF",
          pill: "#ECFDF5",
          warm: "#F8FAF9",
          deep: "#E6F4EA",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          elevated: "#F8FAF9",
          muted: "#F0FDF4",
          glass: "rgba(255, 255, 255, 0.85)",
          dark: "#181A2A", // deep midnight navy
        },
        border: {
          DEFAULT: "#EDE7EB",
          soft: "#E6F4EA",
          strong: "#A7F3D0",
          hairline: "#EAE4E8",
          berry: "#D1FAE5",
        },
        // ── Text Hierarchy (High Contrast & Legible) ─────────
        text: {
          primary: "#181A2A", // crisp midnight navy / near-black
          secondary: "#52586B", // balanced slate
          muted: "#7E8597", // soft tertiary slate
          inverse: "#FFFFFF",
          berry: "#047857",
        },
        // ── Signature Green / Emerald Accent System ──────────
        accent: {
          DEFAULT: "#047857",
          berry: "#047857",
          rose: "#10B981",
          magenta: "#059669",
          orange: "#34D399",
          coral: "#059669",
          red: "#10B981",
          soft: "rgba(4, 120, 87, 0.08)",
          glow: "rgba(4, 120, 87, 0.25)",
          strong: "#065F46",
          deep: "#064E3B",
          // backward compatibility aliases
          mint: "#047857",
          mintSoft: "rgba(4, 120, 87, 0.08)",
          cyan: "#059669",
          cyanSoft: "rgba(4, 120, 87, 0.08)",
        },
        positive: "#059669", // emerald green
        warning: "#D97706", // warm amber
        danger: "#E11D48", // rose crimson
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "'Outfit'", "'Inter'", "-apple-system", "sans-serif"],
        serif: ["'Plus Jakarta Sans'", "'Outfit'", "sans-serif"], // maps serif to geometric display sans
        sans: ["'Plus Jakarta Sans'", "'Inter'", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        "sunset-gradient": "linear-gradient(135deg, #047857 0%, #059669 45%, #10B981 75%, #34D399 100%)",
        "berry-gradient": "linear-gradient(135deg, #047857 0%, #059669 45%, #10B981 75%, #34D399 100%)",
        "sunset-sheen": "linear-gradient(135deg, #059669 0%, #10B981 60%, #34D399 100%)",
        "dark-sheen": "linear-gradient(180deg, #24263A 0%, #181A2A 100%)",
        "emerald-sheen": "linear-gradient(135deg, #181A2A 0%, #2A2D44 100%)",
        "glass-edge": "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0))",
        "navy-fade": "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,249,0.98))",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(24,26,42,0.03), 0 6px 16px -2px rgba(4,120,87,0.04)",
        editorial: "0 2px 4px rgba(24,26,42,0.02), 0 12px 32px -4px rgba(4,120,87,0.05)",
        "editorial-lg": "0 4px 6px rgba(24,26,42,0.03), 0 20px 48px -8px rgba(4,120,87,0.08)",
        darkBox: "0 14px 40px -10px rgba(24,26,42,0.32)",
        glowSoft: "0 12px 30px -10px rgba(4,120,87,0.30)",
        glow: "0 0 0 1px rgba(4,120,87,0.20), 0 18px 40px -12px rgba(4,120,87,0.30)",
        panel: "0 1px 3px rgba(24,26,42,0.04)",
        lift: "0 20px 40px -16px rgba(4,120,87,0.12)",
      },
      keyframes: {
        pulseLine: {
          "0%, 100%": { strokeOpacity: 0.25 },
          "50%": { strokeOpacity: 0.9 },
        },
        floatNode: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        rise: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowDrift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.85" },
          "50%": { transform: "translate3d(-3%, 2%, 0) scale(1.06)", opacity: "0.95" },
        },
        tickSway: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(3.5deg)" },
        },
      },
      animation: {
        pulseLine: "pulseLine 2.8s ease-in-out infinite",
        floatNode: "floatNode 5s ease-in-out infinite",
        rise: "rise .4s ease-out both",
        shimmer: "shimmer 2.2s linear infinite",
        glow: "glowDrift 16s ease-in-out infinite",
        tickSway: "tickSway 8s ease-in-out infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
