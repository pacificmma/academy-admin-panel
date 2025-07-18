// src/app/components/forms/ClassFormDialog.tsx - COMPLETELY FIXED
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

  // Initialize form data when dialog opens or classData changes - FIXED to prevent cross-contamination
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && classData) {
        if (type === 'schedule' && 'recurrence' in classData) {
          // This is definitely a ClassSchedule
          const scheduleData = classData as ClassSchedule;
          setFormData({
            name: scheduleData.name || '',
            classType: scheduleData.classType || '',
            instructorId: scheduleData.instructorId || '',
            maxParticipants: scheduleData.maxParticipants || 20,
            duration: scheduleData.duration || 60,
            startDate: scheduleData.startDate || formatFns(new Date(), 'yyyy-MM-dd'),
            startTime: scheduleData.startTime || '18:00',
            scheduleType: scheduleData.recurrence?.scheduleType || 'single',
            daysOfWeek: scheduleData.recurrence?.daysOfWeek || [],
            recurrenceEndDate: scheduleData.recurrence?.endDate || undefined,
            location: scheduleData.location || '',
            notes: scheduleData.notes || '',
          });
        } else if (type === 'instance' && 'scheduleId' in classData) {
          // This is definitely a ClassInstance
          const instanceData = classData as ClassInstance;
          setFormData({
            name: instanceData.name || '',
            classType: instanceData.classType || '',
            instructorId: instanceData.instructorId || '',
            maxParticipants: instanceData.maxParticipants || 20,
            duration: instanceData.duration || 60,
            startDate: instanceData.date || formatFns(new Date(), 'yyyy-MM-dd'),
            startTime: instanceData.startTime || '18:00',
            scheduleType: 'single', // Instances are always single
            daysOfWeek: [],
            location: instanceData.location || '',
            notes: instanceData.notes || '',
          });
        }
      } else {
        // Creating new - always use fresh default data
        setFormData({ ...DEFAULT_FORM_DATA });
      }
      setErrors({});
    }
  }, [open, classData, mode, type]);

  const handleInputChange = (field: keyof ClassFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? (prev.daysOfWeek || []).filter(d => d !== day)
        : [...(prev.daysOfWeek || []), day].sort(),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.classType) {
      newErrors.classType = 'Class type is required';
    }

    if (!formData.instructorId) {
      newErrors.instructorId = 'Instructor is required';
    }

    if (formData.maxParticipants < 1 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Max participants must be between 1 and 100';
    }

    if (formData.duration < 15 || formData.duration > 240) {
      newErrors.duration = 'Duration must be between 15 and 240 minutes';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (formData.scheduleType === 'recurring') {
      if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'At least one day must be selected for recurring classes';
      }

      // Recurrence end date validation
      if (formData.recurrenceEndDate) {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.recurrenceEndDate);

        if (endDate <= startDate) {
          newErrors.recurrenceEndDate = 'End date must be after start date';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
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
        recurrenceEndDate: formData.scheduleType === 'recurring' ? formData.recurrenceEndDate : undefined,
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
        <Box display="flex" flexDirection="column" gap={3} pt={2}>
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
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <ClassTypeSelector
                value={formData.classType}
                onChange={(value) => handleInputChange('classType', value)}
                error={errors.classType}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.instructorId}>
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={formData.instructorId}
                  onChange={(e) => handleInputChange('instructorId', e.target.value)}
                  label="Instructor"
                >
                  {instructors.map((instructor) => (
                    <MenuItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                      {instructor.specialties && instructor.specialties.length > 0 && (
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({instructor.specialties.join(', ')})
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
                {errors.instructorId && <FormHelperText>{errors.instructorId}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                fullWidth
                placeholder="e.g., Main Training Room"
              />
            </Grid>
          </Grid>

          {/* Class Details */}
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
                <FormControlLabel value="single" control={<Radio />} label="Single Class" />
                <FormControlLabel value="recurring" control={<Radio />} label="Recurring Schedule" />
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
              />
            </Grid>

            {formData.scheduleType === 'recurring' && !isInstanceEdit && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="End Date (Optional)"
                  type="date"
                  value={formData.recurrenceEndDate || ''}
                  onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value || undefined)}
                  fullWidth
                  error={!!errors.recurrenceEndDate}
                  helperText={errors.recurrenceEndDate || 'Leave empty for ongoing schedule'}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>

          {/* Days of Week - Only for recurring schedules */}
          {formData.scheduleType === 'recurring' && !isInstanceEdit && (
            <Box>
              <FormLabel component="legend" error={!!errors.daysOfWeek}>
                Days of Week *
              </FormLabel>
              <FormGroup row>
                {DAYS_OF_WEEK.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={formData.daysOfWeek?.includes(day.value) || false}
                        onChange={() => handleDayToggle(day.value)}
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
            label="Notes (Optional)"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Additional information about this class..."
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
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Class' : 'Update Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}