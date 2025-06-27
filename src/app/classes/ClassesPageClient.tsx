// src/app/classes/ClassesPageClient.tsx
'use client';

import {
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Tab,
  Tabs,
  Grid,
  Typography,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  FitnessCenter as FitnessCenterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  LocalOffer as LocalOfferIcon,
  FilterList as FilterIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { SessionData } from '../types';
import Layout from '../components/layout/Layout';


interface ClassesPageClientProps {
  session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  // Tab configuration based on user role
  const getTabs = () => {
    const baseTabs = [
      { label: 'All Classes', icon: CalendarIcon },
    ];

    if (session.role === 'trainer' || session.role === 'staff') {
      baseTabs.push({ label: 'My Classes', icon: ScheduleIcon });
    }

    if (session.role === 'admin') {
      baseTabs.push(
        { label: 'Staff Schedule', icon: PeopleIcon },
        { label: 'Class Analytics', icon: SchoolIcon },
        { label: 'Settings', icon: SettingsIcon }
      );
    }

    return baseTabs;
  };

  const tabs = getTabs();

  const quickActions = session.role === 'admin' ? [
    {
      title: 'Schedule Class',
      icon: AddIcon,
      action: () => console.log('Schedule class'),
      color: 'primary' as const,
    },
    {
      title: 'Manage Staff',
      icon: PeopleIcon,
      action: () => window.location.href = '/staff',
      color: 'secondary' as const,
    },
    {
      title: 'View Members',
      icon: SchoolIcon,
      action: () => window.location.href = '/members',
      color: 'success' as const,
    },
    {
      title: 'Class Settings',
      icon: SettingsIcon,
      action: () => console.log('Class settings'),
      color: 'warning' as const,
    },
  ] : [
    {
      title: 'View Schedule',
      icon: ScheduleIcon,
      action: () => window.location.href = '/my-schedule',
      color: 'primary' as const,
    },
  ];

  return (
    <Layout session={session} title="Class Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            background: 'linear-gradient(135deg, #0F5C6B 0%, #2e6f8c 100%)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4, color: 'white' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Class Management
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              {session.role === 'admin'
                ? 'Manage all classes, schedules, and instructors across your academy.'
                : session.role === 'trainer'
                  ? 'View and manage your assigned classes and training sessions.'
                  : 'Access class schedules and training information.'
              }
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<CalendarIcon />}
                label={`Today's Classes`}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
              <Chip
                icon={<ScheduleIcon />}
                label="Weekly Schedule"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
              {session.role === 'admin' && (
                <Chip
                  icon={<SettingsIcon />}
                  label="Admin Controls"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Paper>

        {/* Navigation Tabs */}
        <Paper elevation={0} sx={{ mb: 4, borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="class management tabs"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 64,
                  fontSize: '0.95rem',
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={<tab.icon />}
                  iconPosition="start"
                  label={tab.label}
                  sx={{ gap: 1 }}
                />
              ))}
            </Tabs>
          </Box>
        </Paper>

        {/* Controls Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {tabs[activeTab]?.label}
            </Typography>
            
            <Chip
              label="0 classes"
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* View Mode Toggle */}
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, p: 0.5, border: 1, borderColor: 'divider' }}>
              <IconButton
                size="small"
                onClick={() => setViewMode('day')}
                sx={{
                  bgcolor: viewMode === 'day' ? 'primary.main' : 'transparent',
                  color: viewMode === 'day' ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': {
                    bgcolor: viewMode === 'day' ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ViewDayIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('week')}
                sx={{
                  bgcolor: viewMode === 'week' ? 'primary.main' : 'transparent',
                  color: viewMode === 'week' ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': {
                    bgcolor: viewMode === 'week' ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ViewWeekIcon />
              </IconButton>
            </Box>

            {/* Filter Button */}
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterClick}
              size="small"
            >
              Filter
            </Button>

            {/* Add Class Button - Admin only */}
            {session.role === 'admin' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
              >
                Schedule Class
              </Button>
            )}
          </Box>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={4}>
          {/* Classes Content */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: 0 }}>
                {/* Today's Classes Header */}
                <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {viewMode === 'day' ? "Today's Classes" : "This Week's Schedule"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Typography>
                  </Box>
                </Box>

                {/* Empty State */}
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <FitnessCenterIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    No classes scheduled
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                    {session.role === 'admin'
                      ? 'Get started by scheduling your first class. You can set up recurring classes and assign instructors.'
                      : 'Classes will appear here when they are scheduled. Check back later or contact your administrator.'
                    }
                  </Typography>
                  
                  {session.role === 'admin' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      size="large"
                    >
                      Schedule Your First Class
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            {/* Quick Actions */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Actions
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      startIcon={<action.icon />}
                      onClick={action.action}
                      fullWidth
                      sx={{ 
                        justifyContent: 'flex-start',
                        color: `${action.color}.main`,
                        borderColor: `${action.color}.main`,
                        '&:hover': {
                          borderColor: `${action.color}.dark`,
                          backgroundColor: `${action.color}.50`,
                        },
                      }}
                    >
                      {action.title}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Stats
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Classes Today
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      0
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      This Week
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      0
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {session.role === 'admin' ? 'Total Members' : 'My Classes'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      --
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Class Types */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Class Types
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { name: 'Brazilian Jiu-Jitsu', count: 0, color: 'primary' },
                    { name: 'Muay Thai', count: 0, color: 'secondary' },
                    { name: 'MMA', count: 0, color: 'success' },
                    { name: 'Boxing', count: 0, color: 'warning' },
                  ].map((classType, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: `${classType.color}.main`,
                          }}
                        />
                        <Typography variant="body2">
                          {classType.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={classType.count}
                        size="small"
                        variant="outlined"
                        color={classType.color as any}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleFilterClose}>
            <ListItemIcon>
              <CalendarIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>All Classes</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleFilterClose}>
            <ListItemIcon>
              <FitnessCenterIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>By Class Type</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleFilterClose}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>By Instructor</ListItemText>
          </MenuItem>
        </Menu>
      </Container>
    </Layout>
  );
}