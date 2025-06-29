// src/app/components/forms/MembershipFormDialog.tsx
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
  FormControlLabel,
  Switch,
  InputAdornment,
  FormHelperText,
  IconButton,
  Stack,
  Autocomplete,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Palette as PaletteIcon,
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

const POPULAR_COLORS = [
  '#1976d2', '#d32f2f', '#f57c00', '#388e3c', 
  '#7b1fa2', '#455a64', '#e91e63', '#00796b'
];

const DEFAULT_FEATURES = [
  'Access to all facilities',
  'Shower facilities', 
  'Equipment usage',
  'Free WiFi',
  'Parking',
  'Locker rental'
];

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
    maxClassesPerWeek: undefined,
    maxClassesPerMonth: undefined,
    allowDropIns: true,
    includedFeatures: [...DEFAULT_FEATURES],
    status: 'active',
    isPopular: false,
    colorCode: POPULAR_COLORS[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [newFeature, setNewFeature] = useState('');

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
          maxClassesPerWeek: membership.maxClassesPerWeek,
          maxClassesPerMonth: membership.maxClassesPerMonth,
          allowDropIns: membership.allowDropIns,
          includedFeatures: membership.includedFeatures,
          status: membership.status,
          isPopular: membership.isPopular || false,
          colorCode: membership.colorCode || POPULAR_COLORS[0],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          duration: '3_months',
          price: 0,
          classTypes: [],
          maxClassesPerWeek: undefined,
          maxClassesPerMonth: undefined,
          allowDropIns: true,
          includedFeatures: [...DEFAULT_FEATURES],
          status: 'active',
          isPopular: false,
          colorCode: POPULAR_COLORS[0],
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

    // Classes per week validation
    if (formData.maxClassesPerWeek !== undefined) {
      if (formData.maxClassesPerWeek < MEMBERSHIP_VALIDATION.maxClassesPerWeek.min) {
        newErrors.maxClassesPerWeek = 'Must be at least 1';
      } else if (formData.maxClassesPerWeek > MEMBERSHIP_VALIDATION.maxClassesPerWeek.max) {
        newErrors.maxClassesPerWeek = 'Cannot exceed 30 classes per week';
      }
    }

    // Classes per month validation
    if (formData.maxClassesPerMonth !== undefined) {
      if (formData.maxClassesPerMonth < MEMBERSHIP_VALIDATION.maxClassesPerMonth.min) {
        newErrors.maxClassesPerMonth = 'Must be at least 1';
      } else if (formData.maxClassesPerMonth > MEMBERSHIP_VALIDATION.maxClassesPerMonth.max) {
        newErrors.maxClassesPerMonth = 'Cannot exceed 120 classes per month';
      }
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

  const addFeature = () => {
    if (newFeature.trim() && !formData.includedFeatures.includes(newFeature.trim())) {
      handleInputChange('includedFeatures', [...formData.includedFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    handleInputChange('includedFeatures', formData.includedFeatures.filter(f => f !== feature));
  };

  const getDurationLabel = (duration: string) => {
    return MEMBERSHIP_DURATIONS.find(d => d.value === duration)?.label || duration;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., 3-Month MMA Program"
              />
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                multiline
                rows={3}
                placeholder="Describe what's included in this membership plan..."
              />
            </Grid>

            {/* Pricing */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Pricing & Limits
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Price *"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                error={!!errors.price}
                helperText={errors.price}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Classes per Week"
                type="number"
                value={formData.maxClassesPerWeek || ''}
                onChange={(e) => handleInputChange('maxClassesPerWeek', e.target.value ? parseInt(e.target.value) : undefined)}
                error={!!errors.maxClassesPerWeek}
                helperText={errors.maxClassesPerWeek || 'Leave empty for unlimited'}
                inputProps={{ min: 1, max: 30 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Classes per Month"
                type="number"
                value={formData.maxClassesPerMonth || ''}
                onChange={(e) => handleInputChange('maxClassesPerMonth', e.target.value ? parseInt(e.target.value) : undefined)}
                error={!!errors.maxClassesPerMonth}
                helperText={errors.maxClassesPerMonth || 'Leave empty for unlimited'}
                inputProps={{ min: 1, max: 120 }}
              />
            </Grid>

            {/* Class Types */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Class Access
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.classTypes}>
                <InputLabel>Included Class Types *</InputLabel>
                <Select
                  multiple
                  value={formData.classTypes}
                  onChange={handleClassTypesChange}
                  input={<OutlinedInput label="Included Class Types *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={CLASS_TYPES.find(ct => ct.value === value)?.label || value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {CLASS_TYPES.map((classType) => (
                    <MenuItem key={classType.value} value={classType.value}>
                      {classType.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.classTypes && <FormHelperText>{errors.classTypes}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowDropIns}
                    onChange={(e) => handleInputChange('allowDropIns', e.target.checked)}
                  />
                }
                label="Allow Drop-in Classes"
                sx={{ mt: 1 }}
              />
            </Grid>

            {/* Features */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Included Features
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Add Feature"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="e.g., Personal training session"
                  />
                  <Button
                    variant="outlined"
                    onClick={addFeature}
                    disabled={!newFeature.trim()}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.includedFeatures.map((feature, index) => (
                    <Chip
                      key={index}
                      label={feature}
                      onDelete={() => removeFeature(feature)}
                      deleteIcon={<RemoveIcon />}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Stack>
            </Grid>

            {/* Appearance & Status */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Appearance & Status
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  label="Status"
                >
                  {MEMBERSHIP_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Color Theme</InputLabel>
                <Select
                  value={formData.colorCode}
                  onChange={(e) => handleInputChange('colorCode', e.target.value)}
                  label="Color Theme"
                  renderValue={(value) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: value,
                          border: '1px solid #ccc'
                        }}
                      />
                      {value}
                    </Box>
                  )}
                >
                  {POPULAR_COLORS.map((color) => (
                    <MenuItem key={color} value={color}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: '1px solid #ccc'
                          }}
                        />
                        {color}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPopular}
                    onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                  />
                }
                label="Mark as Popular Plan"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Update Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}