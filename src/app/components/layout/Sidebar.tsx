'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Box,
  Toolbar,
  useMediaQuery,
  Typography,
  Chip,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Sell as DiscountIcon,
  FitnessCenter as FitnessCenterIcon,
  CardMembership as CardMembershipIcon,
  SportsMartialArts as StaffIcon,
  CalendarMonth as CalendarIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import ListItemButton from '@mui/material/ListItemButton';
import { SessionData, UserRole } from '@/app/types';

const drawerWidth = 280;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  badge?: string | number;
  disabled?: boolean;
  children?: MenuItem[];
}

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  session: SessionData;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mobileOpen, 
  handleDrawerToggle, 
  session 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Menü öğelerini tanımla
  const getMenuItems = (): MenuItem[] => {
    const allMenuItems: MenuItem[] = [
      // Dashboard - Sadece Admin
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        roles: ['admin'],
      },
      
      // Classes - Herkes
      {
        text: 'Classes',
        icon: <FitnessCenterIcon />,
        path: '/classes',
        roles: ['admin', 'trainer', 'staff'],
      },
      
      // My Schedule - Trainer ve Staff
      {
        text: 'My Schedule',
        icon: <ScheduleIcon />,
        path: '/my-schedule',
        roles: ['trainer', 'staff'],
      },
      
      // Divider sonrası admin-only sections
      {
        text: 'divider',
        icon: null,
        path: '',
        roles: ['admin'],
      },
      
      // Members Management - Sadece Admin
      {
        text: 'Members',
        icon: <SchoolIcon />,
        path: '/members',
        roles: ['admin'],
        badge: 'New',
      },
      
      // Staff Management - Sadece Admin
      {
        text: 'Staff',
        icon: <StaffIcon />,
        path: '/staff',
        roles: ['admin'],
      },
      
      // Memberships - Sadece Admin
      {
        text: 'Memberships',
        icon: <CardMembershipIcon />,
        path: '/memberships',
        roles: ['admin'],
      },
      
      // Discounts - Sadece Admin
      {
        text: 'Discounts',
        icon: <DiscountIcon />,
        path: '/discounts',
        roles: ['admin'],
      },
    ];

    // Kullanıcının rolüne göre menü öğelerini filtrele
    return allMenuItems.filter(item => 
      item.roles.includes(session.role)
    );
  };

  const menuItems = getMenuItems();

  const handleNavigation = (path: string, disabled?: boolean) => {
    if (disabled) return;
    
    router.push(path);
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  const isItemActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path) && path !== '';
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Toolbar sx={{ 
        justifyContent: 'center', 
        py: 3, 
        px: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: 20,
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '0.5px',
              mb: 1,
            }}
          >
            PACIFIC MMA
          </Typography>
          <Chip
            label="Admin Panel"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ 
              fontSize: '0.7rem',
              fontWeight: 600,
              height: 20,
            }}
          />
        </Box>
      </Toolbar>

      {/* User Info */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {session.fullName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session.fullName}
            </Typography>
            <Chip
              label={session.role.toUpperCase()}
              size="small"
              color={session.role === 'admin' ? 'primary' : 'secondary'}
              variant="filled"
              sx={{ 
                height: 18, 
                fontSize: '0.65rem',
                fontWeight: 700,
                mt: 0.5,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ overflow: 'auto', flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item, index) => {
            // Divider göster
            if (item.text === 'divider') {
              return (
                <Box key={index} sx={{ my: 2 }}>
                  <Divider />
                  <Typography
                    variant="overline"
                    sx={{
                      px: 2,
                      py: 1,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      letterSpacing: '0.5px',
                      display: 'block',
                    }}
                  >
                    Management
                  </Typography>
                </Box>
              );
            }

            const isActive = isItemActive(item.path);
            const isDisabled = item.disabled;

            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigation(item.path, isDisabled)}
                  disabled={isDisabled}
                  sx={{
                    borderRadius: 2,
                    minHeight: 48,
                    px: 2,
                    py: 1.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiChip-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'primary.contrastText',
                      },
                    },
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      justifyContent: 'center',
                      color: isActive ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        ml: 1,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        textAlign: 'center',
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          © 2025 Pacific MMA
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;