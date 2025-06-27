// src/app/components/layout/Layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SessionData } from '@/app/types';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
  session: SessionData;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  session,
  title 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(prev => !prev);
  };

  // If no session, show error
  if (!session) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <h1>No session data available</h1>
        <p>Please refresh the page or log in again.</p>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        session={session}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Navigation Bar */}
        <Topbar
          handleDrawerToggle={handleDrawerToggle}
          session={session}
          title={title}
        />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            pt: { xs: '64px', sm: '72px' }, // Topbar height offset
            backgroundColor: 'background.default',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;