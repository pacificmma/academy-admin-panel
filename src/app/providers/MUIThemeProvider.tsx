// src/app/components/providers/MUIThemeProvider.tsx
'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

// Pacific MMA Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#004D61', // Pacific MMA brand color
      light: '#2e6f8c',
      dark: '#003a4a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b8ab94',
      light: '#ccc2b0',
      dark: '#8b7862',
      contrastText: '#000000',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#991b1b',
    },
    warning: {
      main: '#d97706',
      light: '#fbbf24',
      dark: '#92400e',
    },
    info: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1e40af',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#15803d',
    },
    background: {
      default: '#EDEAE0', // Pacific MMA background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#374151',
    },
    grey: {
      50: '#F7F7F7',
      100: '#EDEAE0',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#1A1A1A',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1A1A1A',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1A1A1A',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1A1A1A',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1A1A1A',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1A1A1A',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1A1A1A',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#374151',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      color: '#4B5563',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          boxShadow: 'none',
          padding: '10px 20px',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 77, 97, 0.15)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 77, 97, 0.25)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderWidth: '2px',
              borderColor: '#D1D5DB',
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#004D61',
              borderWidth: '2px',
            },
            '&.Mui-error fieldset': {
              borderColor: '#dc2626',
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 600,
            color: '#1A1A1A',
            '&.Mui-focused': {
              color: '#004D61',
            },
            '&.Mui-error': {
              color: '#dc2626',
            },
          },
          '& .MuiInputBase-input': {
            padding: '14px 16px',
            fontSize: '1rem',
            fontWeight: 500,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
          border: '1px solid #E5E7EB',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
          },
          transition: 'box-shadow 0.2s ease-in-out',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
          borderBottom: '1px solid #E5E7EB',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#7f1d1d',
          border: '1px solid #fecaca',
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#78350f',
          border: '1px solid #fed7aa',
        },
        standardInfo: {
          backgroundColor: '#eff6ff',
          color: '#1e3a8a',
          border: '1px solid #bfdbfe',
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#14532d',
          border: '1px solid #bbf7d0',
        },
      },
    },
  },
});

interface MUIThemeProviderProps {
  children: React.ReactNode;
}

export default function MUIThemeProvider({ children }: MUIThemeProviderProps) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}