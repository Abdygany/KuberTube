import type { Config } from "tailwindcss";
import preset from "@kubertube/config/tailwind";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [preset as Partial<Config>],
} satisfies Config;
