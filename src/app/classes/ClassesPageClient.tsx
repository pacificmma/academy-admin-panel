// src/app/classes/ClassesPageClient.tsx - UPDATED VERSION
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
import { ClassSchedule, ClassInstance, ClassFormData, ClassFilters, CLASS_TYPE_OPTIONS } from '@/app/types/class';
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
  const [instanceDisplayMode, setInstanceDisplayMode] = useState<'cards' | 'calendar'>(
    (session.role === 'trainer' && tabIndex === 2) || tabIndex === 0 ? 'calendar' : 'cards'
  );

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const [filters, setFilters] = useState<ClassFilters>({
    classType: undefined,
    instructorId: undefined,
    date: format(new Date(), 'yyyy-MM-dd'),
    searchTerm: '',
  });

  // Load instructors once
  const loadInstructors = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to fetch instructors');
      const data = await res.json();
      setInstructors(data.data.map((staff: any) => ({
        id: staff.uid,
        name: staff.fullName,
        specialties: staff.specializations || []
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load instructors.');
    }
  }, []);

  // Load schedules once
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
      // Simple request - get everything, let frontend handle filtering
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

  // Load all data once on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadInstructors(),
          loadClassSchedules(),
          loadAllInstances()
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [loadInstructors, loadClassSchedules, loadAllInstances]);

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
        date: undefined  // Clear date filter for schedules
      }));
    } else if (tabIndex === 1) { // Upcoming Classes tab
      setFilters(prev => ({
        ...prev,
        classType: undefined,
        instructorId: undefined,
        date: undefined,  // Don't set a default date - let it show all upcoming
        searchTerm: '',
      }));
      setInstanceDisplayMode('cards');  // Default to cards for upcoming classes
      setCurrentCalendarDate(new Date());
      setCalendarViewMode('week');  // Better for viewing upcoming classes in calendar
    } else if (tabIndex === 2 && user?.role === 'trainer') { // My Schedule tab
      setFilters(prev => ({
        ...prev,
        instructorId: user.uid,
        classType: undefined,
        searchTerm: '',
        date: undefined  // Clear date filter for trainer schedule
      }));
      setInstanceDisplayMode('calendar');
      setCurrentCalendarDate(new Date());
      setCalendarViewMode('week');
    }
  }, [tabIndex, user]);

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

      setIsFormDialogOpen(false);
      setEditingClassData(null);

      // Reload data after changes
      if (tabIndex === 0) {
        await loadClassSchedules();
      }
      await loadAllInstances();

    } catch (err: any) {
      setError(err.message || `Failed to ${formMode} class.`);
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

      // Reload data after deletion
      if (tabIndex === 0) {
        await loadClassSchedules();
      }
      await loadAllInstances();

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
      await loadAllInstances(); // Reload instances after action
    } catch (err: any) {
      setError(err.message || `Class ${action} operation failed.`);
    } finally {
      setLoading(false);
    }
  }, [loadAllInstances]);

  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // FIXED: Added missing handleCalendarDateChange function
  const handleCalendarDateChange = (date: Date) => {
    setCurrentCalendarDate(date);
    // For tab 1 (Upcoming Classes), also update the date filter if in cards mode
    if (tabIndex === 1 && instanceDisplayMode === 'cards') {
      setFilters(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    }
  };

  const handleCalendarViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setCalendarViewMode(mode);
  };

  // Filter instances based on current view and filters - ALL CLIENT SIDE
  const filteredInstances = useMemo(() => {
    let filtered = [...allInstances];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(instance =>
        instance.name.toLowerCase().includes(searchLower) ||
        instance.instructorName.toLowerCase().includes(searchLower) ||
        instance.classType.toLowerCase().includes(searchLower) ||
        instance.notes?.toLowerCase().includes(searchLower) ||
        instance.location?.toLowerCase().includes(searchLower)
      );
    }

    // Apply class type filter
    if (filters.classType) {
      filtered = filtered.filter(instance => instance.classType === filters.classType);
    }

    // Apply instructor filter
    if (filters.instructorId) {
      filtered = filtered.filter(instance => instance.instructorId === filters.instructorId);
    }

    // Apply trainer filter for "My Schedule" tab
    if (tabIndex === 2 && user?.role === 'trainer' && user?.uid) {
      filtered = filtered.filter(instance => instance.instructorId === user.uid);
    }

    // Apply date filter ONLY for cards view in tab 1 (Upcoming Classes)
    if (tabIndex === 1 && instanceDisplayMode === 'cards' && filters.date) {
      filtered = filtered.filter(instance => instance.date === filters.date);
    }

    // FIXED: Apply calendar view range filter for calendar views with proper date parsing
    if (tabIndex === 0 || (tabIndex === 1 && instanceDisplayMode === 'calendar') || tabIndex === 2) {
      let rangeStart: Date;
      let rangeEnd: Date;

      if (calendarViewMode === 'day') {
        rangeStart = new Date(currentCalendarDate);
        rangeEnd = new Date(currentCalendarDate);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(23, 59, 59, 999);
      } else if (calendarViewMode === 'week') {
        rangeStart = startOfWeek(currentCalendarDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(currentCalendarDate, { weekStartsOn: 1 });
      } else { // month view
        rangeStart = startOfMonth(currentCalendarDate);
        rangeEnd = endOfMonth(currentCalendarDate);
      }

      filtered = filtered.filter(instance => {
        // FIXED: Parse the date string properly (YYYY-MM-DD format) to avoid timezone issues
        const instanceDate = new Date(instance.date + 'T00:00:00.000Z');
        const instanceDateLocal = new Date(instanceDate.getUTCFullYear(), instanceDate.getUTCMonth(), instanceDate.getUTCDate());
        return isWithinInterval(instanceDateLocal, { start: rangeStart, end: rangeEnd });
      });
    }

    // FIXED: For tab 1 (Upcoming Classes) when in cards view, show future classes only
    if (tabIndex === 1 && instanceDisplayMode === 'cards' && !filters.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(instance => {
        // FIXED: Parse the date string properly to avoid timezone issues
        const instanceDate = new Date(instance.date + 'T00:00:00.000Z');
        const instanceDateLocal = new Date(instanceDate.getUTCFullYear(), instanceDate.getUTCMonth(), instanceDate.getUTCDate());
        return instanceDateLocal >= today;
      });

      // Sort by date and time for upcoming classes
      filtered.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare === 0) {
          return a.startTime.localeCompare(b.startTime);
        }
        return dateCompare;
      });
    }

    return filtered;
  }, [allInstances, filters, tabIndex, user, instanceDisplayMode, calendarViewMode, currentCalendarDate]);

  // Prepare classes for calendar display
  const classesToDisplayInCalendar = useMemo(() => {
    if (tabIndex === 0) {
      // For Class Schedules tab: combine schedule instances and real instances
      const scheduleInstances: ClassInstance[] = [];

      schedules.forEach(schedule => {
        if (schedule.recurrence.scheduleType === 'single') {
          scheduleInstances.push(...generateScheduleInstances(schedule));
        }
      });

      const allInstances = [...scheduleInstances, ...filteredInstances];

      // Remove duplicates
      return allInstances.filter((instance, index, self) => {
        return index === self.findIndex(i =>
          i.scheduleId === instance.scheduleId &&
          i.date === instance.date &&
          i.startTime === instance.startTime
        );
      });
    }

    return filteredInstances;
  }, [tabIndex, schedules, filteredInstances, generateScheduleInstances]);

  // src/app/classes/ClassesPageClient.tsx - FIXED VERSION
  // Only the updated sections that need to change

  // Replace the existing return statement in the ClassesPageClient component:

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
                {/* FIXED: Always show calendar for tab 0, regardless of filtered events count */}
                <ClassCalendar
                  classes={classesToDisplayInCalendar}
                  viewMode={calendarViewMode}
                  onViewModeChange={handleCalendarViewModeChange}
                  onClassClick={handleEditClass}
                  onDateClick={handleCalendarDateChange}
                  selectedDate={currentCalendarDate}
                  userRole={session.role}
                  onEditClass={handleEditClass}
                  onDeleteClass={handleDeleteClass}
                  onStartClass={handleInstanceAction.bind(null, '', 'start')}
                  onEndClass={handleInstanceAction.bind(null, '', 'end')}
                  onCancelClass={handleInstanceAction.bind(null, '', 'cancel')}
                  userId={user?.uid || ''}
                />
              </Box>
            )}

            {tabIndex === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Upcoming Classes
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
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
                      value={filters.date}
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

                {instanceDisplayMode === 'cards' ? (
                  <Grid container spacing={2}>
                    {filteredInstances.length === 0 ? (
                      <Grid item xs={12}>
                        <Alert severity="info">No upcoming classes found for the selected filters.</Alert>
                      </Grid>
                    ) : (
                      filteredInstances.map(instance => (
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
                  /* FIXED: Always show calendar for tab 1 calendar view, regardless of filtered events count */
                  <ClassCalendar
                    classes={filteredInstances}
                    viewMode={calendarViewMode}
                    onViewModeChange={handleCalendarViewModeChange}
                    onClassClick={handleEditClass}
                    onDateClick={handleCalendarDateChange}
                    selectedDate={currentCalendarDate}
                    userRole={session.role}
                    onEditClass={handleEditClass}
                    onDeleteClass={handleDeleteClass}
                    onStartClass={handleInstanceAction.bind(null, '', 'start')}
                    onEndClass={handleInstanceAction.bind(null, '', 'end')}
                    onCancelClass={handleInstanceAction.bind(null, '', 'cancel')}
                    userId={user?.uid || ''}
                  />
                )}
              </Box>
            )}

            {tabIndex === 2 && session?.role === 'trainer' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  My Schedule
                </Typography>
                {/* FIXED: Always show calendar for tab 2, regardless of filtered events count */}
                <ClassCalendar
                  classes={filteredInstances}
                  viewMode={calendarViewMode}
                  onViewModeChange={handleCalendarViewModeChange}
                  onClassClick={handleEditClass}
                  onDateClick={handleCalendarDateChange}
                  selectedDate={currentCalendarDate}
                  userRole={session.role}
                  onEditClass={handleEditClass}
                  onDeleteClass={handleDeleteClass}
                  onStartClass={handleInstanceAction.bind(null, '', 'start')}
                  onEndClass={handleInstanceAction.bind(null, '', 'end')}
                  onCancelClass={handleInstanceAction.bind(null, '', 'cancel')}
                  userId={user?.uid || ''}
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