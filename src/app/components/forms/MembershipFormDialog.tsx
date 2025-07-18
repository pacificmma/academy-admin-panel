// src/app/components/forms/MembershipFormDialog.tsx - Updated to use ClassTypeSelector
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
];

const MEMBERSHIP_STATUSES: Array<{ value: MembershipStatus; label: string; color: string }> = [
  { value: 'active', label: 'Active', color: '#4caf50' },
  { value: 'inactive', label: 'Inactive', color: '#9e9e9e' },
  { value: 'draft', label: 'Draft', color: '#ff9800' },
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or membership data changes
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
          classTypes: membership.classTypes || [],
          status: membership.status,
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Membership name is required';
    }

    if (formData.durationValue < 1) {
      newErrors.durationValue = 'Duration must be at least 1';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (!formData.classTypes || formData.classTypes.length === 0) {
      newErrors.classTypes = 'At least one class type must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData: MembershipPlanFormData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      // Error handling will be managed by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const formatDuration = (value: number, type: DurationType): string => {
    const unit = type === 'days' ? 'day' : 
                 type === 'weeks' ? 'week' : 
                 type === 'months' ? 'month' : 'year';
    
    return `${value} ${unit}${value !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {mode === 'create' ? 'Create New Membership Plan' : 'Edit Membership Plan'}
          </Typography>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Membership Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Membership Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="e.g., 3-Month MMA Package"
              disabled={loading}
              required
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
              helperText={errors.description || 'Optional description for the membership plan'}
              placeholder="Describe what this membership includes..."
              multiline
              rows={3}
              disabled={loading}
            />
          </Grid>

          {/* Duration Value */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Duration"
              value={formData.durationValue}
              onChange={(e) => handleInputChange('durationValue', parseInt(e.target.value) || 1)}
              error={!!errors.durationValue}
              helperText={errors.durationValue}
              disabled={loading}
              required
              inputProps={{ min: 1, max: 999 }}
            />
          </Grid>

          {/* Duration Type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={loading}>
              <InputLabel>Duration Type</InputLabel>
              <Select
                value={formData.durationType}
                onChange={(e) => handleInputChange('durationType', e.target.value as DurationType)}
                label="Duration Type"
              >
                {DURATION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Duration Preview */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Duration: {formatDuration(formData.durationValue, formData.durationType)}
              </Typography>
            </Box>
          </Grid>

          {/* Price */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Price"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              error={!!errors.price}
              helperText={errors.price}
              disabled={loading}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={loading}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as MembershipStatus)}
                label="Status"
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

          {/* Class Types - Using ClassTypeSelector with Multiple Selection */}
          <Grid item xs={12}>
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
              label="Class Types"
              helperText="Select which class types this membership includes. You can also add, edit, or delete class types from here."
            />
          </Grid>

          {/* Price Preview */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Price: ${formatCurrency(formData.price, formData.currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Price per {formData.durationType.slice(0, -1)}: ${formatCurrency(formData.price / formData.durationValue, formData.currency)}
              </Typography>
            </Box>
          </Grid>
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
          {loading ? 'Saving...' : (mode === 'create' ? 'Create Membership' : 'Update Membership')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}