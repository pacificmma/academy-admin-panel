// src/app/classes/ClassesPageClient.tsx - FIXED VERSION
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
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  List as ListIcon,
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

type ViewMode = 'list' | 'calendar';
type CalendarViewMode = 'day' | 'week' | 'month';

// Initialize with default values to prevent controlled/uncontrolled warnings
const DEFAULT_FILTERS: ClassFilters = {
  searchTerm: '',
  classType: '',
  instructorId: '',
  status: 'all',
  dateRange: 'all',
};

export default function ClassesPageClient({ session }: ClassesPageClientProps) {
  // State management
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [allInstances, setAllInstances] = useState<ClassInstance[]>([]);
  const [instructors, setInstructors] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // FIXED: Add calendar view mode state
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [editingType, setEditingType] = useState<'schedule' | 'instance'>('schedule');
  const [deletingClass, setDeletingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Filters - Initialize with default values to prevent controlled/uncontrolled issues
  const [filters, setFilters] = useState<ClassFilters>(DEFAULT_FILTERS);

  // Combined data loading function
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [schedulesResponse, instancesResponse, instructorsResponse] = await Promise.all([
        fetch('/api/classes/schedules'),
        fetch('/api/classes/instances'),
        fetch('/api/staff?role=trainer'),
      ]);

      if (!schedulesResponse.ok) throw new Error('Failed to load schedules');
      if (!instancesResponse.ok) throw new Error('Failed to load instances');
      if (!instructorsResponse.ok) throw new Error('Failed to load instructors');

      const [schedulesData, instancesData, instructorsData] = await Promise.all([
        schedulesResponse.json(),
        instancesResponse.json(),
        instructorsResponse.json(),
      ]);

      setSchedules(schedulesData.data || []);
      setAllInstances(instancesData.data || []);
      setInstructors(instructorsData.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter change handler
  const handleFilterChange = useCallback(<K extends keyof ClassFilters>(
    field: K,
    value: ClassFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Memoized filter calculations
  const uniqueClassTypes = useMemo(() => {
    const types = new Set<string>();
    schedules.forEach(schedule => types.add(schedule.classType));
    allInstances.forEach(instance => types.add(instance.classType));
    return Array.from(types).sort();
  }, [schedules, allInstances]);

  const uniqueInstructors = useMemo(() => {
    const instructorMap = new Map<string, string>();
    schedules.forEach(schedule => {
      if (schedule.instructorName) {
        instructorMap.set(schedule.instructorId, schedule.instructorName);
      }
    });
    allInstances.forEach(instance => {
      if (instance.instructorName) {
        instructorMap.set(instance.instructorId, instance.instructorName);
      }
    });
    return Array.from(instructorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules, allInstances]);

  const transformedInstructors = useMemo(() => 
    instructors.map(instructor => ({
      id: instructor.id,
      name: instructor.fullName,
      email: instructor.email,
    })), [instructors]
  );

  // Apply filters
  const filteredData = useMemo(() => {
    const combinedData: (ClassSchedule | ClassInstance)[] = [
      ...schedules,
      ...allInstances,
    ];

    return combinedData.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(searchLower);
        const matchesType = item.classType.toLowerCase().includes(searchLower);
        const matchesInstructor = (item.instructorName || '').toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesType && !matchesInstructor) {
          return false;
        }
      }

      // Class type filter
      if (filters.classType && item.classType !== filters.classType) {
        return false;
      }

      // Instructor filter
      if (filters.instructorId && item.instructorId !== filters.instructorId) {
        return false;
      }

      // Status filter (only applies to instances)
      if (filters.status !== 'all' && 'status' in item) {
        if (item.status !== filters.status) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const itemDate = new Date('date' in item ? item.date : item.startDate);
        
        switch (filters.dateRange) {
          case 'today':
            if (itemDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            if (itemDate < weekStart || itemDate >= weekEnd) return false;
            break;
          case 'month':
            if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
        }
      }

      return true;
    });
  }, [schedules, allInstances, filters]);

  // Class management handlers
  const handleCreateClass = useCallback(() => {
    setEditingClass(null);
    setEditingType('schedule');
    setFormMode('create');
    setIsFormDialogOpen(true);
  }, []);

  const handleEditClass = useCallback((classData: ClassSchedule | ClassInstance) => {
    setEditingClass(classData);
    setEditingType('scheduleId' in classData ? 'instance' : 'schedule');
    setFormMode('edit');
    setIsFormDialogOpen(true);
  }, []);

  const handleDeleteClass = useCallback((classData: ClassSchedule | ClassInstance) => {
    setDeletingClass(classData);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async (formData: ClassFormData) => {
    setSubmitLoading(true);
    try {
      const endpoint = editingType === 'schedule' 
        ? '/api/classes/schedules'
        : '/api/classes/instances';
      
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const url = formMode === 'edit' && editingClass 
        ? `${endpoint}/${editingClass.id}`
        : endpoint;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save class');
      }

      setSuccessMessage(
        `Class ${formMode === 'create' ? 'created' : 'updated'} successfully!`
      );
      
      setIsFormDialogOpen(false);
      setEditingClass(null);
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save class';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  }, [editingType, formMode, editingClass, loadData]);

  const handleDelete = useCallback(async () => {
    if (!deletingClass) return;

    setSubmitLoading(true);
    try {
      const endpoint = 'scheduleId' in deletingClass 
        ? `/api/classes/instances/${deletingClass.id}`
        : `/api/classes/schedules/${deletingClass.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete class');
      }

      setSuccessMessage('Class deleted successfully!');
      setIsDeleteDialogOpen(false);
      setDeletingClass(null);
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  }, [deletingClass, loadData]);

  // Instance action handlers
  const handleStartClass = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/start`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to start class');
      }

      setSuccessMessage('Class started successfully!');
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start class';
      setError(errorMessage);
    }
  }, [loadData]);

  const handleEndClass = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/end`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to end class');
      }

      setSuccessMessage('Class ended successfully!');
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end class';
      setError(errorMessage);
    }
  }, [loadData]);

  const handleCancelClass = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/cancel`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel class');
      }

      setSuccessMessage('Class cancelled successfully!');
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel class';
      setError(errorMessage);
    }
  }, [loadData]);

  // FIXED: Add calendar view mode change handler
  const handleCalendarViewModeChange = useCallback((mode: CalendarViewMode) => {
    setCalendarViewMode(mode);
  }, []);

  if (loading) {
    return (
      <Layout session={session}>
        <Container maxWidth="xl">
          <Box sx={{ py: 3 }}>
            <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} lg={4} key={index}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Class Management
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
              
              {session.role === 'admin' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateClass}
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  Create Class
                </Button>
              )}
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)} 
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}

          {/* View Mode and Filters */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={viewMode}
                onChange={(_, newValue) => setViewMode(newValue)}
              >
                <Tab icon={<ListIcon />} label="List View" value="list" />
                <Tab icon={<CalendarIcon />} label="Calendar View" value="calendar" />
              </Tabs>
            </Box>

            {/* Filters */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
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
                <FormControl fullWidth size="small">
                  <InputLabel>Class Type</InputLabel>
                  <Select
                    value={filters.classType}
                    label="Class Type"
                    onChange={(e) => handleFilterChange('classType', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {uniqueClassTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Instructor</InputLabel>
                  <Select
                    value={filters.instructorId}
                    label="Instructor"
                    onChange={(e) => handleFilterChange('instructorId', e.target.value)}
                  >
                    <MenuItem value="">All Instructors</MenuItem>
                    {uniqueInstructors.map((instructor) => (
                      <MenuItem key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="ongoing">Ongoing</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={filters.dateRange}
                    label="Date Range"
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Content */}
          {viewMode === 'list' ? (
            <Grid container spacing={3}>
              {filteredData.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      {loading 
                        ? 'Loading classes...' 
                        : filteredData.length === 0 && (schedules.length > 0 || allInstances.length > 0)
                        ? 'No classes match your filters'
                        : 'No classes found'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {loading 
                        ? 'Please wait while we load your classes'
                        : filteredData.length === 0 && (schedules.length > 0 || allInstances.length > 0)
                        ? 'Try adjusting your filters'
                        : 'Create your first class to get started'}
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                filteredData.map((classData) => (
                  <Grid item xs={12} sm={6} lg={4} key={classData.id}>
                    <ClassCard
                      classData={classData}
                      type={'scheduleId' in classData ? 'instance' : 'schedule'}
                      onEdit={handleEditClass}
                      onDelete={handleDeleteClass}
                      canEdit={session.role === 'admin'}
                      canDelete={session.role === 'admin'}
                      onStartClass={handleStartClass}
                      onEndClass={handleEndClass}
                      onCancelClass={handleCancelClass}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          ) : (
            <Paper sx={{ p: 2 }}>
              <ClassCalendar
                instances={allInstances}
                onInstanceClick={(instance) => handleEditClass(instance)}
                onInstanceEdit={handleEditClass}
                viewMode={calendarViewMode}
                onViewModeChange={handleCalendarViewModeChange}
                userRole={session.role}
                onEditClass={handleEditClass}
                onDeleteClass={(data) => handleDeleteClass(data)}
                onStartClass={handleStartClass}
                onEndClass={handleEndClass}
                onCancelClass={handleCancelClass}
              />
            </Paper>
          )}

          {/* Floating Action Button for mobile */}
          {session.role === 'admin' && (
            <Fab
              color="primary"
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
        </Box>

        {/* Dialogs */}
        <ClassFormDialog
          open={isFormDialogOpen}
          onClose={() => {
            setIsFormDialogOpen(false);
            setEditingClass(null);
          }}
          onSubmit={handleFormSubmit}
          classData={editingClass}
          type={editingType}
          mode={formMode}
          instructors={transformedInstructors}
          loading={submitLoading}
        />

        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingClass(null);
          }}
          onConfirm={handleDelete}
          title={`Delete ${deletingClass && 'scheduleId' in deletingClass ? 'Class Instance' : 'Class Schedule'}`}
          itemName={deletingClass?.name || ''}
          itemType={deletingClass && 'scheduleId' in deletingClass ? 'class instance' : 'class schedule'}
          loading={submitLoading}
        />

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}