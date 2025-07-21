// src/app/components/forms/MembershipFormDialog.tsx - Updated with weekly attendance limits
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
  InputAdornment,
  CircularProgress,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  MembershipPlan,
  MembershipPlanFormData,
  DurationType,
  MembershipStatus,
} from '../../types/membership';
import ClassTypeSelector from '../ui/ClassTypeSelector';

interface MembershipFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MembershipPlanFormData) => Promise<void>;
  membership?: MembershipPlan | null;
  mode: 'create' | 'edit';
}

// Constants for form options
const DURATION_TYPES: Array<{ value: DurationType; label: string }> = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
  { value: 'unlimited', label: 'Unlimited (Recurring)' },
];

const MEMBERSHIP_STATUSES: Array<{ value: MembershipStatus; label: string; color: string }> = [
  { value: 'active', label: 'Active', color: '#4caf50' },
  { value: 'inactive', label: 'Inactive', color: '#9e9e9e' },
  { value: 'draft', label: 'Draft', color: '#ff9800' },
];

const WEEKLY_ATTENDANCE_OPTIONS = [
  { value: 1, label: '1 day per week' },
  { value: 2, label: '2 days per week' },
  { value: 3, label: '3 days per week' },
  { value: 4, label: '4 days per week' },
  { value: 5, label: '5 days per week' },
  { value: 6, label: '6 days per week' },
  { value: 7, label: '7 days per week' },
];

const DEFAULT_FORM_DATA: MembershipPlanFormData = {
  name: '',
  description: '',
  durationValue: 1,
  durationType: 'months',
  price: 0,
  currency: 'USD',
  classTypes: [],
  status: 'active',
  weeklyAttendanceLimit: undefined,
  isUnlimited: false,
};

// Utility function for currency formatting
const formatCurrency = (amount: number, currency: string): string => {
  return `${amount.toFixed(2)}`;
};

