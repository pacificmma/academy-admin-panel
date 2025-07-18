// src/app/providers/MUIThemeProvider.tsx - Fixed hydration issues
'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F5C6B',
      light: '#4A90A4',
      dark: '#0A3D47',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6B35',
      light: '#FF8F65',
      dark: '#E55A2B',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626',
      light: '#EF4444',
      dark: '#B91C1C',
    },
    warning: {
      main: '#D97706',
      light: '#F59E0B',
      dark: '#92400E',
    },
    info: {
      main: '#2563EB',
      light: '#3B82F6',
      dark: '#1D4ED8',
    },
    success: {
      main: '#059669',
      light: '#10B981',
      dark: '#047857',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1F2937',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1F2937',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1F2937',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#4B5563',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      color: '#6B7280',
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
          minHeight: '40px',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(15, 92, 107, 0.15)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 8px rgba(15, 92, 107, 0.25)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          minHeight: '32px',
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: '12px 24px',
          minHeight: '48px',
          fontSize: '1.125rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
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
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

interface MUIThemeProviderProps {
  children: React.ReactNode;
}

// NoSSR component to prevent hydration issues
function NoSSR({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

export default function MUIThemeProvider({ children }: MUIThemeProviderProps) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NoSSR>
          {children}
        </NoSSR>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}