import typography from '@tailwindcss/typography';
import preset from '@learnspace/config/tailwind';
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  presets: [preset as Config],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
