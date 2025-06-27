// src/app/classes/ClassesPageClient.tsx
'use client';

import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Tab,
  Tabs,
  Grid,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  FitnessCenter as FitnessCenterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import LogoutButton from '../components/ui/LogoutButton';
import { SessionData } from '../types';

interface ClassesPageClientProps {
  session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <FitnessCenterIcon sx={{ mr: 2, fontSize: 28, color: 'primary.main' }} />
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                letterSpacing: '0.5px',
              }}
            >
              Pacific MMA Classes
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* User Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                }}
              >
                {session.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {session.fullName}
                </Typography>
                <Chip
                  label={session.role.toUpperCase()}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600 }}
                />
              </Box>
            </Box>

            {/* Admin Dashboard Button */}
            {session.role === 'admin' && (
              <Button
                variant="outlined"
                startIcon={<DashboardIcon />}
                href="/dashboard"
                sx={{ ml: 2 }}
              >
                Dashboard
              </Button>
            )}

            {/* Logout Button */}
            <LogoutButton variant="outline" />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="navigation tabs"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 64,
              },
            }}
          >
            <Tab
              icon={<CalendarIcon />}
              iconPosition="start"
              label="All Classes"
            />
            
            {(session.role === 'trainer' || session.role === 'staff') && (
              <Tab
                icon={<ScheduleIcon />}
                iconPosition="start"
                label="My Schedule"
              />
            )}

            {session.role === 'admin' && (
              <>
                <Tab
                  icon={<PeopleIcon />}
                  iconPosition="start"
                  label="Staff"
                />
                <Tab
                  icon={<SchoolIcon />}
                  iconPosition="start"
                  label="Members"
                />
                <Tab
                  icon={<LocalOfferIcon />}
                  iconPosition="start"
                  label="Memberships"
                />
              </>
            )}
          </Tabs>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Class Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {session.role === 'admin'
                ? 'Manage all classes, schedules, and instructors.'
                : session.role === 'trainer'
                  ? 'View and manage your assigned classes.'
                  : 'View class schedules and information.'
              }
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<CalendarIcon />}
                label="Today's Classes"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<ScheduleIcon />}
                label="Weekly Schedule"
                color="secondary"
                variant="outlined"
              />
              {session.role === 'admin' && (
                <Chip
                  icon={<SettingsIcon />}
                  label="Manage System"
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <Grid container spacing={4}>
          {/* Today's Classes */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    Today's Classes
                  </Typography>
                  {session.role === 'admin' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      size="small"
                    >
                      Add Class
                    </Button>
                  )}
                </Box>

                {/* Empty State */}
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                  }}
                >
                  <CalendarIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    No classes scheduled
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Classes will appear here when they are scheduled.
                  </Typography>
                  
                  {session.role === 'admin' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      color="primary"
                    >
                      Schedule New Class
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Stats
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Classes Today
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      0
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      This Week
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      0
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Active Members
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      --
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {session.role === 'admin' && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Quick Actions
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PeopleIcon />}
                      href="/staff"
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Manage Staff
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<SchoolIcon />}
                      href="/members"
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      View Members
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<LocalOfferIcon />}
                      href="/memberships"
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Memberships
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<SettingsIcon />}
                      href="/discounts"
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Discounts
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Weekly Schedule */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                Weekly Schedule
              </Typography>

              {session.role === 'admin' && (
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  size="small"
                >
                  Manage Schedule
                </Button>
              )}
            </Box>

            {/* Empty Schedule State */}
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                color: 'text.secondary',
              }}
            >
              <ScheduleIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                No schedule configured
              </Typography>
              <Typography variant="body2">
                Weekly class schedule will be displayed here once configured.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Additional Features Section for Admin */}
        {session.role === 'admin' && (
          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Class Analytics
                  </Typography>
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="body2">
                      Class performance metrics will be displayed here
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Instructor Schedule
                  </Typography>
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="body2">
                      Instructor availability and assignments
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Trainer/Staff Specific Content */}
        {(session.role === 'trainer' || session.role === 'staff') && (
          <Card sx={{ mt: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                My Classes & Schedule
              </Typography>
              
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                  color: 'text.secondary',
                }}
              >
                <PeopleIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  No assigned classes
                </Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Your class assignments will appear here once scheduled.
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  href="/my-schedule"
                >
                  View My Schedule
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
}