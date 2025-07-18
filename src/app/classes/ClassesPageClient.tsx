// src/app/classes/ClassesPageClient.tsx - UPDATED WITH DYNAMIC CLASS TYPES (FIXED)
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import ClassCard from '@/app/components/ui/ClassCards';
import ClassCalendar from '@/app/components/ui/ClassCalendar';
import ClassFormDialog from '@/app/components/forms/ClassFormDialog';
import DeleteConfirmationDialog from '@/app/components/ui/DeleteConfirmationDialog';
import { ClassSchedule, ClassInstance, ClassFormData, ClassFilters } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { SessionData } from '../types';
import Layout from '../components/layout/Layout';

interface ClassesPageClientProps {
  session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps): React.JSX.Element {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [allInstances, setAllInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClassData, setEditingClassData] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'schedule' | 'instance' | null>(null);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [instanceDisplayMode, setInstanceDisplayMode] = useState<'cards' | 'calendar'>('cards');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // ============ DYNAMIC CLASS TYPES STATE ============
  const [classTypes, setClassTypes] = useState<Array<{ id: string, name: string, color?: string }>>([]);
  const [classTypesLoading, setClassTypesLoading] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<ClassFilters>({
    classType: undefined,
    instructorId: undefined,
    searchTerm: '',
  });

  // ============ DYNAMIC CLASS TYPES FETCH FUNCTION ============
  const fetchClassTypes = useCallback(async () => {
    try {
      setClassTypesLoading(true);
      const response = await fetch('/api/class-types', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch class types');
      }

      const data = await response.json();
      if (data.success) {
        setClassTypes(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch class types');
      }
    } catch (error) {
      console.error('Error fetching class types:', error);
      setError('Failed to load class types');
    } finally {
      setClassTypesLoading(false);
    }
  }, []);

  // ============ DYNAMIC CLASS TYPE COLOR FUNCTION ============
  const getClassTypeColor = useCallback((classType: string): string => {
    const typeDefinition = classTypes.find(ct => ct.name === classType);
    if (typeDefinition?.color) {
      return typeDefinition.color;
    }

    // Fallback colors
    const defaultColors: Record<string, string> = {
      'MMA': '#e53e3e',
      'BJJ': '#805ad5',
      'Boxing': '#d69e2e',
      'Muay Thai': '#e53e3e',
      'Wrestling': '#38a169',
      'Judo': '#3182ce',
      'Kickboxing': '#ed8936',
      'Fitness': '#4299e1',
      'Yoga': '#48bb78',
      'Kids Martial Arts': '#ed64a6',
    };

    return defaultColors[classType] || '#718096';
  }, [classTypes]);

  // Load instructors
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
        setInstructors(data.data?.map((staff: any) => ({
          id: staff.uid,
          name: staff.fullName,
          specialties: staff.specialties || [],
        })) || []);
      } else {
        throw new Error(data.error || 'Failed to fetch instructors');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load instructors.');
    }
  }, []);

  // Load class schedules
  const loadClassSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/classes/schedules');
      if (!res.ok) throw new Error('Failed to fetch class schedules');
      const data = await res.json();
      setSchedules(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load class schedules.');
    }
  }, []);

  // Load ALL instances once - no date filtering on API
  const loadAllInstances = useCallback(async () => {
    try {
      const res = await fetch('/api/classes/instances');
      if (!res.ok) throw new Error('Failed to fetch class instances');
      const data = await res.json();
      setAllInstances(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load class instances.');
    }
  }, []);

  // Generate virtual instances from single-event schedules
  const generateScheduleInstances = useCallback((schedule: ClassSchedule): ClassInstance[] => {
    if (schedule.recurrence.scheduleType === 'single') {
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + schedule.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      return [{
        id: `schedule-${schedule.id}`,
        scheduleId: schedule.id,
        name: schedule.name,
        classType: schedule.classType,
        instructorId: schedule.instructorId,
        instructorName: schedule.instructorName,
        date: schedule.startDate,
        startTime: schedule.startTime,
        endTime,
        maxParticipants: schedule.maxParticipants,
        registeredParticipants: [],
        waitlist: [],
        status: 'scheduled' as const,
        location: schedule.location || '',
        notes: '',
        duration: schedule.duration,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }];
    }
    return [];
  }, []);

  // ============ UPDATED USEEFFECT - INCLUDES CLASS TYPES ============
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadInstructors(),
          loadClassSchedules(),
          loadAllInstances(),
          fetchClassTypes()
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [loadInstructors, loadClassSchedules, loadAllInstances, fetchClassTypes]);

  // Handle tab changes
  useEffect(() => {
    if (tabIndex === 0) { // Class Schedules tab
      setInstanceDisplayMode('calendar');
      setCurrentCalendarDate(new Date());
      setCalendarViewMode('month');
      setFilters(prev => ({
        ...prev,
        classType: undefined,
        instructorId: undefined,
        searchTerm: '',
        date: undefined
      }));
    } else if (tabIndex === 1) { // Upcoming Classes tab
      setFilters(prev => ({
        ...prev,
        classType: undefined,
        instructorId: undefined,
        date: undefined,
        searchTerm: '',
      }));
      setInstanceDisplayMode('cards');
      setCurrentCalendarDate(new Date());
      setCalendarViewMode('week');
    } else if (tabIndex === 2 && user?.role === 'trainer') { // My Schedule tab
      setFilters(prev => ({
        ...prev,
        instructorId: user.uid,
        classType: undefined,
        searchTerm: '',
        date: undefined
      }));
      setInstanceDisplayMode('calendar');
      setCurrentCalendarDate(new Date());
      setCalendarViewMode('week');
    }
  }, [tabIndex, user]);

  // Filter handling
  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleCreateClassClick = () => {
    setEditingClassData(null);
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  const handleEditClass = (data: ClassSchedule | ClassInstance) => {
    setEditingClassData(data);
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
    setEditingClassData(null);
  };

  const handleSubmitForm = async (formData: ClassFormData, scheduleId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const isEditing = !!editingClassData;
      const url = isEditing
        ? `${scheduleId ? '/api/classes/schedules' : '/api/classes/instances'}/${scheduleId || (editingClassData as ClassInstance).id}`
        : '/api/classes/schedules';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} class`);
      }

      // Refresh data after successful operation
      await Promise.all([
        loadClassSchedules(),
        loadAllInstances(),
        fetchClassTypes()
      ]);

      setIsFormDialogOpen(false);
      setEditingClassData(null);
    } catch (err: any) {
      setError(err.message || `Failed to ${formMode} class.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (data: ClassSchedule | ClassInstance, type: 'schedule' | 'instance') => {
    setDeleteTargetId(data.id);
    setDeleteTargetType(type);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;

    setLoading(true);
    setError(null);
    try {
      const url = deleteTargetType === 'schedule'
        ? `/api/classes/schedules/${deleteTargetId}`
        : `/api/classes/instances/${deleteTargetId}`;

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }

      // Refresh data after successful deletion
      await Promise.all([
        loadClassSchedules(),
        loadAllInstances(),
      ]);

      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete class.');
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered instances
  const filteredInstances = useMemo(() => {
    return allInstances.filter(instance => {
      // Apply filters
      if (filters.classType && instance.classType !== filters.classType) return false;
      if (filters.instructorId && instance.instructorId !== filters.instructorId) return false;
      if (filters.date && instance.date !== filters.date) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !instance.name.toLowerCase().includes(searchLower) &&
          !instance.instructorName.toLowerCase().includes(searchLower) &&
          !instance.classType.toLowerCase().includes(searchLower)
        ) return false;
      }

      return true;
    });
  }, [allInstances, filters]);

  if (loading) {
    return (
      <Layout session={session}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout session={session}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Box sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Classes
          </Typography>
          {(session.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateClassClick}
            >
              Create Class
            </Button>
          )}
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={handleTabChange}>
            <Tab label="Class Schedules" />
            <Tab label="Upcoming Classes" />
            {user?.role === 'trainer' && <Tab label="My Schedule" />}
          </Tabs>
        </Box>

        {/* Filters */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                placeholder="Search classes..."
                value={filters.searchTerm || ''}
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

            {/* ============ UPDATED CLASS TYPE FILTER ============ */}
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Class Type</InputLabel>
                <Select
                  value={filters.classType || ''}
                  label="Class Type"
                  onChange={(e) => handleFilterChange('classType', e.target.value || undefined)}
                  disabled={classTypesLoading}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {classTypes.map((type) => (
                    <MenuItem key={type.id} value={type.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: type.color || '#718096',
                          }}
                        />
                        {type.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={filters.instructorId || ''}
                  label="Instructor"
                  onChange={(e) => handleFilterChange('instructorId', e.target.value || undefined)}
                >
                  <MenuItem value="">All Instructors</MenuItem>
                  {instructors.map((instructor) => (
                    <MenuItem key={instructor.id} value={instructor.id}>{instructor.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={filters.date || ''}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant={instanceDisplayMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setInstanceDisplayMode(instanceDisplayMode === 'cards' ? 'calendar' : 'cards')}
              >
                {instanceDisplayMode === 'cards' ? 'Calendar View' : 'Card View'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Content */}
        {instanceDisplayMode === 'cards' ? (
          <Grid container spacing={2}>
            {filteredInstances.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="h6" textAlign="center" color="text.secondary">
                  No classes found matching your filters.
                </Typography>
              </Grid>
            ) : (
              filteredInstances.map((instance) => (
                <Grid item xs={12} sm={6} md={4} key={instance.id}>
                  <ClassCard
                    classData={instance}
                    type="instance"
                    onEdit={handleEditClass}
                    onDelete={(id, type) => handleDeleteClass(instance, type)}
                  />
                </Grid>
              ))
            )}
          </Grid>
        ) : (
          <ClassCalendar
            classes={filteredInstances}
            viewMode={calendarViewMode}
            onViewModeChange={setCalendarViewMode}
            onEditClass={handleEditClass}
            onDeleteClass={(instance, type) => handleDeleteClass(instance, type)}
            userRole={session.role}
            userId={session.uid}
          />
        )}

        {/* ============ UPDATED FORM DIALOG - PASS CLASS TYPES ============ */}
        <ClassFormDialog
          open={isFormDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleSubmitForm}
          classDataForEdit={editingClassData}
          mode={formMode}
          instructors={instructors}
          classTypes={classTypes}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Class"
          itemName={deleteTargetType === 'schedule' ? 'schedule' : 'instance'}
          itemType="class"
          loading={loading}
        />
      </Box>
    </Layout>
  );
}