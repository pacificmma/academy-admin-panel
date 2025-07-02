// src/app/classes/ClassesPageClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ClassSchedule, ClassInstance, ClassFormData, ClassFilters, CLASS_TYPE_OPTIONS } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { SessionData } from '../types';
import Layout from '../components/layout/Layout';

interface ClassesPageClientProps {
  session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps): React.JSX.Element {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClassData, setEditingClassData] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'schedule' | 'instance' | null>(null);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day' | 'month'>('week'); // Default to week view
  const [instanceDisplayMode, setInstanceDisplayMode] = useState<'cards' | 'calendar'>(
    (session.role === 'trainer' && tabIndex === 2) || tabIndex === 0 ? 'calendar' : 'cards'
  );

  // State to manage the currently viewed date in the calendar
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const [filters, setFilters] = useState<ClassFilters>({
    classType: undefined,
    instructorId: undefined,
    date: format(new Date(), 'yyyy-MM-dd'),
    searchTerm: '',
  });

  const loadInstructors = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to fetch instructors');
      const data = await res.json();
      setInstructors(data.data.map((staff: any) => ({ id: staff.uid, name: staff.fullName, specialties: staff.specializations || [] })));
    } catch (err: any) {
      setError(err.message || 'Failed to load instructors.');
    }
  }, []);

  const loadClassSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/classes/schedules');
      if (!res.ok) throw new Error('Failed to fetch class schedules');
      const data = await res.json();
      setSchedules(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load class schedules.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClassInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      
      // Determine the date range based on calendar view mode and currentCalendarDate
      let rangeStart: Date;
      let rangeEnd: Date;

      if (calendarViewMode === 'day') {
        rangeStart = currentCalendarDate;
        rangeEnd = currentCalendarDate;
      } else if (calendarViewMode === 'week') {
        rangeStart = startOfWeek(currentCalendarDate, { weekStartsOn: 1 }); // Monday as start of week
        rangeEnd = endOfWeek(currentCalendarDate, { weekStartsOn: 1 }); // Sunday as end of week
      } else { // month view
        rangeStart = startOfMonth(currentCalendarDate);
        rangeEnd = endOfMonth(currentCalendarDate);
      }

      queryParams.append('startDate', format(rangeStart, 'yyyy-MM-dd'));
      queryParams.append('endDate', format(rangeEnd, 'yyyy-MM-dd'));

      if (filters.classType) queryParams.append('classType', filters.classType);
      if (filters.instructorId) queryParams.append('instructorId', filters.instructorId);
      if (filters.searchTerm) queryParams.append('search', filters.searchTerm);
      
      // Apply instructorId filter for "My Schedule" tab
      if (tabIndex === 2 && user?.uid) {
        queryParams.append('instructorId', user.uid);
      }

      const res = await fetch(`/api/classes/instances?${queryParams.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch class instances');
      }
      const data = await res.json();
      setInstances(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load class instances.');
    } finally {
      setLoading(false);
    }
  }, [filters, tabIndex, user?.uid, currentCalendarDate, calendarViewMode]);

  // Effect to load instructors once on component mount
  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  // Effect to handle tab changes and set initial states for each tab
  useEffect(() => {
    if (tabIndex === 0) { // Class Schedules tab
      loadClassSchedules();
      setInstanceDisplayMode('calendar');
      setCurrentCalendarDate(new Date()); // Reset calendar date to today
      setCalendarViewMode('month'); // Default for schedules to month view
      setFilters(prev => ({ ...prev, classType: undefined, instructorId: undefined, searchTerm: '', date: undefined })); // Clear filters for schedules
    } else if (tabIndex === 1) { // Upcoming Classes tab
      setFilters(prev => ({
        ...prev,
        classType: undefined,
        instructorId: undefined,
        date: format(new Date(), 'yyyy-MM-dd'), // Default date filter for cards view
        searchTerm: '',
      }));
      setInstanceDisplayMode('cards'); // Default to card view
      setCurrentCalendarDate(new Date()); // Reset calendar date to today
      setCalendarViewMode('day'); // Default for cards view calendar logic
    } else if (tabIndex === 2 && user?.role === 'trainer') { // My Schedule tab
      setFilters(prev => ({ ...prev, instructorId: user.uid, classType: undefined, searchTerm: '' }));
      setInstanceDisplayMode('calendar'); // Default to calendar view
      setCurrentCalendarDate(new Date()); // Reset calendar date to today
      setCalendarViewMode('week'); // Default for my schedule to week view
    }
  }, [tabIndex, loadClassSchedules, user]);

  // Effect to load class instances based on relevant state changes
  useEffect(() => {
    if (tabIndex === 1 || (tabIndex === 2 && user?.role === 'trainer')) {
      loadClassInstances();
    }
    // For tabIndex 0 (Class Schedules), instances are derived from schedules (classesToDisplayInCalendar),
    // so no separate loadClassInstances call is needed here.
  }, [filters, currentCalendarDate, calendarViewMode, tabIndex, loadClassInstances, user]);

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
    try {
      let res: Response;
      if (formMode === 'create') {
        res = await fetch('/api/classes/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include',
        });
      } else {
        if (!editingClassData) throw new Error('No class selected for editing.');

        if ('recurrence' in editingClassData) {
          res = await fetch(`/api/classes/schedules/${editingClassData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include',
          });
        } else {
          const instanceUpdateData = {
            name: formData.name,
            classType: formData.classType,
            instructorId: formData.instructorId,
            maxParticipants: formData.maxParticipants,
            duration: formData.duration,
            date: formData.startDate,
            startTime: formData.startTime,
          };
          res = await fetch(`/api/classes/instances/${editingClassData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(instanceUpdateData),
            credentials: 'include',
          });
        }
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Class ${formMode} operation failed`);
      }

      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances();
      }
      handleCloseFormDialog();
    } catch (err: any) {
      setError(err.message || `Class ${formMode} operation failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (data: ClassSchedule | ClassInstance, type: 'schedule' | 'instance') => {
    setDeleteTargetId(data.id);
    setDeleteTargetType(type);
    setEditingClassData(data);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;

    setLoading(true);
    try {
      const endpoint = deleteTargetType === 'schedule'
        ? `/api/classes/schedules/${deleteTargetId}`
        : `/api/classes/instances/${deleteTargetId}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
        body: deleteTargetType === 'instance' ? JSON.stringify({ reason: 'Admin/Trainer initiated cancellation' }) : undefined,
        headers: deleteTargetType === 'instance' ? { 'Content-Type': 'application/json' } : undefined,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `${deleteTargetType} deletion failed`);
      }

      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances();
      }
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
      setEditingClassData(null);
    } catch (err: any) {
      setError(err.message || `${deleteTargetType} deletion failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
    setEditingClassData(null);
  };

  const handleInstanceAction = useCallback(async (instanceId: string, action: 'start' | 'end' | 'cancel') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/instances/${instanceId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ reason: 'Action initiated from admin panel' }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Class ${action} operation failed`);
      }
      loadClassInstances();
    } catch (err: any) {
      setError(err.message || `Class ${action} operation failed.`);
    } finally {
      setLoading(false);
    }
  }, [loadClassInstances]);

  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Callback for when calendar date changes
  const handleCalendarDateChange = (date: Date) => {
    setCurrentCalendarDate(date);
    // Only update filters.date if we are in the "Upcoming Classes" tab (card view with date filter)
    if (tabIndex === 1) {
      setFilters(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    }
  };

  // Callback for when calendar view mode changes
  const handleCalendarViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setCalendarViewMode(mode);
  };

  // Prepare classes for calendar display based on the active tab
  const classesToDisplayInCalendar = tabIndex === 0 ? schedules.map(schedule => ({
    ...schedule,
    id: schedule.id,
    scheduleId: schedule.id,
    date: schedule.startDate,
    endTime: `${Math.floor((parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1]) + schedule.duration) / 60).toString().padStart(2, '0')}:${((parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1]) + schedule.duration) % 60).toString().padStart(2, '0')}`,
    registeredParticipants: [],
    waitlist: [],
    status: 'scheduled',
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  })) as ClassInstance[] : instances;


  return (
    <Layout session={session} title="Classes">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Class Management
          </Typography>
          {(session?.role === 'admin' || session?.role === 'staff') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateClassClick}
            >
              Schedule New Class
            </Button>
          )}
        </Box>

        <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Class Schedules" />
          <Tab label="Upcoming Classes" />
          {session?.role === 'trainer' && <Tab label="My Schedule" />}
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <Box>
            {tabIndex === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  All Class Schedules
                </Typography>
                {schedules.length === 0 ? (
                  <Alert severity="info">No class schedules found. Create one to get started!</Alert>
                ) : (
                  <ClassCalendar
                    classes={classesToDisplayInCalendar}
                    viewMode={calendarViewMode}
                    onViewModeChange={handleCalendarViewModeChange}
                    onClassClick={handleEditClass}
                    onDateClick={handleCalendarDateChange}
                    selectedDate={currentCalendarDate}
                    onEditClass={handleEditClass}
                    onDeleteClass={(data, type) => handleDeleteClass(data, 'schedule')}
                    userRole={session?.role || 'member'}
                    userId={session?.uid || ''}
                  />
                )}
              </Box>
            )}

            {tabIndex === 1 && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth>
                      <InputLabel>Class Type</InputLabel>
                      <Select
                        value={filters.classType || ''}
                        label="Class Type"
                        onChange={(e) => handleFilterChange('classType', e.target.value || undefined)}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        {CLASS_TYPE_OPTIONS.map((type) => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
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
                      value={filters.date} // This filter is for specific day in cards view
                      onChange={(e) => handleFilterChange('date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  {instances.length === 0 ? (
                    <Grid item xs={12}>
                      <Alert severity="info">No upcoming classes found for selected filters.</Alert>
                    </Grid>
                  ) : (
                    instances
                      .sort((a, b) => {
                        const dateA = parseISO(a.date);
                        const dateB = parseISO(b.date);
                        if (dateA.getTime() !== dateB.getTime()) {
                          return dateA.getTime() - dateB.getTime();
                        }
                        const [hA, mA] = a.startTime.split(':').map(Number);
                        const [hB, mB] = b.startTime.split(':').map(Number);
                        return (hA * 60 + mA) - (hB * 60 + mB);
                      })
                      .map((instance) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={instance.id}>
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
              </Box>
            )}

            {tabIndex === 2 && session?.role === 'trainer' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  My Scheduled Classes
                </Typography>
                <ClassCalendar
                    classes={classesToDisplayInCalendar}
                    viewMode={calendarViewMode}
                    onViewModeChange={handleCalendarViewModeChange}
                    onClassClick={handleEditClass}
                    onDateClick={handleCalendarDateChange}
                    selectedDate={currentCalendarDate}
                    onEditClass={handleEditClass}
                    onDeleteClass={(data, type) => handleDeleteClass(data, 'instance')}
                    userRole={session?.role || 'member'}
                    userId={session?.uid || ''}
                    onStartClass={(instanceId) => handleInstanceAction(instanceId, 'start')}
                    onEndClass={(instanceId) => handleInstanceAction(instanceId, 'end')}
                    onCancelClass={(instanceId) => handleInstanceAction(instanceId, 'cancel')}
                  />
              </Box>
            )}
          </Box>
        )}

        <ClassFormDialog
          open={isFormDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleSubmitForm}
          classDataForEdit={editingClassData}
          mode={formMode}
          instructors={instructors}
        />

        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title={`Confirm ${deleteTargetType === 'schedule' ? 'Schedule Deletion' : 'Class Instance Cancellation'}`}
          itemName={editingClassData?.name || ''}
          itemType={deleteTargetType === 'schedule' ? 'class schedule' : 'class instance'}
          loading={loading}
          warningMessage={deleteTargetType === 'schedule' ? "This action will delete the class schedule AND ALL RELATED INSTANCES." : "This action will cancel this specific class instance."}
          additionalInfo={editingClassData && !('recurrence' in editingClassData) ? [
            { label: 'Date', value: format(parseISO((editingClassData as ClassInstance).date), 'PPP') },
            { label: 'Time', value: (editingClassData as ClassInstance).startTime },
            { label: 'Instructor', value: (editingClassData as ClassInstance).instructorName }
          ] : []}
        />
      </Box>
    </Layout>
  );
}