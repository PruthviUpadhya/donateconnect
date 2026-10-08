export const Colors = {
  // Shadcn-style Clean Light Foundation
  background: "#ffffff",
  surface: "#f8fafc", // slate-50
  card: "#ffffff",
  cardBorder: "#e2e8f0", // slate-200
  cardBorderHover: "#cbd5e1", // slate-300

  // Primary & Accent Brand Colors
  primary: "#0f172a", // slate-900 (clean bold minimal primary)
  primaryLight: "#334155", // slate-700
  primaryDark: "#020617", // slate-950
  primaryContrast: "#ffffff",

  accentIndigo: "#4f46e5", // Indigo-600
  accentRose: "#e11d48", // Rose-600
  accentEmerald: "#16a34a", // Emerald-600
  accentAmber: "#d97706", // Amber-600
  accentBlue: "#2563eb", // Blue-600

  // Status Colors (clean light pastel badges with crisp border and text)
  status: {
    pending: { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
    approved: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    assigned: { bg: "#e0e7ff", text: "#4338ca", border: "#c7d2fe" },
    pickedUp: { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    delivered: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
    rejected: { bg: "#ffe4e6", text: "#be123c", border: "#fecdd3" },
    cancelled: { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
  },

  // Typography
  textPrimary: "#0f172a", // slate-900
  textSecondary: "#475569", // slate-600
  textMuted: "#64748b", // slate-500
  textDark: "#020617",

  // Input & Interactive (shadcn clean styling)
  inputBg: "#ffffff",
  inputBorder: "#e2e8f0",
  inputFocusBorder: "#0f172a",
  buttonText: "#ffffff",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Typography = {
  titleLarge: { fontSize: 26, fontWeight: "700" as const, color: Colors.textPrimary, letterSpacing: -0.5 },
  titleMedium: { fontSize: 18, fontWeight: "600" as const, color: Colors.textPrimary, letterSpacing: -0.3 },
  titleSmall: { fontSize: 15, fontWeight: "600" as const, color: Colors.textPrimary },
  body: { fontSize: 14, fontWeight: "400" as const, color: Colors.textSecondary, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: "500" as const, color: Colors.textMuted },
  badge: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.2 },
};
