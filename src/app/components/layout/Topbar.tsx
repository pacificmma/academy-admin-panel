// src/app/components/layout/Topbar.tsx
'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
  Chip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import LogoutButton from '../ui/LogoutButton';
import { SessionData } from '@/app/types';

const drawerWidth = 280;

interface TopbarProps {
  handleDrawerToggle: () => void;
  session: SessionData;
  title?: string;
}

const Topbar: React.FC<TopbarProps> = ({ 
  handleDrawerToggle, 
  session,
  title 
}) => {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Breadcrumb oluştur
  const generateBreadcrumbs = () => {
    const pathMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/classes': 'Classes',
      '/my-schedule': 'My Schedule',
      '/members': 'Members',
      '/staff': 'Staff',
      '/memberships': 'Memberships',
      '/discounts': 'Discounts',
      '/analytics': 'Analytics',
      '/settings': 'Settings',
    };

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', href: session.role === 'admin' ? '/dashboard' : '/classes' }
    ];

    let currentPath = '';
    segments.forEach(segment => {
      currentPath += `/${segment}`;
      const label = pathMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        zIndex: theme.zIndex.drawer + 1,
      }}
      elevation={0}
    >
      <Toolbar sx={{ 
        minHeight: { xs: 64, sm: 72 },
        px: { xs: 2, sm: 3 },
        gap: 2,
      }}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Title & Breadcrumbs */}
        <Box sx={{ flexGrow: 1 }}>
          {title ? (
            <Typography 
              variant="h6" 
              noWrap 
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              }}
            >
              {title}
            </Typography>
          ) : (
            <Box>
              <Typography 
                variant="h6" 
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  mb: 0.5,
                }}
              >
                {breadcrumbs[breadcrumbs.length - 1]?.label || 'Pacific MMA'}
              </Typography>
              
              {/* Breadcrumbs - Desktop only */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Breadcrumbs
                  aria-label="breadcrumb"
                  sx={{ 
                    '& .MuiBreadcrumbs-separator': { 
                      color: 'text.secondary',
                      mx: 0.5,
                    },
                  }}
                >
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    
                    if (isLast) {
                      return (
                        <Typography 
                          key={crumb.href}
                          color="text.primary" 
                          variant="body2"
                          sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          {crumb.label}
                        </Typography>
                      );
                    }
                    
                    return (
                      <Link
                        key={crumb.href}
                        underline="hover"
                        color="text.secondary"
                        href={crumb.href}
                        sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          '&:hover': {
                            color: 'primary.main',
                          },
                        }}
                      >
                        {index === 0 ? <HomeIcon sx={{ fontSize: 16 }} /> : crumb.label}
                      </Link>
                    );
                  })}
                </Breadcrumbs>
              </Box>
            </Box>
          )}
        </Box>

        {/* Right Side Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* User Info - Desktop */}
          <Box sx={{ 
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center', 
            gap: 1.5,
            ml: 1,
          }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {session.fullName}
              </Typography>
              <Chip
                label={session.role.toUpperCase()}
                size="small"
                color={session.role === 'admin' ? 'primary' : 'secondary'}
                variant="outlined"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  mt: 0.25,
                }}
              />
            </Box>
            
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {session.fullName.charAt(0).toUpperCase()}
            </Avatar>
          </Box>

          {/* Mobile Avatar */}
          <Box sx={{ 
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
          }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {session.fullName.charAt(0).toUpperCase()}
            </Avatar>
          </Box>

          {/* Logout Button */}
          <LogoutButton 
            variant="outline" 
            size="sm"
            sx={{ 
              ml: 1,
              display: { xs: 'none', sm: 'flex' },
            }}
          />
          
          {/* Mobile Logout - Icon only */}
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <LogoutButton 
              variant="ghost" 
              size="sm"
            >
              {/* Icon only for mobile */}
            </LogoutButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;