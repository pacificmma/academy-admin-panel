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
  Checkbox,
  FormGroup
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
import {
  format as formatFns,
  parseISO,
  addHours,
  addMinutes,
  addWeeks, // Yeni eklendi
  addMonths, // Yeni eklendi
  isBefore, // Yeni eklendi
  isEqual, // Yeni eklendi
  startOfDay // Yeni eklendi
} from 'date-fns';
import {
  ClassSchedule,
  ClassFormData,
  generateRecurringClassDates,
  ClassInstance,
} from '../../types/class';
import DynamicClassTypeSelector from '../ui/DynamicClassTypeSelector';

interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData, scheduleId?: string) => Promise<void>;
  classDataForEdit?: ClassSchedule | ClassInstance | null; // Unified prop for edit data
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

// ClassFormData'yı geçici olarak genişletiyoruz, ClassFormData'nın tanımı harici bir dosyada olduğu için
// bu component içinde kullanmak üzere state tipini genişletiyoruz.
// Backend veya `ClassSchedule` tipinin de bu alanları içermesi gerekecektir.
const DEFAULT_FORM_DATA: ClassFormData & { recurrenceDurationValue: number; recurrenceDurationUnit: 'weeks' | 'months'; } = {
  name: '',
  classType: '',
  instructorId: '',
  maxParticipants: 20,
  duration: 60, // in minutes
  startDate: formatFns(new Date(), 'yyyy-MM-dd'),
  startTime: '18:00',
  scheduleType: 'single', // Default to single event
  daysOfWeek: [],
  recurrenceDurationValue: 4, // Yeni: Varsayılan yinelenme süresi değeri
  recurrenceDurationUnit: 'weeks', // Yeni: Varsayılan yinelenme süresi birimi
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
  const [formData, setFormData] = useState<typeof DEFAULT_FORM_DATA>(DEFAULT_FORM_DATA);
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
          scheduleType: schedule.recurrence.scheduleType,
          daysOfWeek: schedule.recurrence.daysOfWeek || [],
          // Mevcut ClassSchedule tipinde bu alanlar yoksa, "as any" kullanmak gerekebilir
          // veya ClassSchedule tipini types/class.ts dosyasında güncellemelisiniz.
          recurrenceDurationValue: (schedule.recurrence as any).durationValue || DEFAULT_FORM_DATA.recurrenceDurationValue,
          recurrenceDurationUnit: (schedule.recurrence as any).durationUnit || DEFAULT_FORM_DATA.recurrenceDurationUnit,
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
          scheduleType: 'single', // An instance is always treated as a single event for editing
          daysOfWeek: [],
          recurrenceDurationValue: DEFAULT_FORM_DATA.recurrenceDurationValue, // Instance is single, reset recurrence duration
          recurrenceDurationUnit: DEFAULT_FORM_DATA.recurrenceDurationUnit,
        });
      } else {
        // Creating a new class
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, classDataForEdit, mode, isEditingSchedule, isEditingInstance]);

  // Yeni: Yinelenme bitiş tarihini hesaplayan yardımcı fonksiyon
  const calculateRecurrenceEndDate = (startDateString: string, durationValue: number, durationUnit: 'weeks' | 'months'): Date => {
    let startDate = parseISO(startDateString);
    if (durationUnit === 'weeks') {
      return addWeeks(startDate, durationValue);
    } else {
      return addMonths(startDate, durationValue);
    }
  };

  useEffect(() => {
    // Generate preview only for schedules (create mode or editing a schedule) and if it's recurring
    if ((mode === 'create' || isEditingSchedule) && formData.scheduleType === 'recurring') {
      if (formData.daysOfWeek.length > 0 && formData.startTime && formData.recurrenceDurationValue && formData.recurrenceDurationUnit) {
        const recurrenceEndDate = calculateRecurrenceEndDate(
          formData.startDate,
          formData.recurrenceDurationValue,
          formData.recurrenceDurationUnit
        );

        const allOccurrences = generateRecurringClassDates(
          formData.startDate,
          formData.startTime,
          formData.daysOfWeek
        );

        // Calculate occurrences only up to the recurrence end date
        const limitedOccurrences = allOccurrences.filter(occurrence => {
          const occurrenceDate = parseISO(occurrence.date);
          // Karşılaştırma yaparken sadece tarih kısmını al, zamanı göz ardı et
          return isEqual(startOfDay(occurrenceDate), startOfDay(recurrenceEndDate)) || isBefore(occurrenceDate, recurrenceEndDate);
        });

        setPreviewOccurrences(limitedOccurrences.slice(0, 5)); // Show next 5 occurrences within the calculated duration
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
    formData.recurrenceDurationValue, // Yeni bağımlılık
    formData.recurrenceDurationUnit, // Yeni bağımlılık
    mode,
    isEditingSchedule,
  ]);

  const handleInputChange = (field: keyof typeof DEFAULT_FORM_DATA, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = formData.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d:any) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    handleInputChange('daysOfWeek', newDays);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required.';
    }
    if (!formData.instructorId) {
      newErrors.instructorId = 'Instructor is required.';
    }
    if (!formData.classType.trim()) {
      newErrors.classType = 'Class type is required';
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
    if (formData.scheduleType === 'recurring') {
      if (formData.daysOfWeek.length === 0) {
        newErrors.daysOfWeek = 'Select at least one day for weekly recurrence.';
      }
      if (formData.recurrenceDurationValue < 1) { // Yeni doğrulama
        newErrors.recurrenceDurationValue = 'Recurrence duration must be at least 1.';
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
      // formData'yı onSubmit'e gönderirken, ClassFormData tipine uyacak şekilde
      // yeni eklenen alanları ayrı tutabilir veya ClassFormData'nın genişletilmiş halini
      // gönderebilirsiniz. Backend'inizin bu yeni alanları kabul ettiğinden emin olun.
      await onSubmit(formData as ClassFormData, isEditingSchedule ? classDataForEdit?.id : undefined);
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
                <DynamicClassTypeSelector
                  value={formData.classType ? [formData.classType] : []}
                  onChange={(classTypes) => {
                    // For single selection, take the first item
                    const selectedType = classTypes.length > 0 ? classTypes[0] : '';
                    handleInputChange('classType', selectedType);
                  }}
                  multiple={false}
                  label="Class Type"
                  placeholder="Type to add new class type..."
                  error={!!errors.classType}
                  helperText={errors.classType}
                  disabled={loading}
                  required
                />
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

              {formData.scheduleType === 'recurring' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      Select Days of Week for Recurring Events:
                    </Typography>
                    <FormGroup sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {DAYS_OF_WEEK.map((day) => (
                          <FormControlLabel
                            key={day.value}
                            control={
                              <Checkbox
                                checked={formData.daysOfWeek?.includes(day.value)}
                                onChange={() => handleDayOfWeekToggle(day.value)}
                                disabled={loading}
                              />
                            }
                            label={day.label}
                          />
                        ))}
                      </Box>
                    </FormGroup>
                    {errors.daysOfWeek && (
                      <FormHelperText error>{errors.daysOfWeek}</FormHelperText>
                    )}
                  </Grid>

                  {/* Yeni: Yinelenme Süresi Girişleri */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      Recurring Duration:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="Repeats For"
                        type="number"
                        value={formData.recurrenceDurationValue}
                        onChange={(e) => handleInputChange('recurrenceDurationValue', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1 }}
                        error={!!errors.recurrenceDurationValue}
                        helperText={errors.recurrenceDurationValue}
                        disabled={loading}
                        sx={{ width: 150 }}
                      />
                      <FormControl sx={{ width: 120 }} disabled={loading}>
                        <InputLabel>Unit</InputLabel>
                        <Select
                          value={formData.recurrenceDurationUnit}
                          onChange={(e) => handleInputChange('recurrenceDurationUnit', e.target.value as 'weeks' | 'months')}
                          label="Unit"
                        >
                          <MenuItem value="weeks">Weeks</MenuItem>
                          <MenuItem value="months">Months</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary">
                        (e.g., 4 Weeks, 2 Months)
                      </Typography>
                    </Box>
                  </Grid>
                  {/* Önizleme kısmı */}
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