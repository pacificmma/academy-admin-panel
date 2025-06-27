import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Pacific MMA colors - Updated
        primary: {
          50: '#f0f8fa',
          100: '#daeef4',
          200: '#b9dde9',
          300: '#8ac8d9',
          400: '#5aafca',
          500: '#3587a7',
          600: '#2e6f8c',
          700: '#275a73',
          800: '#1f485a',
          900: '#004D61', // Main brand color
        },
        // Secondary colors - Complementary tones
        secondary: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#ebe7de',
          300: '#ddd6ca',
          400: '#ccc2b0',
          500: '#b8ab94',
          600: '#a39278',
          700: '#8b7862',
          800: '#736251',
          900: '#5d4f42',
        },
        // Status colors - Muted to match aesthetic
        error: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#7f1d1d',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#78350f',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        // Background colors - Updated to match image
        background: {
          default: '#EDEAE0', // Main background color from image
          paper: '#FFFFFF',    // Card backgrounds
          light: '#F5F3EE',    // Lighter variant
          dark: '#E0DDD3',     // Darker variant
          muted: '#F8F6F1',    // Very subtle background
        },
        // Text colors - High contrast for readability
        text: {
          primary: '#1A1A1A',     // Almost black for headers
          secondary: '#374151',    // Dark gray for body text
          muted: '#6B7280',       // Muted gray for less important text
          light: '#9CA3AF',       // Light gray for placeholders
        },
        // Border colors
        border: {
          light: '#E5E7EB',
          medium: '#D1D5DB',
          dark: '#9CA3AF',
        }
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)',
        'sharp': '0 2px 8px 0 rgba(0, 77, 97, 0.12)', // Sharp shadow with brand color
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',   // 2px - Very minimal rounding
        'DEFAULT': '0.25rem', // 4px - Default minimal rounding
        'md': '0.375rem',   // 6px - Slightly more rounded
        'lg': '0.5rem',     // 8px - Medium rounding
        'xl': '0.75rem',    // 12px - Larger rounding
        '2xl': '1rem',      // 16px - Large rounding
        '3xl': '1.5rem',    // 24px - Very large rounding
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [],
};

export default config;