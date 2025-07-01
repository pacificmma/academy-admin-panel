// eslint.config.js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Flat config dizisini export ediyoruz
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Ekstra kural ve ayarları burada belirtebilirsin:
  {
    // Proje kökündeki tüm ts/js dosyalarını lintle
    files: ["**/*.{js,ts,jsx,tsx}"],
    rules: {
      // no-explicit-any kuralını kapatmak istersen:
      "@typescript-eslint/no-explicit-any": "off",
      // unused-vars kuralını kapatmak istersen:
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
