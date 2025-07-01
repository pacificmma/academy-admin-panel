// src/app/components/forms/ClassFormDialog.tsx (Updated)
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
  IconButton,
  Tooltip,
  Alert,
  InputAdornment,
  FormHelperText,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Checkbox
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format as formatFns, parseISO, addHours, addMinutes } from 'date-fns';
import {
  ClassSchedule,
  ClassFormData,
  ClassType,
  CLASS_TYPE_OPTIONS,
  getClassTypeColor,
  generateRecurringClassDates,
  ClassInstance,
} from '../../types/class';

interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData, scheduleId?: string) => Promise<void>;
  classDataForEdit?: ClassSchedule | ClassInstance | null; // Unified prop for edit data
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

const DEFAULT_FORM_DATA: ClassFormData = {
  name: '',
  classType: 'MMA',
  instructorId: '',
  maxParticipants: 20,
  duration: 60, // in minutes
  startDate: formatFns(new Date(), 'yyyy-MM-dd'),
  startTime: '18:00',
  price: 0,
  scheduleType: 'single', // Default to single event
  daysOfWeek: [],
  recurrenceDurationValue: 4, // Default 4 weeks
  recurrenceDurationUnit: 'weeks',
  packagePrice: 0,
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
  classDataForEdit,
  mode,
  instructors,
}: ClassFormDialogProps) {
  const [formData, setFormData] = useState<ClassFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOccurrences, setPreviewOccurrences] = useState<Array<{ date: string; time: string }>>([]);

  const isEditingSchedule = mode === 'edit' && classDataForEdit && 'recurrence' in classDataForEdit;
  const isEditingInstance = mode === 'edit' && classDataForEdit && !('recurrence' in classDataForEdit);

  useEffect(() => {
    if (open) {
      if (isEditingSchedule) {
        // Editing an existing ClassSchedule
        const schedule = classDataForEdit as ClassSchedule;
        setFormData({
          name: schedule.name,
          classType: schedule.classType,
          instructorId: schedule.instructorId,
          maxParticipants: schedule.maxParticipants,
          duration: schedule.duration,
          startDate: schedule.startDate,
          startTime: schedule.startTime,
          price: schedule.price, // Schedule price is the total price if recurring
          scheduleType: schedule.recurrence.scheduleType,
          daysOfWeek: schedule.recurrence.daysOfWeek || [],
          recurrenceDurationValue: schedule.recurrence.durationValue || DEFAULT_FORM_DATA.recurrenceDurationValue,
          recurrenceDurationUnit: schedule.recurrence.durationUnit || DEFAULT_FORM_DATA.recurrenceDurationUnit,
          packagePrice: schedule.price, // For editing recurring, price is packagePrice
        });
      } else if (isEditingInstance) {
        // Editing an existing ClassInstance
        const instance = classDataForEdit as ClassInstance;
        setFormData({
          name: instance.name,
          classType: instance.classType,
          instructorId: instance.instructorId,
          maxParticipants: instance.maxParticipants,
          duration: instance.duration,
          startDate: instance.date, // Instance date becomes start date for form
          startTime: instance.startTime,
          price: instance.price || 0, // Instance might have its own price
          scheduleType: 'single', // An instance is always treated as a single event for editing
          daysOfWeek: [],
          recurrenceDurationValue: DEFAULT_FORM_DATA.recurrenceDurationValue,
          recurrenceDurationUnit: DEFAULT_FORM_DATA.recurrenceDurationUnit,
          packagePrice: 0,
        });
      } else {
        // Creating a new class
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, classDataForEdit, mode, isEditingSchedule, isEditingInstance]);

  useEffect(() => {
    // Generate preview only for schedules (create mode or editing a schedule) and if it's recurring
    if ((mode === 'create' || isEditingSchedule) && formData.scheduleType === 'recurring') {
      if (formData.daysOfWeek.length > 0 && formData.startTime && formData.recurrenceDurationValue > 0) {
        const occurrences = generateRecurringClassDates(
          formData.startDate,
          formData.startTime,
          formData.recurrenceDurationValue,
          formData.recurrenceDurationUnit,
          formData.daysOfWeek
        );
        setPreviewOccurrences(occurrences.slice(0, 5)); // Show next 5 occurrences
      } else {
        setPreviewOccurrences([]);
      }
    } else {
      setPreviewOccurrences([]);
    }
  }, [
    formData.startDate,
    formData.startTime,
    formData.scheduleType,
    formData.daysOfWeek,
    formData.recurrenceDurationValue,
    formData.recurrenceDurationUnit,
    mode,
    isEditingSchedule,
  ]);

  const handleInputChange = (field: keyof ClassFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = formData.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    handleInputChange('daysOfWeek', newDays);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime || duration <= 0) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date(); // Use a dummy date for calculation
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, duration);
    return formatFns(endDate, 'HH:mm');
  };


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required.';
    }
    if (!formData.instructorId) {
      newErrors.instructorId = 'Instructor is required.';
    }
    if (formData.maxParticipants < 1 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Max participants must be between 1 and 100.';
    }
    if (formData.duration < 15 || formData.duration > 240) {
      newErrors.duration = 'Duration must be between 15 and 240 minutes.';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required.';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required.';
    }

    if (formData.scheduleType === 'single') {
      if (formData.price < 0) {
        newErrors.price = 'Price cannot be negative.';
      }
    } else { // Recurring
      if (formData.packagePrice <= 0) {
        newErrors.packagePrice = 'Package price must be greater than 0.';
      }
      if (formData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'Select at least one day for weekly recurrence.';
      }
      if (formData.recurrenceDurationValue <= 0) {
        newErrors.recurrenceDurationValue = 'Recurrence duration must be greater than 0.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData, isEditingSchedule ? classDataForEdit?.id : undefined);
    } catch (error) {
      console.error('Failed to save class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '90vh' }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {mode === 'create' ? 'Schedule New Class' : 'Edit Class'}
              </Typography>
              <IconButton onClick={handleClose} size="small">
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
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!errors.classType} disabled={loading}>
                  <InputLabel>Class Type</InputLabel>
                  <Select
                    value={formData.classType}
                    onChange={(e) => handleInputChange('classType', e.target.value as ClassType)}
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

              {/* Instructor and Capacity */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.instructorId} disabled={loading}>
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
                  disabled={loading}
                />
              </Grid>

              {/* Schedule Details */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, my: 2 }}>
                  Schedule & Timing
                </Typography>
              </Grid>

              {/* Schedule Type Selection - Only for new classes or editing schedules */}
              {(mode === 'create' || isEditingSchedule) && (
                <Grid item xs={12}>
                  <FormControl component="fieldset" disabled={loading}>
                    <FormLabel component="legend">Schedule Type</FormLabel>
                    <RadioGroup
                      row
                      value={formData.scheduleType}
                      onChange={(e) => handleInputChange('scheduleType', e.target.value as 'single' | 'recurring')}
                    >
                      <FormControlLabel value="single" control={<Radio />} label="Single Event" />
                      <FormControlLabel value="recurring" control={<Radio />} label="Recurring Event" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Start Date"
                  value={parseISO(formData.startDate)}
                  onChange={(date) => handleInputChange('startDate', formatFns(date as Date, 'yyyy-MM-dd'))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate,
                    }
                  }}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TimePicker
                  label="Start Time"
                  value={formData.startTime ? addHours(parseISO(formData.startDate), parseInt(formData.startTime.split(':')[0])) : null} // Using startDate as base for TimePicker value
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </Grid>

              {/* Price Field - changes based on schedule type */}
              {formData.scheduleType === 'single' ? (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Price per Session"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    error={!!errors.price}
                    helperText={errors.price || 'Price for this single class session.'}
                    inputProps={{ min: 0, step: 0.01 }}
                    disabled={loading}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Package Price"
                      type="number"
                      value={formData.packagePrice}
                      onChange={(e) => handleInputChange('packagePrice', parseFloat(e.target.value) || 0)}
                      error={!!errors.packagePrice}
                      helperText={errors.packagePrice || 'Total price for the entire recurring package.'}
                      inputProps={{ min: 0, step: 0.01 }}
                      disabled={loading}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Recurrence Duration Value"
                      type="number"
                      value={formData.recurrenceDurationValue}
                      onChange={(e) => handleInputChange('recurrenceDurationValue', parseInt(e.target.value) || 0)}
                      error={!!errors.recurrenceDurationValue}
                      helperText={errors.recurrenceDurationValue || `Number of ${formData.recurrenceDurationUnit} for recurrence.`}
                      inputProps={{ min: 1, max: 52 }} // Max 52 weeks or months (approx 1 year)
                      disabled={loading}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth disabled={loading}>
                      <InputLabel>Recurrence Duration Unit</InputLabel>
                      <Select
                        value={formData.recurrenceDurationUnit}
                        onChange={(e) => handleInputChange('recurrenceDurationUnit', e.target.value as 'weeks' | 'months')}
                        label="Recurrence Duration Unit"
                      >
                        <MenuItem value="weeks">Weeks</MenuItem>
                        <MenuItem value="months">Months</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Select Days of Week for Recurring Events:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {DAYS_OF_WEEK.map((day) => (
                        <Chip
                          key={day.value}
                          label={day.label}
                          onClick={() => handleDayOfWeekToggle(day.value)}
                          color={formData.daysOfWeek?.includes(day.value) ? 'primary' : 'default'}
                          variant={formData.daysOfWeek?.includes(day.value) ? 'filled' : 'outlined'}
                          size="small"
                          disabled={loading}
                        />
                      ))}
                    </Box>
                    {errors.daysOfWeek && (
                      <FormHelperText error>{errors.daysOfWeek}</FormHelperText>
                    )}
                  </Grid>
                  {/* Preview of upcoming classes for recurring events */}
                  {previewOccurrences.length > 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          Next 5 scheduled class dates:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {previewOccurrences.map((occurrence, index) => (
                            <Chip
                              key={index}
                              label={`${formatFns(parseISO(occurrence.date), 'MMM dd')} ${occurrence.time}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Alert>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? null : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Schedule Class' : 'Update Class'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}