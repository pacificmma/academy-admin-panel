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
import { CreateStaffRequest, StaffRecord, UpdateStaffRequest, StaffFormData } from '../../types/staff';

// Staff form validation schema
const staffFormSchema = z.object({
  fullName: z.string().min(3, 'Full name is required').max(100, 'Full name is too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'trainer', 'visiting_trainer', 'staff'], { message: 'Please select a valid role' }), // 'staff' role added here
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phoneNumber: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid phone number format').optional(),
  emergencyContact: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid emergency contact phone format'),
    relationship: z.string().min(2).max(50)
  }).optional(),
  address: z.object({
    street: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    zipCode: z.string().min(3).max(20),
    country: z.string().min(2).max(100)
  }).optional(),
  notes: z.string().max(500).optional(),
});

const DEFAULT_FORM_DATA: StaffFormData = {
  email: '',
  fullName: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  role: 'visiting_trainer',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  notes: '',
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
  const [formData, setFormData] = useState<StaffFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});

      if (mode === 'edit' && initialStaffData) {
        setFormData({
          email: initialStaffData.email,
          fullName: initialStaffData.fullName,
          phoneNumber: initialStaffData.phoneNumber || '',
          password: '', // Never pre-fill password
          confirmPassword: '',
          role: initialStaffData.role,
          emergencyContact: {
            name: initialStaffData.emergencyContact?.name || '',
            phone: initialStaffData.emergencyContact?.phone || '',
            relationship: initialStaffData.emergencyContact?.relationship || '',
          },
          address: {
            street: initialStaffData.address?.street || '',
            city: initialStaffData.address?.city || '',
            state: initialStaffData.address?.state || '',
            zipCode: initialStaffData.address?.zipCode || '',
            country: initialStaffData.address?.country || '',
          },
          notes: initialStaffData.notes || '',
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
    }
  }, [open, mode, initialStaffData]);

  const handleInputChange = (field: string, value: any) => {
    // Handle nested object updates
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...((prev as any)[parent] || {}),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation for create mode
    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Phone number validation (if provided)
    if (formData.phoneNumber && !/^[\+]?[0-9\s\-\(\)]{10,20}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    // Emergency contact validation (if any field is filled)
    const hasEmergencyContact = formData.emergencyContact.name || formData.emergencyContact.phone || formData.emergencyContact.relationship;
    if (hasEmergencyContact) {
      if (!formData.emergencyContact.name) {
        newErrors['emergencyContact.name'] = 'Emergency contact name is required';
      }
      if (!formData.emergencyContact.phone) {
        newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
      } else if (!/^[\+]?[0-9\s\-\(\)]{10,20}$/.test(formData.emergencyContact.phone)) {
        newErrors['emergencyContact.phone'] = 'Invalid phone number format';
      }
      if (!formData.emergencyContact.relationship) {
        newErrors['emergencyContact.relationship'] = 'Relationship is required';
      }
    }

    // Address validation (if any field is filled)
    const hasAddress = formData.address.street || formData.address.city || formData.address.state || formData.address.zipCode || formData.address.country;
    if (hasAddress) {
      if (!formData.address.street) {
        newErrors['address.street'] = 'Street address is required';
      }
      if (!formData.address.city) {
        newErrors['address.city'] = 'City is required';
      }
      if (!formData.address.state) {
        newErrors['address.state'] = 'State is required';
      }
      if (!formData.address.zipCode) {
        newErrors['address.zipCode'] = 'Zip code is required';
      }
      if (!formData.address.country) {
        newErrors['address.country'] = 'Country is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let response;

      if (mode === 'create') {
        const createData: CreateStaffRequest = {
          email: formData.email,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber || undefined,
          password: formData.password,
          role: formData.role,
          emergencyContact: (formData.emergencyContact.name || formData.emergencyContact.phone || formData.emergencyContact.relationship)
            ? formData.emergencyContact
            : undefined,
          address: (formData.address.street || formData.address.city || formData.address.state || formData.address.zipCode || formData.address.country)
            ? formData.address
            : undefined,
          notes: formData.notes || undefined,
        };

        response = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
          credentials: 'include',
        });
      } else {
        const updateData: UpdateStaffRequest = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber || undefined,
          role: formData.role,
          isActive: initialStaffData?.isActive ?? true,
          emergencyContact: (formData.emergencyContact.name || formData.emergencyContact.phone || formData.emergencyContact.relationship)
            ? formData.emergencyContact
            : undefined,
          address: (formData.address.street || formData.address.city || formData.address.state || formData.address.zipCode || formData.address.country)
            ? formData.address
            : undefined,
          notes: formData.notes || undefined,
        };

        response = await fetch(`/api/staff/${initialStaffData?.uid}`, {
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
              Basic Information
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
              required
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
              disabled={mode === 'edit'}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel>Role *</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                label="Role *"
              >
                <MenuItem value="visiting_trainer">Visiting Trainer</MenuItem>
                <MenuItem value="trainer">Trainer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="staff">Staff</MenuItem> {/* Added this line */}
              </Select>
              {errors.role && <Typography color="error" variant="caption">{errors.role}</Typography>}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber}
            />
          </Grid>

          {mode === 'create' && (
            <>
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
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowConfirmPassword(prev => !prev)} edge="end">
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                  required
                />
              </Grid>
            </>
          )}

          {/* Emergency Contact */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Emergency Contact (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Contact Name"
              value={formData.emergencyContact.name}
              onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
              error={!!errors['emergencyContact.name']}
              helperText={errors['emergencyContact.name']}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Contact Phone"
              value={formData.emergencyContact.phone}
              onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
              error={!!errors['emergencyContact.phone']}
              helperText={errors['emergencyContact.phone']}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Relationship"
              value={formData.emergencyContact.relationship}
              onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
              error={!!errors['emergencyContact.relationship']}
              helperText={errors['emergencyContact.relationship']}
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Address (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              value={formData.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              error={!!errors['address.street']}
              helperText={errors['address.street']}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={formData.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              error={!!errors['address.city']}
              helperText={errors['address.city']}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="State/Province"
              value={formData.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
              error={!!errors['address.state']}
              helperText={errors['address.state']}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Zip/Postal Code"
              value={formData.address.zipCode}
              onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
              error={!!errors['address.zipCode']}
              helperText={errors['address.zipCode']}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              value={formData.address.country}
              onChange={(e) => handleInputChange('address.country', e.target.value)}
              error={!!errors['address.country']}
              helperText={errors['address.country']}
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              error={!!errors.notes}
              helperText={errors.notes}
            />
          </Grid>
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