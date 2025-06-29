// src/app/components/forms/MembershipFormDialog.tsx
'use client';

import { useState, useEffect } from 'react';
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
}: MembershipFormDialogProps) {
  const [formData, setFormData] = useState<MembershipPlanFormData>({
    name: '',
    description: '',
    duration: '3_months',
    price: 0,
    classTypes: [],
    maxClassesPerWeek: undefined,
    maxClassesPerMonth: undefined,
    allowDropIns: true,
    includedFeatures: [...DEFAULT_MEMBERSHIP_PLAN.includedFeatures!],
    status: 'active',
    isPopular: false,
    colorCode: POPULAR_COLORS[0],
  }}

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
          ...DEFAULT_MEMBERSHIP_PLAN,
          name: '',
          description: '',
          duration: '3_months',
          price: 0,
          classTypes: [],
          includedFeatures: [...DEFAULT_MEMBERSHIP_PLAN.includedFeatures!],
          colorCode: POPULAR_COLORS[0],
        } as MembershipPlanFormData);
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