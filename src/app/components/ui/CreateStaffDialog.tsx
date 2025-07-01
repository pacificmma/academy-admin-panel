// src/app/components/ui/CreateStaffDialog.tsx
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
  Switch,
  FormControlLabel,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { z } from 'zod';
import { UserRole } from '../../types/auth';
import { CreateStaffRequest, StaffRecord, UpdateStaffRequest, StaffData } from '../../types/staff';

// Define the form-specific interface directly, composing from StaffData
// This avoids the 'Omit' conflict with 'uid' and correctly represents form state.
interface StaffMemberForm extends StaffData {
  uid?: string; // UID is optional for creation, required for edit (handled by initialStaffData)
  password?: string; // Password input field, optional for edit, required for create in UI
  isActive?: boolean; // Managed by the form in edit mode, default for create
}

const staffFormSchema = z.object({
  uid: z.string().optional(),
  fullName: z.string().min(3, 'Full name is required').max(100, 'Full name is too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'trainer', 'staff'], { message: 'Please select a valid role' }),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  // These fields are part of StaffData, and their optionality is handled there.
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid phone number format').optional(),
    relationship: z.string().min(2).max(50).optional()
  }).optional(),
  specializations: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

const DEFAULT_FORM_DATA: StaffMemberForm = {
  fullName: '',
  email: '',
  role: 'staff',
  password: '',
  isActive: true, // Default for new staff
  phoneNumber: undefined,
  dateOfBirth: undefined,
  emergencyContact: undefined,
  specializations: [],
  certifications: [],
};

interface CreateStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onStaffCreated?: (staff: StaffRecord) => void;
  onStaffUpdated?: (staff: StaffRecord) => void;
  mode: 'create' | 'edit';
  initialStaffData?: StaffRecord | null;
}

export default function CreateStaffDialog({
  open,
  onClose,
  onStaffCreated,
  onStaffUpdated,
  mode,
  initialStaffData,
}: CreateStaffDialogProps) {
  const [formData, setFormData] = useState<StaffMemberForm>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (mode === 'edit' && initialStaffData) {
        setFormData({
          uid: initialStaffData.uid, // initialStaffData.uid (string) maps to formData.uid (string | undefined) -> OK
          fullName: initialStaffData.fullName,
          email: initialStaffData.email,
          role: initialStaffData.role,
          isActive: initialStaffData.isActive,
          phoneNumber: initialStaffData.phoneNumber || undefined,
          dateOfBirth: initialStaffData.dateOfBirth || undefined,
          emergencyContact: initialStaffData.emergencyContact ? {
            name: initialStaffData.emergencyContact.name || undefined,
            phone: initialStaffData.emergencyContact.phone || undefined,
            relationship: initialStaffData.emergencyContact.relationship || undefined,
          } : undefined,
          specializations: initialStaffData.specializations || [],
          certifications: initialStaffData.certifications || [],
          password: '', // Password is never pre-filled in edit mode
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
    }
  }, [open, mode, initialStaffData]);

  const handleInputChange = (field: keyof StaffMemberForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    setApiError(null);
    setErrors({});

    let dataToValidate: any = { ...formData }; // Use 'any' for Zod parsing flexibility

    if (mode === 'create') {
      // Password is required for create, ensure it's not optional for validation
      if (!dataToValidate.password) {
        setErrors(prev => ({ ...prev, password: 'Password is required' }));
        return;
      }
    } else { // mode === 'edit'
      // For edit, remove password from validation if not being changed (empty string)
      if (dataToValidate.password === '') {
        delete dataToValidate.password;
      }
    }
    
    // Validate against the Zod schema
    const validationResult = staffFormSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err: any) => { // Use 'any' for ZodError.errors
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
        // Ensure that only fields expected by CreateStaffRequest are sent
        const createData: CreateStaffRequest = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          password: formData.password!, // Password is required here due to client-side validation
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          emergencyContact: formData.emergencyContact,
          specializations: formData.specializations,
          certifications: formData.certifications,
        };
        response = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
          credentials: 'include',
        });
      } else { // mode === 'edit'
        // Ensure that only fields expected by UpdateStaffRequest are sent
        const updateData: UpdateStaffRequest = {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          emergencyContact: formData.emergencyContact,
          specializations: formData.specializations,
          certifications: formData.certifications,
          // Password field is omitted from UpdateStaffRequest in types/staff.ts.
          // If password update is needed, it would require a separate flow or
          // a specific field like `newPassword` and an oldPassword for security.
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
                required // Password is required for creation
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