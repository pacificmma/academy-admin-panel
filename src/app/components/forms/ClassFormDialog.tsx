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

// Internal form data type that extends ClassFormData
interface InternalFormData extends ClassFormData {
  // No extra properties needed for now
}

const DEFAULT_FORM_DATA: InternalFormData = {
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
  const [formData, setFormData] = useState<InternalFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditingSchedule = mode === 'edit' && classData && type === 'schedule';
  const isEditingInstance = mode === 'edit' && classData && type === 'instance';

  // Initialize form data when dialog opens or classData changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && classData) {
        if (isEditingSchedule) {
          const scheduleData = classData as ClassSchedule;
          setFormData({
            name: scheduleData.name,
            classType: scheduleData.classType,
            instructorId: scheduleData.instructorId,
            maxParticipants: scheduleData.maxParticipants,
            duration: scheduleData.duration,
            startDate: scheduleData.startDate,
            startTime: scheduleData.startTime,
            scheduleType: scheduleData.recurrence?.scheduleType || 'single',
            daysOfWeek: scheduleData.recurrence?.daysOfWeek || [],
            location: scheduleData.location,
            notes: scheduleData.notes,
          });
        } else if (isEditingInstance) {
          const instanceData = classData as ClassInstance;
          setFormData({
            name: instanceData.name,
            classType: instanceData.classType,
            instructorId: instanceData.instructorId,
            maxParticipants: instanceData.maxParticipants,
            duration: instanceData.duration || 60,
            startDate: instanceData.date,
            startTime: instanceData.startTime,
            scheduleType: 'single', // Instances are always single
            daysOfWeek: [],
            location: instanceData.location,
            notes: instanceData.notes,
          });
        }
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, classData, mode, isEditingSchedule, isEditingInstance]);

  const handleInputChange = (field: string, value: any) => {
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
        location: formData.location,
        notes: formData.notes,
      };

      const scheduleId = isEditingSchedule ? (classData as ClassSchedule).id : undefined;
      await onSubmit(submitData, scheduleId);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !parentLoading) {
      setFormData(DEFAULT_FORM_DATA);
      setErrors({});
      onClose();
    }
  };

  const isFormLoading = loading || parentLoading;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Class' : 'Edit Class'}
            {type === 'instance' && ' Instance'}
          </Typography>
          <IconButton onClick={handleClose} disabled={isFormLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Class Name */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="e.g., Morning BJJ Fundamentals"
              disabled={isFormLoading}
              required
            />
          </Grid>

          {/* Class Type */}
          <Grid item xs={12} md={4}>
            <ClassTypeSelector
              value={formData.classType}
              onChange={(value) => handleInputChange('classType', value)}
              label="Class Type"
              required
              disabled={isFormLoading}
            />
            {errors.classType && (
              <FormHelperText error>{errors.classType}</FormHelperText>
            )}
          </Grid>

          {/* Instructor */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.instructorId} required disabled={isFormLoading}>
              <InputLabel>Instructor</InputLabel>
              <Select
                value={formData.instructorId}
                label="Instructor"
                onChange={(e) => handleInputChange('instructorId', e.target.value)}
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
              {errors.instructorId && (
                <FormHelperText>{errors.instructorId}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Max Participants */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Max Participants"
              value={formData.maxParticipants}
              onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 0)}
              error={!!errors.maxParticipants}
              helperText={errors.maxParticipants}
              inputProps={{ min: 1, max: 100 }}
              disabled={isFormLoading}
              required
            />
          </Grid>

          {/* Duration */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Duration (minutes)"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
              error={!!errors.duration}
              helperText={errors.duration}
              inputProps={{ min: 15, max: 240, step: 15 }}
              disabled={isFormLoading}
              required
            />
          </Grid>

          {/* Start Date */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              error={!!errors.startDate}
              helperText={errors.startDate}
              InputLabelProps={{ shrink: true }}
              disabled={isFormLoading}
              required
            />
          </Grid>

          {/* Start Time */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              error={!!errors.startTime}
              helperText={errors.startTime}
              InputLabelProps={{ shrink: true }}
              disabled={isFormLoading}
              required
            />
          </Grid>

          {/* Location */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Location (Optional)"
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Main Hall, Studio A"
              disabled={isFormLoading}
            />
          </Grid>

          {/* Schedule Type - Only for schedules */}
          {type === 'schedule' && (
            <>
              <Grid item xs={12}>
                <FormLabel component="legend">Schedule Type</FormLabel>
                <RadioGroup
                  row
                  value={formData.scheduleType}
                  onChange={(e) => handleInputChange('scheduleType', e.target.value)}
                >
                  <FormControlLabel
                    value="single"
                    control={<Radio />}
                    label="Single Event"
                    disabled={isFormLoading}
                  />
                  <FormControlLabel
                    value="recurring"
                    control={<Radio />}
                    label="Recurring Event"
                    disabled={isFormLoading}
                  />
                </RadioGroup>
              </Grid>

              {/* Days of Week - Only for recurring */}
              {formData.scheduleType === 'recurring' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Recurrence End Date"
                    value={formData.recurrenceEndDate || ''}
                    onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                    error={!!errors.recurrenceEndDate}
                    helperText={errors.recurrenceEndDate || 'How long should this recurring class continue?'}
                    InputLabelProps={{ shrink: true }}
                    disabled={isFormLoading}
                    inputProps={{
                      min: formData.startDate, // Cannot be before start date
                    }}
                  />
                </Grid>
              )}

              {formData.scheduleType === 'recurring' && (
                <Grid item xs={12}>
                  <Typography variant="body1" gutterBottom>
                    Days of Week
                  </Typography>
                  <FormGroup row>
                    {DAYS_OF_WEEK.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={(formData.daysOfWeek || []).includes(day.value)}
                            onChange={() => handleDayToggle(day.value)}
                            disabled={isFormLoading}
                          />
                        }
                        label={day.short}
                      />
                    ))}
                  </FormGroup>
                  {errors.daysOfWeek && (
                    <FormHelperText error>{errors.daysOfWeek}</FormHelperText>
                  )}
                </Grid>
              )}
            </>
          )}

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional information about the class..."
              disabled={isFormLoading}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isFormLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isFormLoading}
          startIcon={isFormLoading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {mode === 'create' ? 'Create' : 'Update'} Class
        </Button>
      </DialogActions>
    </Dialog>
  );
}