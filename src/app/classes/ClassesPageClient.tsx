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

  // Filters
  const [filters, setFilters] = useState<ClassFilters>({
    searchTerm: '',
    classType: '',
    instructorId: '',
    status: 'all',
    dateRange: 'all',
  });

  // Load data functions
  const loadInstructors = useCallback(async () => {
    try {
      const response = await fetch('/api/staff', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load instructors');
      }

      const result = await response.json();
      if (result.success) {
        const trainers = result.data.filter((staff: StaffRecord) => 
          staff.role === 'trainer' || staff.role === 'visiting_trainer'
        );
        setInstructors(trainers);
      }
    } catch (err) {
      console.error('Error loading instructors:', err);
      setInstructors([]);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/schedules', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load class schedules');
      }

      const result = await response.json();
      if (result.success) {
        setSchedules(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load schedules');
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
      setSchedules([]);
    }
  }, []);

  const loadInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/instances', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load class instances');
      }

      const result = await response.json();
      if (result.success) {
        setAllInstances(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load instances');
      }
    } catch (err) {
      console.error('Error loading instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to load instances');
      setAllInstances([]);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadInstructors(),
        loadSchedules(),
        loadInstances(),
      ]);
    } catch (err) {
      setError('Failed to load class data');
    } finally {
      setLoading(false);
    }
  }, [loadInstructors, loadSchedules, loadInstances]);

  // Transform StaffRecord to instructor format for ClassFormDialog
  const instructorsForForm = useMemo(() => 
    instructors.map(instructor => ({
      id: instructor.id,
      name: instructor.fullName, // Map fullName to name
      specialties: instructor.specializations || [], // Map specializations to specialties
    })), 
    [instructors]
  );

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let items: (ClassSchedule | ClassInstance)[] = [];
    
    if (viewMode === 'list') {
      items = [...schedules, ...allInstances];
    } else {
      items = allInstances; // Calendar only shows instances
    }

    return items.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!item.name.toLowerCase().includes(searchLower) &&
            !item.instructorName.toLowerCase().includes(searchLower) &&
            !item.classType.toLowerCase().includes(searchLower)) {
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
      if (filters.status !== 'all' && 'status' in item) {
        if (filters.status === 'active' && item.status === 'cancelled') {
          return false;
        }
        if (filters.status === 'inactive' && item.status !== 'cancelled') {
          return false;
        }
      }

      return true;
    });
  }, [schedules, allInstances, filters, viewMode]);

  // Get unique class types for filter
  const uniqueClassTypes = useMemo(() => {
    const types = new Set([
      ...schedules.map(s => s.classType),
      ...allInstances.map(i => i.classType),
    ]);
    return Array.from(types).sort();
  }, [schedules, allInstances]);

  // Form handlers
  const handleCreateClass = () => {
    setEditingClass(null);
    setEditingType('schedule');
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  const handleEditClass = (classData: ClassSchedule | ClassInstance) => {
    setEditingClass(classData);
    setEditingType('scheduleId' in classData ? 'instance' : 'schedule');
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  const handleDeleteClass = (classData: ClassSchedule | ClassInstance) => {
    setDeletingClass(classData);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ClassFormData, scheduleId?: string) => {
    setSubmitLoading(true);
    try {
      let response: Response;
      
      if (formMode === 'create') {
        // Creating new schedule
        response = await fetch('/api/classes/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
      } else {
        // Editing existing
        if (editingType === 'schedule' && editingClass && 'recurrence' in editingClass) {
          response = await fetch(`/api/classes/schedules/${editingClass.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });
        } else if (editingType === 'instance' && editingClass && 'scheduleId' in editingClass) {
          response = await fetch(`/api/classes/instances/${editingClass.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });
        } else {
          throw new Error('Invalid editing configuration');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save class');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save class');
      }

      setSuccessMessage(
        formMode === 'create' ? 'Class created successfully' : 'Class updated successfully'
      );
      
      // Reload data to get updated lists
      await loadAllData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClass) return;

    try {
      setSubmitLoading(true);
      let response: Response;

      if ('recurrence' in deletingClass) {
        // Deleting schedule
        response = await fetch(`/api/classes/schedules/${deletingClass.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } else {
        // Deleting instance
        response = await fetch(`/api/classes/instances/${deletingClass.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete class');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete class');
      }

      setSuccessMessage('Class deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingClass(null);
      
      // Reload data
      await loadAllData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setSubmitLoading(false);
    }
  };

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

  const handleRefresh = () => {
    loadAllData();
  };

  if (loading) {
    return (
      <Layout session={session}>
        <Container maxWidth="xl">
          <Box py={3}>
            <Skeleton variant="text" width={200} height={40} />
            <Box mt={2}>
              <Grid container spacing={2}>
                {[1, 2, 3, 4].map((i) => (
                  <Grid item xs={12} md={6} lg={4} key={i}>
                    <Skeleton variant="rectangular" height={200} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Container maxWidth="xl">
        <Box py={3}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Classes
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage class schedules and instances
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
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
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* View Mode Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={viewMode}
              onChange={(_, newValue) => setViewMode(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                value="list"
                label="List View"
                icon={<ListIcon />}
                iconPosition="start"
              />
              <Tab
                value="calendar"
                label="Calendar View"
                icon={<CalendarIcon />}
                iconPosition="start"
              />
            </Tabs>

            {/* Filters */}
            <Box p={2}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
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

                <Grid item xs={12} md={3}>
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
                    />
                  </Grid>
                ))
              )}
            </Grid>
          ) : (
            <ClassCalendar
              instances={allInstances}
              onInstanceEdit={session.role === 'admin' ? handleEditClass : undefined}
              loading={loading}
            />
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
      </Container>

      {/* Dialogs */}
      <ClassFormDialog
        open={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSubmit={handleFormSubmit}
        classData={editingClass}
        type={editingType}
        mode={formMode}
        instructors={instructorsForForm}
        loading={submitLoading}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Class"
        itemName={deletingClass?.name || ''}
        itemType={deletingClass && 'scheduleId' in deletingClass ? 'instance' : 'schedule'}
        loading={submitLoading}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Layout>
  );
}