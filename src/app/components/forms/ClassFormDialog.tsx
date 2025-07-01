// src/app/components/forms/ClassFormDialog.tsx - Comprehensive Class Scheduling Dialog
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
  Chip,
  Switch,
  FormControlLabel,
  Autocomplete,
  FormHelperText,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ClassSchedule,
  ClassFormData,
  RecurrencePattern,
  ClassType,
  CLASS_TYPE_OPTIONS,
  LEVEL_OPTIONS,
  getClassTypeColor,
  getNextOccurrences,
} from '../../types/class';

interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData) => Promise<void>;
  classSchedule?: ClassSchedule | null;
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

const DEFAULT_FORM_DATA: ClassFormData = {
  name: '',
  description: '',
  classType: 'MMA',
  instructorId: '',
  maxParticipants: 20,
  duration: 60,
  startDate: new Date().toISOString().split('T')[0],
  startTime: '18:00',
  recurrence: {
    type: 'none',
    interval: 1,
    daysOfWeek: [],
  },
  location: '',
  requirements: [],
  price: 0,
  level: 'All Levels',
  tags: [],
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

export default function ClassFormDialog({
  open,
  onClose,
  onSubmit,
  classSchedule,
  mode,
  instructors,
}: ClassFormDialogProps) {
  const [formData, setFormData] = useState<ClassFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOccurrences, setPreviewOccurrences] = useState<Array<{ date: string; time: string }>>([]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && classSchedule) {
        setFormData({
          name: classSchedule.name,
          description: classSchedule.description || '',
          classType: classSchedule.classType,
          instructorId: classSchedule.instructorId,
          maxParticipants: classSchedule.maxParticipants,
          duration: classSchedule.duration,
          startDate: classSchedule.startDate,
          startTime: classSchedule.startTime,
          recurrence: classSchedule.recurrence,
          location: classSchedule.location || '',
          requirements: classSchedule.requirements || [],
          price: classSchedule.price || 0,
          level: classSchedule.level || 'All Levels',
          tags: classSchedule.tags || [],
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, mode, classSchedule]);

  useEffect(() => {
    // Update preview when recurrence changes
    if (formData.recurrence.type !== 'none') {
      const occurrences = getNextOccurrences(
        formData.startDate,
        formData.startTime,
        formData.recurrence,
        5
      );
      setPreviewOccurrences(occurrences);
    } else {
      setPreviewOccurrences([]);
    }
  }, [formData.startDate, formData.startTime, formData.recurrence]);

  const handleInputChange = (field: keyof ClassFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    setFormData(prev => ({
      ...prev,
      recurrence: { ...prev.recurrence, [field]: value }
    }));
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = formData.recurrence.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    handleRecurrenceChange('daysOfWeek', newDays);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.instructorId) {
      newErrors.instructorId = 'Instructor is required';
    }

    if (formData.maxParticipants < 1 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Participants must be between 1 and 100';
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

    if (formData.recurrence.type === 'weekly' && (!formData.recurrence.daysOfWeek || formData.recurrence.daysOfWeek.length === 0)) {
      newErrors.recurrence = 'Please select at least one day for weekly recurrence';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save class:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstructor = instructors.find(i => i.id === formData.instructorId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {mode === 'create' ? 'Schedule New Class' : 'Edit Class Schedule'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Class Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., Morning BJJ Fundamentals"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!errors.classType}>
                <InputLabel>Class Type</InputLabel>
                <Select
                  value={formData.classType}
                  onChange={(e) => handleInputChange('classType', e.target.value)}
                  label="Class Type"
                >
                  {CLASS_TYPE_OPTIONS.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getClassTypeColor(type),
                          }}
                        />
                        {type}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={2}
                placeholder="Brief description of the class content and goals..."
              />
            </Grid>

            {/* Instructor and Capacity */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.instructorId}>
                <InputLabel>Instructor</InputLabel>
                <Select
                  value={formData.instructorId}
                  onChange={(e) => handleInputChange('instructorId', e.target.value)}
                  label="Instructor"
                >
                  {instructors.map((instructor) => (
                    <MenuItem key={instructor.id} value={instructor.id}>
                      <Box>
                        <Typography variant="body1">{instructor.name}</Typography>
                        {instructor.specialties && (
                          <Typography variant="caption" color="text.secondary">
                            {instructor.specialties.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.instructorId && <FormHelperText>{errors.instructorId}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Participants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 0)}
                error={!!errors.maxParticipants}
                helperText={errors.maxParticipants}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>

            {/* Schedule Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Schedule & Timing
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={new Date(formData.startDate)}
                onChange={(date) => handleInputChange('startDate', date?.toISOString().split('T')[0] || '')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDate,
                    helperText: errors.startDate,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TimePicker
                label="Start Time"
                value={new Date(`2000-01-01T${formData.startTime}`)}
                onChange={(time) => {
                  if (time) {
                    const hours = time.getHours().toString().padStart(2, '0');
                    const minutes = time.getMinutes().toString().padStart(2, '0');
                    handleInputChange('startTime', `${hours}:${minutes}`);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startTime,
                    helperText: errors.startTime,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                error={!!errors.duration}
                helperText={errors.duration}
                inputProps={{ min: 15, max: 240, step: 15 }}
              />
            </Grid>

            {/* Recurrence Settings */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recurrence</InputLabel>
                <Select
                  value={formData.recurrence.type}
                  onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                  label="Recurrence"
                >
                  <MenuItem value="none">One-time Event</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.recurrence.type === 'weekly' && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Select Days of Week:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Chip
                      key={day.value}
                      label={day.short}
                      onClick={() => handleDayOfWeekToggle(day.value)}
                      color={formData.recurrence.daysOfWeek?.includes(day.value) ? 'primary' : 'default'}
                      variant={formData.recurrence.daysOfWeek?.includes(day.value) ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
                {errors.recurrence && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.recurrence}
                  </Typography>
                )}
              </Grid>
            )}

            {formData.recurrence.type !== 'none' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Repeat every"
                    type="number"
                    value={formData.recurrence.interval}
                    onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 12 }}
                    helperText={`Every ${formData.recurrence.interval} ${formData.recurrence.type === 'daily' ? 'day(s)' : formData.recurrence.type === 'weekly' ? 'week(s)' : 'month(s)'}`}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="End Date (Optional)"
                    value={formData.recurrence.endDate ? new Date(formData.recurrence.endDate) : null}
                    onChange={(date) => handleRecurrenceChange('endDate', date?.toISOString().split('T')[0] || undefined)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      }
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Preview upcoming classes */}
            {previewOccurrences.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Next 5 scheduled classes:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {previewOccurrences.map((occurrence, index) => (
                      <Chip
                        key={index}
                        label={`${new Date(occurrence.date).toLocaleDateString()} at ${occurrence.time}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Alert>
              </Grid>
            )}

            {/* Additional Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Additional Settings
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  label="Level"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Main Training Room, Upstairs Studio"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price (Optional)"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Leave 0 for included in membership"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={loading ? null : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Schedule Class' : 'Update Class'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}