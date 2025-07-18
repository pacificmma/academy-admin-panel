// src/app/classes/ClassesPageClient.tsx - COMPLETELY FIXED VERSION
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
import { ClassSchedule, ClassInstance } from '../types/class';
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
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Filter states
  const [filters, setFilters] = useState<ClassFilters>({
    searchTerm: '',
    classType: '',
    instructorId: '',
    status: 'all',
    dateRange: 'all',
  });

  // Load instructors - FIXED: Use /api/staff instead of /api/users
  const loadInstructors = useCallback(async () => {
    try {
      const response = await fetch('/api/staff?role=trainer', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch instructors');
      }

      const data = await response.json();
      if (data.success) {
        setInstructors(data.data || []);
      }
    } catch (err) {
      console.error('Error loading instructors:', err);
    }
  }, []);

  // Load class schedules
  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/schedules', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch class schedules');
      }

      const data = await response.json();
      if (data.success) {
        setSchedules(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch class schedules');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class schedules');
    }
  }, []);

  // Load class instances
  const loadInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/instances', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch class instances');
      }

      const data = await response.json();
      if (data.success) {
        setAllInstances(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch class instances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class instances');
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadInstructors(),
        loadSchedules(),
        loadInstances(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadInstructors, loadSchedules, loadInstances]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter instances based on current filters
  const filteredInstances = useMemo(() => {
    return allInstances.filter(instance => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !instance.name.toLowerCase().includes(searchLower) &&
          !instance.instructorName.toLowerCase().includes(searchLower) &&
          !instance.classType.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Class type filter
      if (filters.classType && instance.classType !== filters.classType) {
        return false;
      }

      // Instructor filter
      if (filters.instructorId && instance.instructorId !== filters.instructorId) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && instance.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const instanceDate = new Date(instance.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filters.dateRange) {
          case 'today':
            if (instanceDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(today.getDate() + 7);
            if (instanceDate < today || instanceDate > weekFromNow) return false;
            break;
          case 'month':
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(today.getMonth() + 1);
            if (instanceDate < today || instanceDate > monthFromNow) return false;
            break;
        }
      }

      return true;
    });
  }, [allInstances, filters]);

  // Get unique class types from instances for filter dropdown
  const availableClassTypes = useMemo(() => {
    const types = new Set(allInstances.map(instance => instance.classType));
    return Array.from(types).sort();
  }, [allInstances]);

  // Handle creating a new class
  const handleCreateClass = () => {
    setSelectedClass(null);
    setSelectedClassType('schedule');
    setCreateDialogOpen(true);
  };

  // Handle editing a class
  const handleEditClass = (classData: ClassSchedule | ClassInstance, type?: 'schedule' | 'instance') => {
    setSelectedClass(classData);
    setSelectedClassType(type || ('scheduleId' in classData ? 'instance' : 'schedule'));
    setEditDialogOpen(true);
    setActionMenuAnchor(null);
  };

  // Handle deleting a class
  const handleDeleteClass = (classData: ClassSchedule | ClassInstance, type: 'schedule' | 'instance') => {
    setSelectedClass(classData);
    setSelectedClassType(type);
    setDeleteDialogOpen(true);
    setActionMenuAnchor(null);
  };

  // Handle class submission (create/edit)
  const handleClassSubmit = async (formData: any) => {
    try {
      setSubmitLoading(true);
      setError(null);

      const endpoint = selectedClassType === 'schedule' ? '/api/classes/schedules' : '/api/classes/instances';
      const method = editDialogOpen ? 'PUT' : 'POST';
      const url = editDialogOpen && selectedClass ? `${endpoint}/${selectedClass.id}` : endpoint;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save class');
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage(editDialogOpen ? 'Class updated successfully' : 'Class created successfully');
        setCreateDialogOpen(false);
        setEditDialogOpen(false);
        await loadData(); // Reload all data
      } else {
        throw new Error(result.error || 'Failed to save class');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle class deletion
  const handleClassDelete = async () => {
    if (!selectedClass) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const endpoint = selectedClassType === 'schedule' ? '/api/classes/schedules' : '/api/classes/instances';
      const response = await fetch(`${endpoint}/${selectedClass.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage('Class deleted successfully');
        setDeleteDialogOpen(false);
        await loadData(); // Reload all data
      } else {
        throw new Error(result.error || 'Failed to delete class');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle action menu
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, classData: ClassSchedule | ClassInstance, type: 'schedule' | 'instance') => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuData({ class: classData, type });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuData(null);
  };

  // Handle class status updates (for instances only)
  const handleStatusUpdate = async (instanceId: string, newStatus: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/classes/instances/${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class status');
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage(`Class ${newStatus} successfully`);
        await loadInstances(); // Reload instances
      } else {
        throw new Error(result.error || 'Failed to update class status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class status');
    }
  };

  // Handle calendar class click
  const handleCalendarClassClick = (instance: ClassInstance) => {
    handleEditClass(instance, 'instance');
  };

  // Handle calendar date click
  const handleCalendarDateClick = (date: Date) => {
    setCurrentCalendarDate(date);
  };

  if (loading) {
    return (
      <Layout session={session}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
          </Box>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Class Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage class schedules and track class instances
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
            {session?.role === 'admin' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateClass}
              >
                Create Class Schedule
              </Button>
            )}
          </Box>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search classes..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Class Type</InputLabel>
                <Select
                  value={filters.classType}
                  label="Class Type"
                  onChange={(e) => setFilters(prev => ({ ...prev, classType: e.target.value }))}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {availableClassTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={filters.instructorId}
                  label="Instructor"
                  onChange={(e) => setFilters(prev => ({ ...prev, instructorId: e.target.value }))}
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

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="ongoing">Ongoing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  label="Date Range"
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                >
                  <MenuItem value="all">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">Next 7 Days</MenuItem>
                  <MenuItem value="month">Next 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({
                  searchTerm: '',
                  classType: '',
                  instructorId: '',
                  status: 'all',
                  dateRange: 'all',
                })}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Class Instances Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Class Instances ({filteredInstances.length})
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant={instanceDisplayMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setInstanceDisplayMode('cards')}
                sx={{ mr: 1 }}
              >
                Cards View
              </Button>
              <Button
                variant={instanceDisplayMode === 'calendar' ? 'contained' : 'outlined'}
                onClick={() => setInstanceDisplayMode('calendar')}
              >
                Calendar View
              </Button>
            </Box>
            
            {instanceDisplayMode === 'calendar' && (
              <FormControl size="small">
                <InputLabel>View</InputLabel>
                <Select
                  value={calendarViewMode}
                  label="View"
                  onChange={(e) => setCalendarViewMode(e.target.value as 'week' | 'day' | 'month')}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          {instanceDisplayMode === 'cards' ? (
            filteredInstances.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No class instances found
                </Typography>
                <Typography color="text.secondary">
                  {allInstances.length === 0 
                    ? "Class instances will appear here once you create recurring schedules"
                    : "Try adjusting your filters to see more results"
                  }
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filteredInstances.map((instance) => (
                  <Grid item xs={12} md={6} lg={4} key={instance.id}>
                    <ClassCard
                      classData={instance}
                      type="instance"
                      onEdit={session?.role === 'admin' ? () => handleEditClass(instance, 'instance') : undefined}
                      onDelete={session?.role === 'admin' ? (id, type) => handleDeleteClass(instance, 'instance') : undefined}
                      onStartClass={session?.role === 'admin' ? () => handleStatusUpdate(instance.id, 'ongoing') : undefined}
                      onEndClass={session?.role === 'admin' ? () => handleStatusUpdate(instance.id, 'completed') : undefined}
                      onCancelClass={session?.role === 'admin' ? () => handleStatusUpdate(instance.id, 'cancelled') : undefined}
                    />
                  </Grid>
                ))}
              </Grid>
            )
          ) : (
            // Calendar view rendering
            <Box sx={{ mt: 2 }}>
              <ClassCalendar
                instances={filteredInstances}
                viewMode={calendarViewMode}
                onViewModeChange={setCalendarViewMode}
                onClassClick={handleCalendarClassClick}
                onDateClick={handleCalendarDateClick}
                selectedDate={currentCalendarDate}
                userRole={session?.role || 'member'}
                onEditClass={(data) => handleEditClass(data, 'instance')}
                onDeleteClass={(data) => handleDeleteClass(data, 'instance')}
                onStartClass={(instanceId) => handleStatusUpdate(instanceId, 'ongoing')}
                onEndClass={(instanceId) => handleStatusUpdate(instanceId, 'completed')}
                onCancelClass={(instanceId) => handleStatusUpdate(instanceId, 'cancelled')}
                userId={session?.uid || ''}
              />
            </Box>
          )}
        </Paper>

        {/* Floating Action Button for Mobile */}
        {session?.role === 'admin' && (
          <Fab
            color="primary"
            aria-label="add class"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' },
            }}
            onClick={handleCreateClass}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
        >
          {actionMenuData && session?.role === 'admin' && (
            [
              <MenuItem key="edit" onClick={() => handleEditClass(actionMenuData.class, actionMenuData.type)}>
                <EditIcon sx={{ mr: 1 }} />
                Edit
              </MenuItem>,
              <MenuItem key="delete" onClick={() => handleDeleteClass(actionMenuData.class, actionMenuData.type)}>
                <DeleteIcon sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            ]
          )}
        </Menu>

        {/* Class Form Dialog - FIXED: Map instructors to expected format */}
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

        {/* Delete Confirmation Dialog - FIXED: Use correct props */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleClassDelete}
          title="Delete Class"
          itemName={selectedClass?.name || 'Unknown'}
          itemType={selectedClassType === 'schedule' ? 'class schedule' : 'class instance'}
          loading={submitLoading}
        />

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          message={successMessage}
        />
      </Container>
    </Layout>
  );
}