// src/app/classes/ClassesPageClient.tsx (Modified to use fixed User type and instance editing logic)
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { ClassSchedule, ClassInstance, ClassFormData, ClassType, ClassFilters, CLASS_TYPE_OPTIONS } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function ClassesPageClient() {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'schedule' | 'instance' | null>(null);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);

  // Filters for instances tab
  const [filters, setFilters] = useState<ClassFilters>({
    classType: undefined,
    instructorId: undefined,
    date: format(new Date(), 'yyyy-MM-dd'), // Default to today
    searchTerm: '',
  });

  const loadInstructors = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to fetch instructors');
      const data = await res.json();
      setInstructors(data.data.map((staff: any) => ({ id: staff.id, name: staff.fullName, specialties: staff.specialties || [] })));
    } catch (err: any) {
      console.error('Failed to load instructors:', err);
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
      console.error('Failed to load class schedules:', err);
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
      // Ensure date filter is for today and future for "Upcoming Classes"
      const today = format(new Date(), 'yyyy-MM-dd');
      queryParams.append('date', filters.date || today); // Use filter date, or today

      if (filters.classType) queryParams.append('classType', filters.classType);
      if (filters.instructorId) queryParams.append('instructorId', filters.instructorId);
      if (filters.searchTerm) queryParams.append('search', filters.searchTerm);

      const res = await fetch(`/api/classes/instances?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch class instances');
      const data = await res.json();
      // Filter out past classes on the client-side if date filter is not specific to past dates
      const upcoming = data.data.filter((instance: ClassInstance) => {
        const instanceDateTime = parseISO(`${instance.date}T${instance.startTime}`);
        return instanceDateTime >= new Date(); // Only show instances that are today or in the future
      });
      setInstances(upcoming || []);
    } catch (err: any) {
      console.error('Failed to load class instances:', err);
      setError(err.message || 'Failed to load class instances.');
    } finally {
      setLoading(false);
    }
  }, [filters]); // Depend on filters for reloading

  useEffect(() => {
    loadInstructors();
    if (tabIndex === 0) {
      loadClassSchedules();
    } else if (tabIndex === 1) {
      loadClassInstances();
    } else if (tabIndex === 2 && user?.role === 'trainer') {
      // For 'My Schedule' tab, load instances specific to the logged-in trainer
      setFilters(prev => ({ ...prev, instructorId: user.uid, date: format(new Date(), 'yyyy-MM-dd') }));
      loadClassInstances();
    }
  }, [tabIndex, loadClassSchedules, loadClassInstances, loadInstructors, user]); // Added user to dependencies

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    // Reset filters when changing tabs, or set appropriate defaults
    if (newValue === 1) { // Upcoming Classes tab
      setFilters({
        classType: undefined,
        instructorId: undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
        searchTerm: '',
      });
    } else if (newValue === 0) { // Class Schedules tab
        // No filters for schedules currently, but clear if any were applied
        setFilters({
            classType: undefined,
            instructorId: undefined,
            date: undefined,
            searchTerm: '',
        });
    }
  };

  const handleCreateClassClick = () => {
    setEditingClass(null);
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  const handleEditClass = (data: ClassSchedule | ClassInstance) => {
    setEditingClass(data);
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
    setEditingClass(null);
  };

  const handleSubmitForm = async (formData: ClassFormData) => {
    setLoading(true);
    try {
      let res: Response;
      if (formMode === 'create') {
        res = await fetch('/api/classes/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // Handle editing either a schedule or an instance
        if (!editingClass) throw new Error('No class selected for editing.');

        if ('recurrence' in editingClass) { // It's a ClassSchedule
          res = await fetch(`/api/classes/schedules/${editingClass.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
        } else { // It's a ClassInstance
          // For instances, only specific fields can be updated, and recurrence is not applicable.
          const instanceUpdateData = {
            name: formData.name,
            description: formData.description,
            classType: formData.classType,
            instructorId: formData.instructorId,
            maxParticipants: formData.maxParticipants,
            duration: formData.duration,
            date: formData.startDate,
            startTime: formData.startTime,
            // location, requirements, price, level, tags are not part of ClassFormData for instance update
            // if these fields were needed, they would need to be passed explicitly or part of the instanceUpdateSchema
          };
          res = await fetch(`/api/classes/instances/${editingClass.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(instanceUpdateData),
          });
        }
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${formMode} class`);
      }

      // Reload appropriate data based on the active tab
      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances(); // This will reload for tab 1 and 2 (My Schedule)
      }
      handleCloseFormDialog();
    } catch (err: any) {
      console.error(`Error ${formMode}ing class:`, err);
      setError(err.message || `Failed to ${formMode} class.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (id: string, type: 'schedule' | 'instance') => {
    setDeleteTargetId(id);
    setDeleteTargetType(type);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;

    setLoading(true);
    try {
      const endpoint = deleteTargetType === 'schedule'
        ? `/api/classes/schedules/${deleteTargetId}`
        : `/api/classes/instances/${deleteTargetId}`; // DELETE for instance means cancellation (soft delete)
      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to delete ${deleteTargetType}`);
      }

      // Reload appropriate data
      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances();
      }
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
    } catch (err: any) {
      console.error(`Error deleting ${deleteTargetType}:`, err);
      setError(err.message || `Failed to delete ${deleteTargetType}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
  };

  const handleInstanceAction = useCallback(async (instanceId: string, action: 'start' | 'end' | 'cancel') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/instances/${instanceId}/${action}`, {
        method: 'PATCH', // Using PATCH for status updates
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${action} class`);
      }
      loadClassInstances(); // Reload instances to reflect status change
    } catch (err: any) {
      console.error(`Error ${action}ing class instance:`, err);
      setError(err.message || `Failed to ${action} class.`);
    } finally {
      setLoading(false);
    }
  }, [loadClassInstances]);


  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Class Management
        </Typography>
        {(user?.role === 'admin' || user?.role === 'staff') && (
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
        {user?.role === 'trainer' && <Tab label="My Schedule" />}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
            <Grid container spacing={3}>
              {schedules.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">No class schedules found. Create one to get started!</Alert>
                </Grid>
              ) : (
                schedules.map((schedule) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={schedule.id}>
                    <ClassCard
                      classData={schedule}
                      type="schedule"
                      onEdit={handleEditClass}
                      onDelete={handleDeleteClass}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {tabIndex === 1 && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Search Classes"
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
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Class Type</InputLabel>
                    <Select
                      value={filters.classType || ''}
                      onChange={(e) => handleFilterChange('classType', e.target.value as ClassType)}
                      label="Class Type"
                    >
                      <MenuItem value=""><em>Any</em></MenuItem>
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
                      onChange={(e) => handleFilterChange('instructorId', e.target.value as string)}
                      label="Instructor"
                    >
                      <MenuItem value=""><em>Any</em></MenuItem>
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
              </Grid>

              <Grid container spacing={3}>
                {instances.length === 0 ? ( // Displaying 'instances' directly here now, as API handles filtering
                  <Grid item xs={12}>
                    <Alert severity="info">No upcoming classes found for the selected filters.</Alert>
                  </Grid>
                ) : (
                  instances
                    .sort((a, b) => {
                      // Sort by date then by time
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
                          onDelete={handleDeleteClass}
                          onStartClass={handleInstanceAction}
                          onEndClass={handleInstanceAction}
                          onCancelClass={handleInstanceAction}
                        />
                      </Grid>
                    ))
                )}
              </Grid>
            </Box>
          )}

          {tabIndex === 2 && user?.role === 'trainer' && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                My Scheduled Classes
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ClassCalendar
                  // When on 'My Schedule' tab, instances are already filtered by instructorId
                  classes={instances}
                  onEditClass={handleEditClass}
                  onDeleteClass={handleDeleteClass}
                  onStartClass={handleInstanceAction}
                  onEndClass={handleInstanceAction}
                  onCancelClass={handleInstanceAction}
                  userRole={user.role}
                  userId={user.uid}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      <ClassFormDialog
        open={isFormDialogOpen}
        onClose={handleCloseFormDialog}
        onSubmit={handleSubmitForm}
        classSchedule={formMode === 'edit' && editingClass && 'recurrence' in editingClass ? editingClass : null}
        // When editing an instance, pass relevant instance data to form data fields
        // Note: ClassFormDialog is primarily for schedules. For instance-specific edits,
        // it's populating schedule-related fields. This is acceptable for basic fields.
        // If more complex instance-specific fields (e.g., actualDuration, notes)
        // were to be edited, a dedicated instance form or more advanced ClassFormDialog
        // would be needed.
        mode={formMode}
        instructors={instructors}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={`Confirm ${deleteTargetType === 'schedule' ? 'Schedule Deletion' : 'Class Cancellation'}`}
        message={`Are you sure you want to ${deleteTargetType === 'schedule' ? 'delete this class schedule and all its associated instances' : 'cancel this class instance'}? This action cannot be undone.`}
      />
    </Box>
  );
}