// src/app/components/forms/ClassFormDialog.tsx - COMPLETE VERSION
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
  classDataForEdit?: ClassSchedule | ClassInstance | null;
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

const DEFAULT_FORM_DATA: ClassFormData & { recurrenceDurationValue: number; recurrenceDurationUnit: 'weeks' | 'months'; } = {
  name: '',
  classType: '',
  instructorId: '',
  maxParticipants: 20,
  duration: 60,
  startDate: formatFns(new Date(), 'yyyy-MM-dd'),
  startTime: '18:00',
  scheduleType: 'single',
  daysOfWeek: [],
  recurrenceDurationValue: 4,
  recurrenceDurationUnit: 'weeks',
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

  const isEditingSchedule = mode === 'edit' && classDataForEdit && 'recurrence' in classDataForEdit;
  const isEditingInstance = mode === 'edit' && classDataForEdit && !('recurrence' in classDataForEdit);

  useEffect(() => {
    if (mode === 'edit' && classDataForEdit) {
      if (isEditingSchedule) {
        const scheduleData = classDataForEdit as ClassSchedule;
        setFormData({
          name: scheduleData.name,
          classType: scheduleData.classType,
          instructorId: scheduleData.instructorId,
          maxParticipants: scheduleData.maxParticipants,
          duration: scheduleData.duration,
          startDate: scheduleData.startDate,
          startTime: scheduleData.startTime,
          scheduleType: scheduleData.recurrence.scheduleType === 'single' ? 'single' : 'recurring',
          daysOfWeek: scheduleData.recurrence.daysOfWeek || [],
          recurrenceDurationValue: 4,
          recurrenceDurationUnit: 'weeks',
        });
      } else if (isEditingInstance) {
        const instanceData = classDataForEdit as ClassInstance;
        setFormData({
          name: instanceData.name,
          classType: instanceData.classType,
          instructorId: instanceData.instructorId,
          maxParticipants: instanceData.maxParticipants,
          duration: instanceData.duration,
          startDate: instanceData.date,
          startTime: instanceData.startTime,
          scheduleType: 'single',
          daysOfWeek: [],
          recurrenceDurationValue: 4,
          recurrenceDurationUnit: 'weeks',
        });
      }
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [mode, classDataForEdit, isEditingSchedule, isEditingInstance]);

  useEffect(() => {
    setErrors({});
  }, [formData]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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

    if (formData.scheduleType === 'recurring' && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
      newErrors.daysOfWeek = 'At least one day must be selected for recurring classes';
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
      };

      const scheduleId = isEditingSchedule ? (classDataForEdit as ClassSchedule).id : undefined;
      await onSubmit(submitData, scheduleId);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Class' : 'Edit Class'}
          </Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
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
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <ClassTypeSelector
              value={formData.classType}
              onChange={(value) => handleInputChange('classType', value)}
              label="Class Type"
              required
              disabled={loading}
            />
            {errors.classType && (
              <FormHelperText error>{errors.classType}</FormHelperText>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.instructorId} required disabled={loading}>
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
              disabled={loading}
              required
            />
          </Grid>

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
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" error={!!errors.scheduleType}>
              <FormLabel component="legend">Schedule Type</FormLabel>
              <RadioGroup
                row
                value={formData.scheduleType}
                onChange={(e) => handleInputChange('scheduleType', e.target.value)}
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
                  label="Recurring Classes"
                  disabled={loading}
                />
              </RadioGroup>
              {errors.scheduleType && (
                <FormHelperText>{errors.scheduleType}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              error={!!errors.startDate}
              helperText={errors.startDate}
              InputLabelProps={{ shrink: true }}
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              error={!!errors.startTime}
              helperText={errors.startTime}
              InputLabelProps={{ shrink: true }}
              disabled={loading}
              required
            />
          </Grid>

          {formData.scheduleType === 'recurring' && (
            <Grid item xs={12}>
              <FormControl component="fieldset" error={!!errors.daysOfWeek}>
                <FormLabel component="legend">Days of Week</FormLabel>
                <FormGroup row>
                  {DAYS_OF_WEEK.map((day) => (
                    <FormControlLabel
                      key={day.value}
                      control={
                        <Checkbox
                          checked={formData.daysOfWeek?.includes(day.value) || false}
                          onChange={() => handleDayToggle(day.value)}
                          disabled={loading}
                        />
                      }
                      label={day.short}
                    />
                  ))}
                </FormGroup>
                {errors.daysOfWeek && (
                  <FormHelperText>{errors.daysOfWeek}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          )}

          {formData.scheduleType === 'recurring' && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration"
                  value={formData.recurrenceDurationValue}
                  onChange={(e) => handleInputChange('recurrenceDurationValue', parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1, max: 52 }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Duration Unit</InputLabel>
                  <Select
                    value={formData.recurrenceDurationUnit}
                    label="Duration Unit"
                    onChange={(e) => handleInputChange('recurrenceDurationUnit', e.target.value)}
                  >
                    <MenuItem value="weeks">Weeks</MenuItem>
                    <MenuItem value="months">Months</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Class' : 'Update Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}