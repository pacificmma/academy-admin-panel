// src/app/classes/ClassesPageClient.tsx - Fixed controlled/uncontrolled issues
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

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [editingType, setEditingType] = useState<'schedule' | 'instance'>('schedule');
  const [deletingClass, setDeletingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Filters - Initialize with default values to prevent controlled/uncontrolled issues
  const [filters, setFilters] = useState<ClassFilters>(DEFAULT_FILTERS);

  // Load instructors data
  const loadInstructors = useCallback(async () => {
    try {
      // Get all active staff members, then filter for trainers on client side
      const response = await fetch('/api/staff?status=active');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter for trainers and visiting trainers on client side
          const trainers = (data.data || []).filter((staff: StaffRecord) => 
            staff.role === 'trainer' || staff.role === 'visiting_trainer'
          );
          setInstructors(trainers);
        } else {
          console.error('Failed to load instructors:', data.error);
          setInstructors([]);
        }
      } else {
        console.error('Failed to load instructors: HTTP', response.status);
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors([]);
    }
  }, []);

  // Load class schedules
  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/schedules');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      setError('Failed to load class schedules');
    }
  }, []);

  // Load class instances
  const loadInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/instances');
      if (response.ok) {
        const data = await response.json();
        setAllInstances(data.data || []);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
      setError('Failed to load class instances');
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
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadSchedules, loadInstances, loadInstructors]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes with proper typing
  const handleFilterChange = useCallback((key: keyof ClassFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || '', // Ensure we never set undefined values
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Get unique class types for filter
  const uniqueClassTypes = useMemo(() => {
    const types = new Set<string>();
    schedules.forEach(schedule => {
      if (schedule.classType) types.add(schedule.classType);
    });
    allInstances.forEach(instance => {
      if (instance.classType) types.add(instance.classType);
    });
    return Array.from(types).sort();
  }, [schedules, allInstances]);

  // Combine and filter data
  const filteredData = useMemo(() => {
    const combined = [...schedules, ...allInstances];
    
    return combined.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(searchLower);
        const matchesInstructor = item.instructorName?.toLowerCase().includes(searchLower);
        const matchesType = item.classType?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesInstructor && !matchesType) {
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
      
      // Status filter for instances
      if ('status' in item && filters.status !== 'all') {
        if (filters.status === 'active' && item.status === 'cancelled') {
          return false;
        }
        if (filters.status === 'inactive' && item.status !== 'cancelled') {
          return false;
        }
      }
      
      return true;
    });
  }, [schedules, allInstances, filters]);

  // Handle form submission
  const handleFormSubmit = async (formData: ClassFormData, scheduleId?: string) => {
    setSubmitLoading(true);
    try {
      const endpoint = scheduleId 
        ? `/api/classes/schedules/${scheduleId}`
        : '/api/classes/schedules';
      
      const method = scheduleId ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccessMessage(
          formMode === 'create' 
            ? 'Class created successfully!' 
            : 'Class updated successfully!'
        );
        await loadData();
        setIsFormDialogOpen(false);
        setEditingClass(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save class');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to save class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingClass) return;
    
    setSubmitLoading(true);
    try {
      const isInstance = 'scheduleId' in deletingClass;
      const endpoint = isInstance 
        ? `/api/classes/instances/${deletingClass.id}`
        : `/api/classes/schedules/${deletingClass.id}`;
      
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (response.ok) {
        setSuccessMessage(
          `${isInstance ? 'Class instance' : 'Class schedule'} deleted successfully!`
        );
        await loadData();
        setIsDeleteDialogOpen(false);
        setDeletingClass(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      setError('Failed to delete class');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle edit class
  const handleEditClass = (classData: ClassSchedule | ClassInstance) => {
    setEditingClass(classData);
    setEditingType('scheduleId' in classData ? 'instance' : 'schedule');
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  // Handle delete class
  const handleDeleteClass = (classData: ClassSchedule | ClassInstance) => {
    setDeletingClass(classData);
    setIsDeleteDialogOpen(true);
  };

  // Handle create new class
  const handleCreateClass = () => {
    setEditingClass(null);
    setEditingType('schedule');
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  // Class management actions (for instances)
  const handleStartClass = async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/start`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setSuccessMessage('Class started successfully!');
        await loadData();
      } else {
        setError('Failed to start class');
      }
    } catch (error) {
      console.error('Error starting class:', error);
      setError('Failed to start class');
    }
  };

  const handleEndClass = async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/end`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setSuccessMessage('Class ended successfully!');
        await loadData();
      } else {
        setError('Failed to end class');
      }
    } catch (error) {
      console.error('Error ending class:', error);
      setError('Failed to end class');
    }
  };

  const handleCancelClass = async (instanceId: string) => {
    try {
      const response = await fetch(`/api/classes/instances/${instanceId}/cancel`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setSuccessMessage('Class cancelled successfully!');
        await loadData();
      } else {
        setError('Failed to cancel class');
      }
    } catch (error) {
      console.error('Error cancelling class:', error);
      setError('Failed to cancel class');
    }
  };

  if (loading) {
    return (
      <Layout session={session}>
        <Container maxWidth="xl">
          <Box display="flex" flexDirection="column" gap={3}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={400} />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" fontWeight="bold">
              Class Management
            </Typography>
            
            <Box display="flex" gap={2}>
              <Button
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
                >
                  Create Class
                </Button>
              )}
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* View Toggle */}
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Tabs
                value={viewMode}
                onChange={(_, newValue) => setViewMode(newValue)}
              >
                <Tab
                  icon={<ListIcon />}
                  label="List View"
                  value="list"
                />
                <Tab
                  icon={<CalendarIcon />}
                  label="Calendar View"
                  value="calendar"
                />
              </Tabs>
            </Box>

            {/* Filters */}
            <Box>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
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

                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Class Type</InputLabel>
                    <Select
                      value={filters.classType}
                      onChange={(e) => handleFilterChange('classType', e.target.value)}
                      label="Class Type"
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

                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Instructor</InputLabel>
                    <Select
                      value={filters.instructorId}
                      onChange={(e) => handleFilterChange('instructorId', e.target.value)}
                      label="Instructor"
                    >
                      <MenuItem value="">All Instructors</MenuItem>
                      {instructors.map((instructor) => (
                        <MenuItem key={instructor.id} value={instructor.id}>
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
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={2}>
                  <Box display="flex" gap={1}>
                    <Button size="small" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      {filteredData.length} results
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Content */}
          {viewMode === 'list' ? (
            <Grid container spacing={2}>
              {filteredData.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No classes found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filters.searchTerm || filters.classType || filters.instructorId 
                        ? 'Try adjusting your filters or search terms.'
                        : 'Create your first class to get started.'}
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                filteredData.map((classData) => (
                  <Grid item xs={12} md={6} lg={4} key={classData.id}>
                    <ClassCard
                      classData={classData}
                      type={'scheduleId' in classData ? 'instance' : 'schedule'}
                      onEdit={session.role === 'admin' ? handleEditClass : undefined}
                      onDelete={session.role === 'admin' ? handleDeleteClass : undefined}
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
                onInstanceClick={handleEditClass}
                onInstanceEdit={handleEditClass}
                loading={loading}
              />
            </Paper>
          )}
        </Box>

        {/* Create Class FAB */}
        {session.role === 'admin' && (
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={handleCreateClass}
          >
            <AddIcon />
          </Fab>
        )}

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
          instructors={instructors.map(instructor => ({
            id: instructor.id,
            name: instructor.fullName,
            // Remove specialties since it doesn't exist on StaffRecord
          }))}
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
          warningMessage="This action will permanently remove all associated data."
          additionalInfo={deletingClass ? [
            { label: 'Class Type', value: deletingClass.classType },
            { label: 'Instructor', value: deletingClass.instructorName },
          ] : []}
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