export default function MembershipFormDialog({
  open,
  onClose,
  onSubmit,
  membership,
  mode,
}: MembershipFormDialogProps) {
  const [formData, setFormData] = useState<MembershipPlanFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when dialog opens or membership changes
  useEffect(() => {
    if (open) {
      if (membership && mode === 'edit') {
        setFormData({
          name: membership.name,
          description: membership.description || '',
          durationValue: membership.durationValue,
          durationType: membership.durationType,
          price: membership.price,
          currency: membership.currency,
          classTypes: membership.classTypes,
          status: membership.status,
          weeklyAttendanceLimit: membership.weeklyAttendanceLimit,
          isUnlimited: membership.isUnlimited || false,
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, membership, mode]);

  const handleInputChange = (field: keyof MembershipPlanFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleUnlimitedToggle = (isUnlimited: boolean) => {
    setFormData(prev => ({
      ...prev,
      isUnlimited,
      weeklyAttendanceLimit: isUnlimited ? undefined : prev.weeklyAttendanceLimit || 2,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Membership name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.durationType !== 'unlimited' && formData.durationValue <= 0) {
      newErrors.durationValue = 'Duration must be greater than 0';
    }

    if (!formData.isUnlimited && (!formData.weeklyAttendanceLimit || formData.weeklyAttendanceLimit <= 0)) {
      newErrors.weeklyAttendanceLimit = 'Weekly attendance limit is required when not unlimited';
    }

    if (formData.classTypes.length === 0) {
      newErrors.classTypes = 'At least one class type must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Prepare form data for submission
      const submitData: MembershipPlanFormData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        weeklyAttendanceLimit: formData.isUnlimited ? undefined : formData.weeklyAttendanceLimit,
      };

      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      setErrors({ submit: 'Failed to save membership plan. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    onClose();
  };

  const isFormValid = () => {
    return formData.name.trim() && 
           formData.price >= 0 && 
           formData.classTypes.length > 0 &&
           (formData.durationType === 'unlimited' || formData.durationValue > 0) &&
           (formData.isUnlimited || (formData.weeklyAttendanceLimit && formData.weeklyAttendanceLimit > 0));
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        {mode === 'create' ? 'Create New Membership Plan' : 'Edit Membership Plan'}
      </DialogTitle>
      
      <DialogContent>
        {errors.submit && (
          <Box mb={2}>
            <Typography color="error" variant="body2">
              {errors.submit}
            </Typography>
          </Box>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" color="primary" gutterBottom>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Membership Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
              placeholder="e.g. 3-Month Full Access"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              error={!!errors.price}
              helperText={errors.price}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this membership includes..."
            />
          </Grid>

          {/* Duration Settings */}
          <Grid item xs={12}>
            <Typography variant="h6" color="primary" gutterBottom>
              Duration Settings
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.durationType}>
              <InputLabel>Duration Type</InputLabel>
              <Select
                value={formData.durationType}
                onChange={(e) => {
                  const newType = e.target.value as DurationType;
                  handleInputChange('durationType', newType);
                  if (newType === 'unlimited') {
                    handleInputChange('durationValue', 1);
                  }
                }}
                label="Duration Type"
              >
                {DURATION_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {formData.durationType !== 'unlimited' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duration Value"
                type="number"
                value={formData.durationValue}
                onChange={(e) => handleInputChange('durationValue', parseInt(e.target.value) || 1)}
                error={!!errors.durationValue}
                helperText={errors.durationValue}
                required
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>
          )}

          {/* Weekly Attendance Settings */}
          <Grid item xs={12}>
            <Typography variant="h6" color="primary" gutterBottom>
              Weekly Attendance Settings
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isUnlimited}
                  onChange={(e) => handleUnlimitedToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">
                    Unlimited weekly attendance
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Members can attend classes as many times as they want per week
                  </Typography>
                </Box>
              }
            />
          </Grid>

          {!formData.isUnlimited && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.weeklyAttendanceLimit}>
                <InputLabel>Weekly Attendance Limit</InputLabel>
                <Select
                  value={formData.weeklyAttendanceLimit || ''}
                  onChange={(e) => handleInputChange('weeklyAttendanceLimit', e.target.value as number)}
                  label="Weekly Attendance Limit"
                >
                  {WEEKLY_ATTENDANCE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.weeklyAttendanceLimit && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {errors.weeklyAttendanceLimit}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          )}

          {/* Preview Box */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Membership Preview
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {formData.name || 'Not specified'}
              </Typography>
              <Typography variant="body2">
                <strong>Price:</strong> ${formData.price.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {
                  formData.durationType === 'unlimited' 
                    ? 'Unlimited (Recurring)'
                    : `${formData.durationValue} ${formData.durationType}`
                }
              </Typography>
              <Typography variant="body2">
                <strong>Weekly Attendance:</strong> {
                  formData.isUnlimited 
                    ? 'Unlimited per week'
                    : formData.weeklyAttendanceLimit 
                      ? `${formData.weeklyAttendanceLimit} ${formData.weeklyAttendanceLimit === 1 ? 'day' : 'days'} per week`
                      : 'Not specified'
                }
              </Typography>
            </Box>
          </Grid>

          {/* Class Types */}
          <Grid item xs={12}>
            <Typography variant="h6" color="primary" gutterBottom>
              Included Class Types
            </Typography>
            <ClassTypeSelector
              multiple={true}
              selectedValues={formData.classTypes}
              onMultipleChange={(selectedTypes) => handleInputChange('classTypes', selectedTypes)}
              error={errors.classTypes}
              disabled={loading}
              required={true}
              allowCreate={true}
              allowEdit={true}
              allowDelete={true}
              showUsageCount={true}
              label="Program Types"
              helperText="Select which class types this membership includes. You can also add, edit, or delete class types from here."
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as MembershipStatus)}
                label="Status"
              >
                {MEMBERSHIP_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={status.label}
                        sx={{
                          backgroundColor: status.color,
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !isFormValid()}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : (mode === 'create' ? 'Create Membership' : 'Update Membership')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}