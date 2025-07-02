// src/app/components/forms/MembershipFormDialog.tsx - Updated with correct types
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
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
  MembershipPlan,
  MembershipPlanFormData,
  DurationType,
  MembershipStatus,
  formatDuration,
} from '../../types/membership';
import { CLASS_TYPE_OPTIONS } from '../../types/class';

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

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'TRY', label: 'TRY (₺)' },
];

const MEMBERSHIP_STATUSES: Array<{ value: MembershipStatus; label: string; color: string }> = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'grey' },
  { value: 'draft', label: 'Draft', color: 'grey' },
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
  const currencySymbols: Record<string, string> = {
    USD: '$',
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
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

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && membership) {
        setFormData({
          name: membership.name,
          description: membership.description || '',
          durationValue: membership.durationValue,
          durationType: membership.durationType,
          price: membership.price,
          currency: membership.currency,
          classTypes: membership.classTypes,
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
      newErrors.name = 'Plan name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Plan name must be at least 2 characters';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.durationValue <= 0) {
      newErrors.durationValue = 'Duration must be greater than 0';
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if (formData.classTypes.length === 0) {
      newErrors.classTypes = 'At least one class type must be selected';
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
      await onSubmit(formData);
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
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '500px',
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ 
          pb: 1, 
          fontSize: '1.5rem', 
          fontWeight: 600,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          {mode === 'create' ? 'Create New Membership Plan' : 'Edit Membership Plan'}
        </DialogTitle>

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
                helperText={errors.name}
                placeholder="e.g., Premium MMA Membership"
                disabled={loading}
                required
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this membership includes..."
                disabled={loading}
              />
            </Grid>

            {/* Duration */}
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
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>

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

            {/* Price and Currency */}
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
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={loading} error={!!errors.currency}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  label="Currency"
                >
                  {CURRENCIES.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.currency && <FormHelperText>{errors.currency}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Class Types */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.classTypes}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={CLASS_TYPE_OPTIONS}
                  value={formData.classTypes}
                  onChange={(_, newValue) => {
                    handleInputChange('classTypes', newValue);
                  }}
                  disabled={loading}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              color: 'white',
                            },
                          },
                        }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Included Class Types"
                      error={!!errors.classTypes}
                      helperText={errors.classTypes || 'You can select from list or type custom class types'}
                      placeholder="Select or type class types"
                    />
                  )}
                />
              </FormControl>
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
                            bgcolor: status.color === 'success' ? 'success.main' : 'grey.500',
                          }}
                        />
                        {status.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Preview Section */}
          {formData.name && (
            <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Plan Preview
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body1">
                  <strong>Name:</strong> {formData.name}
                </Typography>
                {formData.description && (
                  <Typography variant="body1">
                    <strong>Description:</strong> {formData.description}
                  </Typography>
                )}
                <Typography variant="body1">
                  <strong>Duration:</strong> {formatDuration(formData.durationValue, formData.durationType)}
                </Typography>
                <Typography variant="body1">
                  <strong>Price:</strong> {formatCurrency(formData.price, formData.currency)}
                </Typography>
                <Typography variant="body1">
                  <strong>Class Types:</strong> 
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {formData.classTypes.map(type => (
                    <Chip
                      key={type}
                      label={type}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Status:</strong> {MEMBERSHIP_STATUSES.find(s => s.value === formData.status)?.label}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CloseIcon />}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{
              bgcolor: '#0F5C6B',
              '&:hover': { bgcolor: '#0a4a57' },
              minWidth: 120,
            }}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Update Plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}