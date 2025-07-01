// src/app/staff/components/CreateStaffDialog.tsx - Create Staff Dialog Component
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
  Collapse,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  ContactEmergency as EmergencyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole } from '../../types';

// Form validation schema
const createStaffSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phoneNumber: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid phone number format'),
  role: z.enum(['admin', 'trainer', 'staff']),
  emergencyContact: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid emergency contact phone'),
    relationship: z.string().min(2).max(50)
  }).optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(100).optional()
  }).optional(),
  specializations: z.string().optional(), // Will be split into array
  certifications: z.string().optional(), // Will be split into array
  notes: z.string().max(500).optional()
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;

interface CreateStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onStaffCreated: (staff: any) => void;
}

export default function CreateStaffDialog({ open, onClose, onStaffCreated }: CreateStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch
  } = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      role: 'staff',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      specializations: '',
      certifications: '',
      notes: ''
    }
  });

  // Handle form submission
  const onSubmit = async (data: CreateStaffFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare request data
      const requestData = {
        ...data,
        specializations: data.specializations 
          ? data.specializations.split(',').map(s => s.trim()).filter(s => s)
          : [],
        certifications: data.certifications 
          ? data.certifications.split(',').map(c => c.trim()).filter(c => c)
          : []
      };

      // Remove empty optional fields
      if (!requestData.emergencyContact?.name) {
        delete requestData.emergencyContact;
      }
      if (!requestData.address?.street && !requestData.address?.city) {
        delete requestData.address;
      }
      if (!requestData.dateOfBirth) {
        delete requestData.dateOfBirth;
      }
      if (!requestData.notes) {
        delete requestData.notes;
      }

      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create staff member');
      }

      if (result.success) {
        onStaffCreated(result.data);
        reset();
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to create staff member');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      reset();
      setError(null);
      setShowOptional(false);
      onClose();
    }
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Create New Staff Member
            </Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add a new staff member, trainer, or administrator to the system
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Basic Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Basic Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="fullName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Full Name"
                        fullWidth
                        required
                        error={!!errors.fullName}
                        helperText={errors.fullName?.message}
                        disabled={loading}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Email Address"
                        type="email"
                        fullWidth
                        required
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon sx={{ fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Phone Number"
                        fullWidth
                        required
                        error={!!errors.phoneNumber}
                        helperText={errors.phoneNumber?.message}
                        disabled={loading}
                        placeholder="+1 (555) 123-4567"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon sx={{ fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        required
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon sx={{ fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={handleTogglePasswordVisibility}
                                edge="end"
                                disabled={loading}
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!errors.role}>
                        <InputLabel>Role</InputLabel>
                        <Select
                          {...field}
                          label="Role"
                          disabled={loading}
                        >
                          <MenuItem value="staff">Staff</MenuItem>
                          <MenuItem value="trainer">Trainer</MenuItem>
                          <MenuItem value="admin">Administrator</MenuItem>
                        </Select>
                        {errors.role && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, mx: 1.75 }}>
                            {errors.role.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Optional Information Toggle */}
          <Button
            variant="outlined"
            onClick={() => setShowOptional(!showOptional)}
            startIcon={showOptional ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 2 }}
            disabled={loading}
          >
            {showOptional ? 'Hide' : 'Show'} Optional Information
          </Button>

          {/* Optional Information */}
          <Collapse in={showOptional}>
            <Box sx={{ mb: 3 }}>
              {/* Emergency Contact */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmergencyIcon sx={{ fontSize: 20 }} />
                    Emergency Contact
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="emergencyContact.name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Contact Name"
                            fullWidth
                            error={!!errors.emergencyContact?.name}
                            helperText={errors.emergencyContact?.name?.message}
                            disabled={loading}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="emergencyContact.phone"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Contact Phone"
                            fullWidth
                            error={!!errors.emergencyContact?.phone}
                            helperText={errors.emergencyContact?.phone?.message}
                            disabled={loading}
                            placeholder="+1 (555) 123-4567"
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Controller
                        name="emergencyContact.relationship"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Relationship"
                            fullWidth
                            error={!!errors.emergencyContact?.relationship}
                            helperText={errors.emergencyContact?.relationship?.message}
                            disabled={loading}
                            placeholder="e.g., Spouse, Parent, Sibling"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Additional Information
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="dateOfBirth"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Date of Birth"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            disabled={loading}
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="specializations"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Specializations"
                            fullWidth
                            disabled={loading}
                            placeholder="e.g., BJJ, MMA, Boxing (comma separated)"
                            helperText="Enter specializations separated by commas"
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Controller
                        name="certifications"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Certifications"
                            fullWidth
                            disabled={loading}
                            placeholder="e.g., CPR Certified, First Aid, Black Belt BJJ (comma separated)"
                            helperText="Enter certifications separated by commas"
                          />
                        )}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Notes"
                            multiline
                            rows={3}
                            fullWidth
                            disabled={loading}
                            placeholder="Any additional notes about this staff member..."
                            error={!!errors.notes}
                            helperText={errors.notes?.message}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </Collapse>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonIcon />}
            sx={{ minWidth: 140 }}
          >
            {loading ? 'Creating...' : 'Create Staff'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}