import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "semear-green": "#174A37",
        "semear-green-soft": "#DDE9DF",
        "semear-offwhite": "#F7F4EC",
        "semear-gray": "#E7E5DF",
        "semear-earth": "#B8792C",
        "semear-yellow": "#E4B84E"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 74, 55, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
