// src/app/classes/ClassesPageClient.tsx - COMPLETELY FIXED
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Fab,
  Menu,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import ClassFormDialog from '../components/forms/ClassFormDialog';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';
import ClassCard from '../components/ui/ClassCards';
import ClassCalendar from '../components/ui/ClassCalendar';
import { SessionData } from '../types';
import { ClassSchedule, ClassInstance, ClassFormData } from '../types/class';
import { StaffRecord } from '../types/staff';

interface ClassesPageClientProps {
  session: SessionData;
}

interface ClassFilters {
  searchTerm: string;
  classType: string;
  instructorId: string;
  status: string;
  dateRange: string;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps) {
  // State management
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [allInstances, setAllInstances] = useState<ClassInstance[]>([]);
  const [instructors, setInstructors] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [selectedClassType, setSelectedClassType] = useState<'schedule' | 'instance'>('schedule');

  // UI states
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuData, setActionMenuData] = useState<{ class: ClassSchedule | ClassInstance; type: 'schedule' | 'instance' } | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [instanceDisplayMode, setInstanceDisplayMode] = useState<'cards' | 'calendar'>('cards');

  // Filter states
  const [filters, setFilters] = useState<ClassFilters>({
    searchTerm: '',
    classType: '',
    instructorId: '',
    status: 'all',
    dateRange: 'all',
  });

  // Load data functions
  const loadSchedules = useCallback(async () => {
    try {
      const searchParams = new URLSearchParams();
      if (filters.searchTerm) searchParams.append('search', filters.searchTerm);
      if (filters.classType) searchParams.append('classType', filters.classType);
      if (filters.instructorId) searchParams.append('instructorId', filters.instructorId);

      const response = await fetch(`/api/classes/schedules?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to load schedules');

      const data = await response.json();
      setSchedules(data.data || []);
    } catch (err) {
      setError('Failed to load class schedules');
    }
  }, [filters]);

  const loadInstances = useCallback(async () => {
    try {
      const searchParams = new URLSearchParams();
      if (filters.searchTerm) searchParams.append('search', filters.searchTerm);
      if (filters.classType) searchParams.append('classType', filters.classType);
      if (filters.instructorId) searchParams.append('instructorId', filters.instructorId);

      const response = await fetch(`/api/classes/instances?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to load instances');

      const data = await response.json();
      setAllInstances(data.data || []);
    } catch (err) {
      setError('Failed to load class instances');
    }
  }, [filters]);

  const loadInstructors = useCallback(async () => {
    try {
      const response = await fetch('/api/staff?role=trainer');
      if (!response.ok) throw new Error('Failed to load instructors');

      const data = await response.json();
      setInstructors(data.data || []);
    } catch (err) {
      setError('Failed to load instructors');
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadSchedules(),
        loadInstances(),
        loadInstructors(),
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadSchedules, loadInstances, loadInstructors]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle form submission
  const handleClassSubmit = async (formData: ClassFormData, scheduleId?: string) => {
    setSubmitLoading(true);
    setError(null);

    try {
      const url = scheduleId
        ? `/api/classes/schedules/${scheduleId}`
        : '/api/classes/schedules';

      const method = scheduleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save class');
      }

      const result = await response.json();
      setSuccessMessage(
        scheduleId
          ? 'Class schedule updated successfully'
          : 'Class schedule created successfully'
      );

      // Reload data
      await loadData();

      // Close dialogs
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      setSelectedClass(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle class deletion
  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    setSubmitLoading(true);
    setError(null);

    try {
      const url = selectedClassType === 'schedule'
        ? `/api/classes/schedules/${selectedClass.id}`
        : `/api/classes/instances/${selectedClass.id}`;

      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }

      setSuccessMessage(
        `Class ${selectedClassType === 'schedule' ? 'schedule' : 'instance'} deleted successfully`
      );

      // Reload data
      await loadData();

      // Close dialog
      setDeleteDialogOpen(false);
      setSelectedClass(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Action menu handlers
  const handleActionMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    classItem: ClassSchedule | ClassInstance,
    type: 'schedule' | 'instance'
  ) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuData({ class: classItem, type });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuData(null);
  };

  const handleEditClass = () => {
    if (actionMenuData) {
      setSelectedClass(actionMenuData.class);
      setSelectedClassType(actionMenuData.type);
      setEditDialogOpen(true);
    }
    handleActionMenuClose();
  };

  const handleDeleteClassInit = () => {
    if (actionMenuData) {
      setSelectedClass(actionMenuData.class);
      setSelectedClassType(actionMenuData.type);
      setDeleteDialogOpen(true);
    }
    handleActionMenuClose();
  };

  // Filter handlers
  const handleFilterChange = (field: keyof ClassFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      classType: '',
      instructorId: '',
      status: 'all',
      dateRange: 'all',
    });
  };

  // Filtered data
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (filters.status === 'active' && !schedule.isActive) return false;
      if (filters.status === 'inactive' && schedule.isActive) return false;
      return true;
    });
  }, [schedules, filters.status]);

  const filteredInstances = useMemo(() => {
    return allInstances.filter(instance => {
      if (filters.dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        if (instance.date !== today) return false;
      }
      if (filters.dateRange === 'week') {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const instanceDate = new Date(instance.date);
        if (instanceDate > weekFromNow) return false;
      }
      if (filters.dateRange === 'month') {
        const monthFromNow = new Date();
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        const instanceDate = new Date(instance.date);
        if (instanceDate > monthFromNow) return false;
      }
      return true;
    });
  }, [allInstances, filters.dateRange]);

  return (
    <Layout session={session}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Classes Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage class schedules and instances
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
        >
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                placeholder="Search classes..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Class Type</InputLabel>
                <Select
                  value={filters.classType}
                  onChange={(e) => handleFilterChange('classType', e.target.value)}
                  label="Class Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="MMA">MMA</MenuItem>
                  <MenuItem value="BJJ">BJJ</MenuItem>
                  <MenuItem value="Boxing">Boxing</MenuItem>
                  <MenuItem value="Muay Thai">Muay Thai</MenuItem>
                  <MenuItem value="Wrestling">Wrestling</MenuItem>
                  <MenuItem value="Judo">Judo</MenuItem>
                  <MenuItem value="Kickboxing">Kickboxing</MenuItem>
                  <MenuItem value="Fitness">Fitness</MenuItem>
                  <MenuItem value="Yoga">Yoga</MenuItem>
                  <MenuItem value="Kids Martial Arts">Kids Martial Arts</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={filters.instructorId}
                  onChange={(e) => handleFilterChange('instructorId', e.target.value)}
                  label="Instructor"
                >
                  <MenuItem value="">All Instructors</MenuItem>
                  {instructors.map((instructor) => (
                    <MenuItem key={instructor.id || instructor.uid} value={instructor.id || instructor.uid}>
                      {instructor.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="all">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
                startIcon={<RefreshIcon />}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Class Schedules Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Class Schedules ({filteredSchedules.length})
                </Typography>
                {session.role === 'admin' && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    New Schedule
                  </Button>
                )}
              </Box>

              {loading ? (
                <Box>
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={120} sx={{ mb: 2 }} />
                  ))}
                </Box>
              ) : filteredSchedules.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">
                    No class schedules found
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {filteredSchedules.map((schedule) => (
                    <ClassCard
                      key={schedule.id}
                      classData={schedule}
                      type="schedule"
                      onEdit={(classItem) => {
                        setSelectedClass(classItem);
                        setSelectedClassType('schedule');
                        setEditDialogOpen(true);
                      }}
                      onDelete={(classItem) => {
                        setSelectedClass(classItem);
                        setSelectedClassType('schedule');
                        setDeleteDialogOpen(true);
                      }}
                      canEdit={session.role === 'admin'}
                      canDelete={session.role === 'admin'}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Class Instances Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Class Instances ({filteredInstances.length})
                </Typography>
                <Box>
                  <Button
                    variant={instanceDisplayMode === 'cards' ? 'contained' : 'outlined'}
                    onClick={() => setInstanceDisplayMode('cards')}
                    sx={{ mr: 1 }}
                  >
                    Cards
                  </Button>
                  <Button
                    variant={instanceDisplayMode === 'calendar' ? 'contained' : 'outlined'}
                    onClick={() => setInstanceDisplayMode('calendar')}
                  >
                    Calendar
                  </Button>
                </Box>
              </Box>

              {loading ? (
                <Box>
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={120} sx={{ mb: 2 }} />
                  ))}
                </Box>
              ) : instanceDisplayMode === 'cards' ? (
                filteredInstances.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No class instances found
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {filteredInstances.map((instance) => (
                      <ClassCard
                        key={instance.id}
                        classData={instance}
                        type="instance"
                        onEdit={(classItem) => {
                          setSelectedClass(classItem);
                          setSelectedClassType('instance');
                          setEditDialogOpen(true);
                        }}
                        onDelete={(classItem) => {
                          setSelectedClass(classItem);
                          setSelectedClassType('instance');
                          setDeleteDialogOpen(true);
                        }}
                        canEdit={session.role === 'admin'}
                        canDelete={session.role === 'admin'}
                      />
                    ))}
                  </Box>
                )
              ) : (
                <ClassCalendar
                  instances={filteredInstances}
                  viewMode={calendarViewMode}
                  onViewModeChange={setCalendarViewMode}
                  onInstanceClick={(instance) => {
                    setSelectedClass(instance);
                    setSelectedClassType('instance');
                    setEditDialogOpen(true);
                  }}
                />
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Dialogs */}
        <ClassFormDialog
          open={createDialogOpen || editDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setSelectedClass(null);
          }}
          onSubmit={handleClassSubmit}
          classData={selectedClass}
          type={selectedClassType}
          mode={editDialogOpen ? 'edit' : 'create'}
          instructors={instructors.map(instructor => ({
            id: instructor.id || instructor.uid,
            name: instructor.fullName,
            specialties: instructor.specializations || []
          }))}
          loading={submitLoading}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedClass(null);
          }}
          onConfirm={handleDeleteClass}
          title={`Delete ${selectedClassType === 'schedule' ? 'Class Schedule' : 'Class Instance'}`}
          itemName={selectedClass?.name || ''}
          itemType={selectedClassType === 'schedule' ? 'class schedule' : 'class instance'}
          loading={submitLoading}
          warningMessage={
            selectedClassType === 'schedule'
              ? 'Deleting this schedule will also remove all associated class instances and registrations.'
              : 'Deleting this instance will remove all participant registrations for this specific class.'
          }
          additionalInfo={
            selectedClass ? [
              { label: 'Class Type', value: selectedClass.classType },
              { label: 'Instructor', value: selectedClass.instructorName },
              { label: 'Max Participants', value: selectedClass.maxParticipants },
              ...(selectedClassType === 'instance' && (selectedClass as ClassInstance).registeredParticipants
                ? [{ label: 'Current Registrations', value: (selectedClass as ClassInstance).registeredParticipants.length }]
                : []
              )
            ] : []
          }
        />

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
        >
          <MenuItem onClick={handleEditClass}>
            <EditIcon sx={{ mr: 1 }} /> Edit
          </MenuItem>
          {session.role === 'admin' && (
            <MenuItem onClick={handleDeleteClassInit}>
              <DeleteIcon sx={{ mr: 1 }} /> Delete
            </MenuItem>
          )}
        </Menu>

        {/* Floating Action Button for Mobile */}
        {session.role === 'admin' && (
          <Fab
            color="primary"
            aria-label="add class"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', sm: 'none' }
            }}
            onClick={() => setCreateDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>
    </Layout>
  );
}