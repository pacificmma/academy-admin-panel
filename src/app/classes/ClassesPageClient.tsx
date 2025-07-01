// src/app/classes/ClassesPageClient.tsx - Complete Class Management Page
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  FitnessCenter as FitnessCenterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  FilterList as FilterIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewModule as ViewMonthIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import ClassFormDialog from '../components/forms/ClassFormDialog';
import ClassCard from '../components/ui/ClassCards'; // Corrected import file name
import ClassCalendar from '../components/ui/ClassCalendar';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';
import {
  ClassSchedule,
  ClassInstance,
  ClassFormData,
  ClassStats,
  ClassType,
  CLASS_TYPE_OPTIONS,
  getClassTypeColor,
} from '../types/class';
import { SessionData } from '../types';

interface ClassesPageClientProps {
  session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps) {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Data state
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);
  const [stats, setStats] = useState<ClassStats>({
    totalClasses: 0,
    upcomingClasses: 0,
    completedClasses: 0,
    totalParticipants: 0,
    averageAttendance: 0,
    popularClassTypes: [],
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [classTypeFilter, setClassTypeFilter] = useState<ClassType | ''>('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | ClassInstance | null>(null);

  // Notification state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab configuration based on user role
  const getTabs = () => {
    const baseTabs = [
      { label: 'Schedule Overview', icon: CalendarIcon },
      { label: 'All Classes', icon: FitnessCenterIcon },
    ];

    if (session.role === 'trainer' || session.role === 'staff') {
      baseTabs.push({ label: 'My Classes', icon: ScheduleIcon });
    }

    if (session.role === 'admin') {
      baseTabs.push(
        { label: 'Class Analytics', icon: SchoolIcon },
        { label: 'Settings', icon: SettingsIcon }
      );
    }

    return baseTabs;
  };

  const tabs = getTabs();

  // Load data
  const loadClassSchedules = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (classTypeFilter) params.append('classType', classTypeFilter);
      if (instructorFilter) params.append('instructorId', instructorFilter);

      const response = await fetch(`/api/classes/schedules?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load class schedules');

      const data = await response.json();
      setClassSchedules(data.data || []);
    } catch (error) {
      setError('Failed to load class schedules');
      console.error('Load schedules error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, classTypeFilter, instructorFilter]);

  const loadClassInstances = useCallback(async (): Promise<void> => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/classes/instances?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load class instances');

      const data = await response.json();
      setClassInstances(data.data || []);
    } catch (error) {
      setError('Failed to load class instances');
      console.error('Load instances error:', error);
    }
  }, []);

  const loadInstructors = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/staff?role=trainer');
      if (!response.ok) throw new Error('Failed to load instructors');

      const data = await response.json();
      setInstructors(data.data?.map((staff: any) => ({
        id: staff.id,
        name: staff.fullName,
        specialties: staff.specialties || [],
      })) || []);
    } catch (error) {
      console.error('Load instructors error:', error);
    }
  }, []);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/classes/stats');
      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      setStats(data.data || stats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }, []);

  useEffect(() => {
    loadClassSchedules();
    loadClassInstances();
    loadInstructors();
    loadStats();
  }, [loadClassSchedules, loadClassInstances, loadInstructors, loadStats]);

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateClass = async (formData: ClassFormData) => {
    try {
      setSubmitLoading(true);
      const response = await fetch('/api/classes/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create class');

      setSuccessMessage('Class scheduled successfully!');
      await loadClassSchedules();
      await loadClassInstances();
      setCreateDialogOpen(false);
    } catch (error) {
      setError('Failed to create class');
      console.error('Create class error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClass = async (formData: ClassFormData) => {
    if (!selectedClass || !('recurrence' in selectedClass)) return;

    try {
      setSubmitLoading(true);
      const response = await fetch(`/api/classes/schedules/${selectedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update class');

      setSuccessMessage('Class updated successfully!');
      await loadClassSchedules();
      await loadClassInstances();
      setEditDialogOpen(false);
    } catch (error) {
      setError('Failed to update class');
      console.error('Update class error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    try {
      const isSchedule = 'recurrence' in selectedClass;
      const endpoint = isSchedule
        ? `/api/classes/schedules/${selectedClass.id}`
        : `/api/classes/instances/${selectedClass.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete class');

      setSuccessMessage(`${isSchedule ? 'Schedule' : 'Class'} deleted successfully!`);
      await loadClassSchedules();
      await loadClassInstances();
      setDeleteDialogOpen(false);
      setSelectedClass(null);
    } catch (error) {
      setError('Failed to delete class');
      console.error('Delete class error:', error);
    }
  };

  const handleClassInstanceAction = async (action: string, classInstance: ClassInstance) => {
    try {
      const response = await fetch(`/api/classes/instances/${classInstance.id}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error(`Failed to ${action} class`);

      setSuccessMessage(`Class ${action} successfully!`);
      await loadClassInstances();
    } catch (error) {
      setError(`Failed to ${action} class`);
      console.error(`${action} class error:`, error);
    }
  };

  // Filter events
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setClassTypeFilter('');
    setInstructorFilter('');
  };

  // Filtered data
  const filteredSchedules = classSchedules.filter(schedule => {
    const matchesSearch = !searchTerm ||
      schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.instructorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClassType = !classTypeFilter || schedule.classType === classTypeFilter;
    const matchesInstructor = !instructorFilter || schedule.instructorId === instructorFilter;

    return matchesSearch && matchesClassType && matchesInstructor;
  });

  const filteredInstances = classInstances.filter(instance => {
    if (session.role === 'trainer') {
      return instance.instructorId === session.uid;
    }
    return true;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Schedule Overview
        return (
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <ClassCalendar
                classes={filteredInstances}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onClassClick={(classInstance) => {
                  setSelectedClass(classInstance);
                  // Could open a detailed view dialog here
                }}
                onDateClick={(date) => {
                  if (session.role === 'admin') {
                    setCreateDialogOpen(true);
                  }
                }}
                userRole={session.role}
              />
            </Grid>
          </Grid>
        );

      case 1: // All Classes
        return (
          <Grid container spacing={3}>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} lg={4} key={index}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            ) : filteredSchedules.length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FitnessCenterIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    No classes found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                    {searchTerm || classTypeFilter || instructorFilter
                      ? 'Try adjusting your filters to see more classes.'
                      : session.role === 'admin'
                        ? 'Get started by scheduling your first class.'
                        : 'Classes will appear here when they are scheduled.'
                    }
                  </Typography>
                  {(searchTerm || classTypeFilter || instructorFilter) && (
                    <Button variant="outlined" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                  {session.role === 'admin' && !searchTerm && !classTypeFilter && !instructorFilter && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Schedule Your First Class
                    </Button>
                  )}
                </Box>
              </Grid>
            ) : (
              filteredSchedules.map((schedule) => (
                <Grid item xs={12} sm={6} lg={4} key={schedule.id}>
                  <ClassCard
                    classData={schedule}
                    type="schedule"
                    onEdit={() => {
                      setSelectedClass(schedule);
                      setEditDialogOpen(true);
                    }}
                    onDelete={() => {
                      setSelectedClass(schedule);
                      setDeleteDialogOpen(true);
                    }}
                    userRole={session.role}
                  />
                </Grid>
              ))
            )}
          </Grid>
        );

      case 2: // My Classes (Trainer/Staff only)
        const myInstances = filteredInstances.filter(instance =>
          instance.instructorId === session.uid
        );

        return (
          <Grid container spacing={3}>
            {myInstances.length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ScheduleIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    No classes assigned
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You don't have any classes assigned to you yet.
                  </Typography>
                </Box>
              </Grid>
            ) : (
              myInstances.map((instance) => (
                <Grid item xs={12} sm={6} lg={4} key={instance.id}>
                  <ClassCard
                    classData={instance}
                    type="instance"
                    onStartClass={() => handleClassInstanceAction('start', instance)}
                    onEndClass={() => handleClassInstanceAction('end', instance)}
                    onCancelClass={() => handleClassInstanceAction('cancel', instance)}
                    onViewParticipants={() => {
                      // Open participants dialog
                    }}
                    userRole={session.role}
                  />
                </Grid>
              ))
            )}
          </Grid>
        );

      case 3: // Analytics (Admin only)
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {stats.totalClasses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Classes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {stats.upcomingClasses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Classes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {stats.totalParticipants}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Participants
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {Math.round(stats.averageAttendance)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Attendance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Popular Class Types */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Popular Class Types
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {stats.popularClassTypes.map((classType, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: classType.color,
                            }}
                          />
                          <Typography variant="body2">
                            {classType.type}
                          </Typography>
                        </Box>
                        <Chip
                          label={classType.count}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 4: // Settings (Admin only)
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Class Management Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Settings panel coming soon...
              </Typography>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

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
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'white' }}>
              Class Management
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, color: 'white' }}>
              {session.role === 'admin'
                ? 'Manage all classes, schedules, and instructors across your academy.'
                : session.role === 'trainer'
                  ? 'View and manage your assigned classes and training sessions.'
                  : 'Access class schedules and training information.'
              }
            </Typography>
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

            {activeTab === 1 && (
              <Chip
                label={`${filteredSchedules.length} schedules`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Search */}
            {activeTab === 1 && (
              <TextField
                size="small"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 250 }}
              />
            )}

            {/* View Mode Toggle for Schedule Overview */}
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, p: 0.5, border: 1, borderColor: 'divider' }}>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('day')}
                  sx={{
                    bgcolor: viewMode === 'day' ? 'primary.main' : 'transparent',
                    color: viewMode === 'day' ? 'primary.contrastText' : 'text.secondary',
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
                  }}
                >
                  <ViewWeekIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setViewMode('month')}
                  sx={{
                    bgcolor: viewMode === 'month' ? 'primary.main' : 'transparent',
                    color: viewMode === 'month' ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  <ViewMonthIcon />
                </IconButton>
              </Box>
            )}

            {/* Filter Button */}
            {activeTab === 1 && (
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleFilterClick}
                size="small"
              >
                Filter
              </Button>
            )}

            {/* Refresh Button */}
            <IconButton
              onClick={() => {
                loadClassSchedules();
                loadClassInstances();
                loadStats();
              }}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>

            {/* Add Class Button - Admin only */}
            {session.role === 'admin' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                size="small"
              >
                Schedule Class
              </Button>
            )}
          </Box>
        </Box>

        {/* Main Content */}
        {renderTabContent()}

        {/* Create Class Dialog */}
        <ClassFormDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateClass}
          mode="create"
          instructors={instructors}
        />

        {/* Edit Class Dialog */}
        <ClassFormDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleEditClass}
          classSchedule={selectedClass as ClassSchedule}
          mode="edit"
          instructors={instructors}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedClass(null);
          }}
          onConfirm={handleDeleteClass}
          title={`Delete ${selectedClass && 'recurrence' in selectedClass ? 'Class Schedule' : 'Class Instance'}`}
          itemName={selectedClass?.name || ''}
          itemType={selectedClass && 'recurrence' in selectedClass ? 'class schedule' : 'class instance'}
          warningMessage="This action cannot be undone."
          additionalInfo={[]} // You can add relevant info here if needed
        />

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { minWidth: 200 } }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Filter by Class Type
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <Select
                value={classTypeFilter}
                onChange={(e) => setClassTypeFilter(e.target.value as ClassType | '')}
                displayEmpty
              >
                <MenuItem value="">All Types</MenuItem>
                {CLASS_TYPE_OPTIONS.map((type) => (
                  <MenuItem key={type} value={type}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: getClassTypeColor(type),
                        }}
                      />
                      {type}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Filter by Instructor
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <Select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Instructors</MenuItem>
                {instructors.map((instructor) => (
                  <MenuItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                clearFilters();
                handleFilterClose();
              }}
              size="small"
            >
              Clear All Filters
            </Button>
          </Box>
        </Menu>

        {/* Success/Error Notifications */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success">
            {successMessage}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}