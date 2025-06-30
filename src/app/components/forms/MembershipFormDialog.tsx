// src/app/components/forms/MembershipFormDialog.tsx - Fixed version with proper class type handling
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
  Chip,
  Box,
  Typography,
  Grid,
  InputAdornment,
  FormHelperText,
  Autocomplete,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
  MembershipPlan,
  MembershipPlanFormData,
  MembershipDuration,
  ClassType,
  MembershipStatus,
  MEMBERSHIP_DURATIONS,
  CLASS_TYPES,
  MEMBERSHIP_STATUSES,
} from '../../types/membership';

interface MembershipFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MembershipPlanFormData) => Promise<void>;
  membership?: MembershipPlan | null;
  mode: 'create' | 'edit';
}

const DEFAULT_FORM_DATA: MembershipPlanFormData = {
  name: '',
  description: '',
  duration: '1_month',
  price: 0,
  classTypes: [],
  status: 'active',
  currency: 'USD',
};

export default function MembershipFormDialog({
  open,
  onClose,
  onSubmit,
  membership,
  mode,
}: MembershipFormDialogProps): React.JSX.Element {
  const [formData, setFormData] = useState<MembershipPlanFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or membership changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && membership) {
        setFormData({
          name: membership.name,
          description: membership.description || '',
          duration: membership.duration,
          price: membership.price,
          classTypes: membership.classTypes,
          status: membership.status,
          currency: membership.currency || 'USD',
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
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Plan name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Plan name must be less than 100 characters';
    }

    // Price validation
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    } else if (formData.price > 10000) {
      newErrors.price = 'Price must be less than $10,000';
    }

    // Class types validation - FIXED
    if (!formData.classTypes || formData.classTypes.length === 0) {
      newErrors.classTypes = 'At least one class type must be selected';
    }

    // Description validation (optional but with limits)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Ensure classTypes are properly formatted
      const submitData = {
        ...formData,
        classTypes: formData.classTypes.filter(type => type), // Remove any empty values
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getDurationLabel = (duration: MembershipDuration): string => {
    const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.value === duration);
    return durationConfig?.label || duration;
  };

  const getClassTypeLabel = (classType: ClassType): string => {
    const classConfig = CLASS_TYPES.find(c => c.value === classType);
    return classConfig?.label || classType;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '600px',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        fontSize: '1.5rem', 
        fontWeight: 600,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        {mode === 'create' ? 'Create New Membership Plan' : 'Edit Membership Plan'}
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* Plan Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Plan Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name || 'Enter a descriptive name for this membership plan'}
                placeholder="e.g., 3 Month BJJ Membership"
                required
                disabled={loading}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description || 'Optional description for this plan'}
                placeholder="Describe what's included in this membership plan..."
                multiline
                rows={3}
                disabled={loading}
              />
            </Grid>

            {/* Duration and Price */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.duration}>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value as MembershipDuration)}
                  label="Duration"
                  disabled={loading}
                >
                  {MEMBERSHIP_DURATIONS.map((duration) => (
                    <MenuItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.duration && <FormHelperText>{errors.duration}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                error={!!errors.price}
                helperText={errors.price || 'Monthly price in USD'}
                placeholder="0.00"
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                  inputProps: {
                    min: 0,
                    step: 0.01,
                  }
                }}
              />
            </Grid>

            {/* Class Types - FIXED IMPLEMENTATION */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={CLASS_TYPES}
                getOptionLabel={(option) => option.label}
                value={CLASS_TYPES.filter(ct => formData.classTypes.includes(ct.value))}
                onChange={(_, newValue) => {
                  // Extract just the values from the selected options
                  const selectedValues = newValue.map(option => option.value);
                  handleInputChange('classTypes', selectedValues);
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.value}
                      label={option.label}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        backgroundColor: option.color + '20',
                        borderColor: option.color,
                        color: option.color,
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Class Types"
                    placeholder={formData.classTypes.length === 0 ? "Select class types included in this plan" : ""}
                    error={!!errors.classTypes}
                    helperText={errors.classTypes || 'Choose which class types are included'}
                    required
                  />
                )}
                disabled={loading}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>

            {/* Status and Currency */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as MembershipStatus)}
                  label="Status"
                  disabled={loading}
                >
                  {MEMBERSHIP_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: status.color,
                          }}
                        />
                        {status.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Currency"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                helperText="Currency code (e.g., USD, EUR, GBP)"
                disabled={loading}
                placeholder="USD"
              />
            </Grid>

            {/* Plan Preview */}
            <Grid item xs={12}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Plan Preview
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Name:</strong> {formData.name || 'Enter plan name'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Duration:</strong> {getDurationLabel(formData.duration)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Price:</strong> ${formData.price.toFixed(2)} {formData.currency}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Class Types:</strong> {formData.classTypes.length > 0 
                    ? formData.classTypes.map(type => getClassTypeLabel(type)).join(', ')
                    : 'No class types selected'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<SaveIcon />}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Saving...' : (mode === 'create' ? 'Create Plan' : 'Update Plan')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}