// src/app/components/ui/CreateStaffDialog.tsx - (Comprehensively Fixed)
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
  Switch, // Keep Switch for isActive, remove optional fields toggle
  FormControlLabel,
  IconButton,
  Alert,
} from '@mui/material';
// Removed DatePicker, LocalizationProvider, AdapterDateFns as dateOfBirth is removed from UI
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { z } from 'zod';
import { toZod } from 'tozod'; // Keep tozod, but add a note about installation
import { UserRole } from '../../types/auth';
import { CreateStaffRequest, StaffRecord, UpdateStaffRequest } from '../../types/staff';

// NOTE: If you encounter "Cannot find module 'tozod'", please install it: npm install tozod
// For TypeScript, you might also need to install types for it if they are not bundled: npm install @types/tozod

// Simplified StaffMember interface for local use in dialog, reflecting removed fields from UI
interface StaffMember {
  uid?: string; // Optional for creation mode
  fullName: string;
  email: string;
  role: UserRole;
  isActive?: boolean; // Optional for creation, relevant for edit
  password?: string; // Only for creation/password reset, not part of fetched StaffRecord
  // Removed phoneNumber, dateOfBirth, emergencyContact, specializations, certifications from the form's internal state
}

interface CreateStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onStaffCreated?: (staff: StaffRecord) => void;
  onStaffUpdated?: (staff: StaffRecord) => void;
  mode: 'create' | 'edit';
  initialStaffData?: StaffRecord | null;
}

// Updated schema reflecting removed fields from UI
const staffFormSchema = toZod<StaffMember>(
  z.object({
    uid: z.string().optional(),
    fullName: z.string().min(3, 'Full name is required').max(100, 'Full name is too long'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'trainer', 'staff'], { message: 'Please select a valid role' }),
    isActive: z.boolean().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    // Removed validation for phoneNumber, dateOfBirth, emergencyContact, specializations, certifications
  })
);

// Updated DEFAULT_FORM_DATA reflecting removed fields from UI
const DEFAULT_FORM_DATA: StaffMember = {
  fullName: '',
  email: '',
  role: 'staff',
  password: '',
  isActive: true,
  // Removed phoneNumber, dateOfBirth, emergencyContact, specializations, certifications
};

export default function CreateStaffDialog({
  open,
  onClose,
  onStaffCreated,
  onStaffUpdated,
  mode,
  initialStaffData,
}: CreateStaffDialogProps) {
  const [formData, setFormData] = useState<StaffMember>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // Removed showOptionalFields state as there are no optional fields to toggle
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (mode === 'edit' && initialStaffData) {
        setFormData({
          uid: initialStaffData.uid,
          fullName: initialStaffData.fullName,
          email: initialStaffData.email,
          role: initialStaffData.role,
          isActive: initialStaffData.isActive,
          // Removed initial assignments for phoneNumber, dateOfBirth, emergencyContact, specializations, certifications
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
    }
  }, [open, mode, initialStaffData]);

  const handleInputChange = (field: keyof StaffMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Removed handleEmergencyContactChange and handleArrayChange as related fields are removed from UI

  const handleSubmit = async () => {
    setApiError(null);
    setErrors({});

    let dataToValidate: StaffMember = { ...formData };
    if (mode === 'edit') {
      // For edit, remove password from validation if not being changed
      const { password, ...rest } = dataToValidate;
      dataToValidate = rest;
    }

    const validationResult = staffFormSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err: { path: (string | number)[]; message: string; }) => {
        if (err.path[0]) {
          newErrors[err.path[0]] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let response;
      if (mode === 'create') {
        const createData: CreateStaffRequest = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          password: formData.password || '', // Password is required for creation
          // Removed phone, dateOfBirth, emergencyContact, specializations, certifications from the request
        };
        response = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
          credentials: 'include',
        });
      } else { // mode === 'edit'
        const updateData: UpdateStaffRequest = {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
          // Removed phone, dateOfBirth, emergencyContact, specializations, certifications from the request
        };
        response = await fetch(`/api/staff/${formData.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
          credentials: 'include',
        });
      }

      const result = await response.json();

      if (response.ok && result.success) {
        if (mode === 'create' && onStaffCreated) {
          onStaffCreated(result.data);
        } else if (mode === 'edit' && onStaffUpdated) {
          onStaffUpdated(result.data);
        }
        onClose();
      } else {
        setApiError(result.error || 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error('API call failed:', error);
      setApiError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {mode === 'create' ? 'Add New Staff Member' : `Edit Staff: ${initialStaffData?.fullName}`}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Account Information
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              error={!!errors.fullName}
              helperText={errors.fullName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              disabled={mode === 'edit'} // Email should not be editable
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                label="Role"
              >
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="trainer">Trainer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
              {errors.role && <Typography color="error" variant="caption">{errors.role}</Typography>}
            </FormControl>
          </Grid>

          {mode === 'create' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPassword(prev => !prev)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          )}

          {mode === 'edit' && (
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    color="primary"
                  />
                }
                label={formData.isActive ? 'Account Active' : 'Account Inactive'}
              />
            </Grid>
          )}

          {/* Removed Optional Fields Toggle as all optional fields are removed from UI */}
          {/* Removed Optional Fields Section for phone, date of birth, emergency contact, specializations, certifications */}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={loading ? null : <SaveIcon />}
          disabled={loading}
        >
          {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Add Staff' : 'Update Staff')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}