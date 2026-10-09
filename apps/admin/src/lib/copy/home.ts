export const ADMIN_HOME_COPY = {
  pageTitle: "Home",
  rangeLabel: "Last 7 days",
  sampleLabel: "Sample",
  sampleNote:
    "Sample until GA4, PostHog, and request counts are connected.",
  subtitle: "Here’s the week across leads, products, and customizations.",
  pakAiTitle: "Work with PakAI",
  pakAiLabel: "Message PakAI",
  recents: "Recents",
  addAction: "Add",
  voiceAction: "Voice",
  comingSoon: "Coming Soon",
  viewReport: "View report",
  generatingStatus: "PakAI is building your dashboard…",
  assemblingWidgets: "Assembling widgets…",
  generatedForPrefix: "Generated for:",
  showHomeInsights: "Show home insights",
  pills: [
    { id: "performance", label: "My this month performance" },
    { id: "leads", label: "Review new leads" },
    { id: "products", label: "Popular products" },
  ],
} as const;

export type AdminHomePillId = (typeof ADMIN_HOME_COPY.pills)[number]["id"];
