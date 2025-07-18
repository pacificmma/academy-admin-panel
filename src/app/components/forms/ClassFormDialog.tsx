// src/app/components/forms/ClassFormDialog.tsx - FIXED controlled/uncontrolled issues
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  IconButton,
  FormHelperText,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Checkbox,
  FormGroup,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { format as formatFns } from 'date-fns';
import {
  ClassSchedule,
  ClassFormData,
  ClassInstance,
} from '../../types/class';
import ClassTypeSelector from '../ui/ClassTypeSelector';

interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData, scheduleId?: string) => Promise<void>;
  classData?: ClassSchedule | ClassInstance | null;
  type?: 'schedule' | 'instance';
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
  loading: boolean;
}

// Default form data to prevent controlled/uncontrolled issues
const DEFAULT_FORM_DATA: ClassFormData = {
  name: '',
  classType: '',
  instructorId: '',
  maxParticipants: 20,
  duration: 60,
  startDate: formatFns(new Date(), 'yyyy-MM-dd'),
  startTime: '18:00',
  scheduleType: 'single',
  daysOfWeek: [],
  recurrenceEndDate: '',
  location: '',
  notes: '',
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export default function ClassFormDialog({
  open,
  onClose,
  onSubmit,
  classData,
  type = 'schedule',
  mode,
  instructors,
  loading: parentLoading,
}: ClassFormDialogProps) {
  const [formData, setFormData] = useState<ClassFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditingSchedule = mode === 'edit' && classData && type === 'schedule';
  const isEditingInstance = mode === 'edit' && classData && type === 'instance';

  // Initialize form data when dialog opens or classData changes
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        // For new classes, use defaults
        setFormData({ ...DEFAULT_FORM_DATA });
      } else if (classData) {
        // For editing, populate from existing data
        if (type === 'schedule') {
          const schedule = classData as ClassSchedule;
          setFormData({
            name: schedule.name || '',
            classType: schedule.classType || '',
            instructorId: schedule.instructorId || '',
            maxParticipants: schedule.maxParticipants || 20,
            duration: schedule.duration || 60,
            startDate: schedule.startDate ? schedule.startDate.split('T')[0] : formatFns(new Date(), 'yyyy-MM-dd'),
            startTime: schedule.startTime || '18:00',
            scheduleType: schedule.recurrence?.scheduleType || 'single',
            daysOfWeek: schedule.recurrence?.daysOfWeek || [],
            recurrenceEndDate: schedule.recurrence?.endDate 
              ? schedule.recurrence.endDate.split('T')[0] 
              : '',
            location: schedule.location || '',
            notes: schedule.notes || '',
          });
        } else {
          const instance = classData as ClassInstance;
          setFormData({
            name: instance.name || '',
            classType: instance.classType || '',
            instructorId: instance.instructorId || '',
            maxParticipants: instance.maxParticipants || 20,
            duration: instance.duration || 60,
            startDate: instance.date ? instance.date.split('T')[0] : formatFns(new Date(), 'yyyy-MM-dd'),
            startTime: instance.startTime || '18:00',
            scheduleType: 'single', // Instances are always single
            daysOfWeek: [],
            recurrenceEndDate: '',
            location: instance.location || '',
            notes: instance.notes || '',
          });
        }
      }
      setErrors({});
    }
  }, [open, classData, mode, type]);

  // Handle input changes - ensures we never set undefined values
  const handleInputChange = <T extends keyof ClassFormData>(
    field: T,
    value: ClassFormData[T]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value ?? (field === 'daysOfWeek' ? [] : ''), // Provide fallback for arrays/strings
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Handle days of week change for recurring classes
  const handleDaysOfWeekChange = (day: number, checked: boolean) => {
    setFormData(prev => {
      const currentDays = prev.daysOfWeek || [];
      const newDays = checked 
        ? [...currentDays, day].sort()
        : currentDays.filter(d => d !== day);
      
      return {
        ...prev,
        daysOfWeek: newDays,
      };
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.classType) {
      newErrors.classType = 'Class type is required';
    }

    if (!formData.instructorId) {
      newErrors.instructorId = 'Instructor is required';
    }

    if (!formData.maxParticipants || formData.maxParticipants < 1) {
      newErrors.maxParticipants = 'Maximum participants must be at least 1';
    }

    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (formData.scheduleType === 'recurring' && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
      newErrors.daysOfWeek = 'Please select at least one day for recurring classes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Prepare submission data, excluding optional empty fields
      const submitData: ClassFormData = {
        name: formData.name.trim(),
        classType: formData.classType,
        instructorId: formData.instructorId,
        maxParticipants: formData.maxParticipants,
        duration: formData.duration,
        startDate: formData.startDate,
        startTime: formData.startTime,
        scheduleType: formData.scheduleType,
        daysOfWeek: formData.scheduleType === 'recurring' ? (formData.daysOfWeek || []) : undefined,
        recurrenceEndDate: formData.scheduleType === 'recurring' && formData.recurrenceEndDate 
          ? formData.recurrenceEndDate 
          : undefined,
        location: formData.location?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      // Pass the correct ID based on what we're editing
      const scheduleId = isEditingSchedule ? (classData as ClassSchedule).id : 
                        isEditingInstance ? (classData as ClassInstance).scheduleId : 
                        undefined;

      await onSubmit(submitData, scheduleId);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ ...DEFAULT_FORM_DATA });
      setErrors({});
      onClose();
    }
  };

  const isInstanceEdit = type === 'instance' && mode === 'edit';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Class' : 
             type === 'schedule' ? 'Edit Class Schedule' : 'Edit Class Instance'}
          </Typography>
          <IconButton onClick={handleClose} disabled={loading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={3} pt={2}>
          {/* Basic Information */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Class Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., Beginner MMA"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <ClassTypeSelector
                value={formData.classType}
                onChange={(value) => handleInputChange('classType', value)}
                error={errors.classType}
                required
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.instructorId}>
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={formData.instructorId}
                  onChange={(e) => handleInputChange('instructorId', e.target.value)}
                  label="Instructor"
                  disabled={loading || instructors.length === 0}
                >
                  {instructors.length === 0 ? (
                    <MenuItem disabled>
                      <Typography color="text.secondary">No instructors available</Typography>
                    </MenuItem>
                  ) : (
                    instructors.map((instructor) => (
                      <MenuItem key={instructor.id} value={instructor.id}>
                        <Box>
                          <Typography variant="body2">{instructor.name}</Typography>
                          {instructor.specialties && instructor.specialties.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {instructor.specialties.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.instructorId && (
                  <FormHelperText>{errors.instructorId}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                fullWidth
                placeholder="e.g., Main Training Room"
                disabled={loading}
              />
            </Grid>
          </Grid>

          {/* Capacity and Duration */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Max Participants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value, 10) || 0)}
                fullWidth
                required
                error={!!errors.maxParticipants}
                helperText={errors.maxParticipants}
                inputProps={{ min: 1, max: 100 }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Duration (minutes)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value, 10) || 0)}
                fullWidth
                required
                error={!!errors.duration}
                helperText={errors.duration}
                inputProps={{ min: 15, max: 240, step: 15 }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                fullWidth
                required
                error={!!errors.startTime}
                helperText={errors.startTime}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>
          </Grid>

          {/* Schedule Configuration - Only for schedules, not for single instances */}
          {!isInstanceEdit && (
            <Box>
              <FormLabel component="legend">Schedule Type</FormLabel>
              <RadioGroup
                value={formData.scheduleType}
                onChange={(e) => handleInputChange('scheduleType', e.target.value as 'single' | 'recurring')}
                row
              >
                <FormControlLabel 
                  value="single" 
                  control={<Radio />} 
                  label="Single Class" 
                  disabled={loading}
                />
                <FormControlLabel 
                  value="recurring" 
                  control={<Radio />} 
                  label="Recurring Schedule" 
                  disabled={loading}
                />
              </RadioGroup>
            </Box>
          )}

          {/* Date Configuration */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={formData.scheduleType === 'recurring' ? 6 : 12}>
              <TextField
                label={formData.scheduleType === 'recurring' ? 'Start Date' : 'Class Date'}
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                fullWidth
                required
                error={!!errors.startDate}
                helperText={errors.startDate}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            {formData.scheduleType === 'recurring' && !isInstanceEdit && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="End Date (Optional)"
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                  fullWidth
                  error={!!errors.recurrenceEndDate}
                  helperText={errors.recurrenceEndDate}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              </Grid>
            )}
          </Grid>

          {/* Days of Week Selection for Recurring Classes */}
          {formData.scheduleType === 'recurring' && !isInstanceEdit && (
            <Box>
              <FormLabel component="legend" error={!!errors.daysOfWeek}>
                Days of the Week *
              </FormLabel>
              <FormGroup row>
                {DAYS_OF_WEEK.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={(formData.daysOfWeek || []).includes(day.value)}
                        onChange={(e) => handleDaysOfWeekChange(day.value, e.target.checked)}
                        disabled={loading}
                      />
                    }
                    label={day.short}
                  />
                ))}
              </FormGroup>
              {errors.daysOfWeek && (
                <FormHelperText error>{errors.daysOfWeek}</FormHelperText>
              )}
            </Box>
          )}

          {/* Notes */}
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Any additional information about this class..."
            disabled={loading}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || parentLoading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Class' : 'Update Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}