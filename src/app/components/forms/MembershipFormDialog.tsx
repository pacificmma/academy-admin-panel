// src/app/components/forms/MembershipFormDialog.tsx - Simplified version
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
  FormHelperText,
  IconButton,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  MembershipPlan,
  MembershipPlanFormData,
  MEMBERSHIP_DURATIONS,
  CLASS_TYPES,
  MEMBERSHIP_STATUSES,
  DEFAULT_MEMBERSHIP_PLAN,
  MEMBERSHIP_VALIDATION
} from '../../types/membership';

interface MembershipFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MembershipPlanFormData) => Promise<void>;
  membership?: MembershipPlan | null;
  mode: 'create' | 'edit';
}

export default function MembershipFormDialog({
  open,
  onClose,
  onSubmit,
  membership,
  mode
}: MembershipFormDialogProps): React.JSX.Element {
  const [formData, setFormData] = useState<MembershipPlanFormData>({
    name: '',
    description: '',
    duration: '3_months',
    price: 0,
    classTypes: [],
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens/closes or membership changes
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
        });
      } else {
        setFormData({
          name: '',
          description: '',
          duration: '3_months',
          price: 0,
          classTypes: [],
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [open, mode, membership]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    } else if (formData.name.length < MEMBERSHIP_VALIDATION.name.minLength) {
      newErrors.name = `Name must be at least ${MEMBERSHIP_VALIDATION.name.minLength} characters`;
    } else if (formData.name.length > MEMBERSHIP_VALIDATION.name.maxLength) {
      newErrors.name = `Name cannot exceed ${MEMBERSHIP_VALIDATION.name.maxLength} characters`;
    }

    // Description validation
    if (formData.description && formData.description.length > MEMBERSHIP_VALIDATION.description.maxLength) {
      newErrors.description = `Description cannot exceed ${MEMBERSHIP_VALIDATION.description.maxLength} characters`;
    }

    // Price validation
    if (formData.price < MEMBERSHIP_VALIDATION.price.min) {
      newErrors.price = 'Price cannot be negative';
    } else if (formData.price > MEMBERSHIP_VALIDATION.price.max) {
      newErrors.price = `Price cannot exceed $${MEMBERSHIP_VALIDATION.price.max}`;
    }

    // Class types validation
    if (formData.classTypes.length === 0) {
      newErrors.classTypes = 'At least one class type must be selected';
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
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof MembershipPlanFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClassTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    handleInputChange('classTypes', typeof value === 'string' ? value.split(',') : value);
  };

  const getDurationLabel = (duration: string) => {
    return MEMBERSHIP_DURATIONS.find(d => d.value === duration)?.label || duration;
  };

  const getClassTypeLabel = (classType: string) => {
    return CLASS_TYPES.find(c => c.value === classType)?.label || classType;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '50vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {mode === 'create' ? 'Create New Membership Plan' : 'Edit Membership Plan'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box component="form" noValidate>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Plan Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., 3 Month BJJ Plan"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description || 'Optional brief description of the plan'}
                placeholder="Describe what this membership includes..."
              />
            </Grid>

            {/* Duration and Price */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Duration & Pricing
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.duration}>
                <InputLabel>Duration *</InputLabel>
                <Select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  label="Duration *"
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
                type="number"
                label="Price *"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                error={!!errors.price}
                helperText={errors.price}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: "0.01"
                }}
              />
            </Grid>

            {/* Class Access */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Class Access
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.classTypes}>
                <InputLabel>Class Types *</InputLabel>
                <Select
                  multiple
                  value={formData.classTypes}
                  onChange={handleClassTypesChange}
                  label="Class Types *"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip
                          key={value}
                          label={getClassTypeLabel(value)}
                          size="small"
                          sx={{
                            backgroundColor: CLASS_TYPES.find(c => c.value === value)?.color,
                            color: 'white',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {CLASS_TYPES.map((classType) => (
                    <MenuItem key={classType.value} value={classType.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: classType.color,
                          }}
                        />
                        {classType.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.classTypes && <FormHelperText>{errors.classTypes}</FormHelperText>}
                <FormHelperText>
                  Select which class types are included in this membership
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Status
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  label="Status"
                >
                  {MEMBERSHIP_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: status.color,
                          }}
                        />
                        {status.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Only active plans will be visible to members
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Update Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}