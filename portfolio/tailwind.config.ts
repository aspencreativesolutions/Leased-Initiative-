import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        archive: "0.12em",
      },
    },
  },
  plugins: [],
};

export default config;
