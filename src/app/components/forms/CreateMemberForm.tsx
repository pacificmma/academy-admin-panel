'use client';

// src/app/components/forms/CreateMemberForm.tsx - Member creation form
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { MemberFormData } from '@/app/types/member';
import { MembershipPlan } from '@/app/types/membership';
import AwardTypeSelector from '../ui/AwardTypeSelector';

interface CreateMemberFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
  loading?: boolean;
}

export default function CreateMemberForm({
  open,
  onClose,
  onSubmit,
  loading = false
}: CreateMemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    phoneNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    awards: [],
    parentId: '',
    assignMembership: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [assignMembership, setAssignMembership] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Load membership plans and members when form opens
  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      // Load membership plans
      const plansResponse = await fetch('/api/memberships?status=active', {
        credentials: 'include',
      });
      if (plansResponse.ok) {
        const plansResult = await plansResponse.json();
        if (plansResult.success && plansResult.data?.data) {
          setMembershipPlans(plansResult.data.data);
        }
      }

      // Load members for parent selection
      const membersResponse = await fetch('/api/members?isActive=true', {
        credentials: 'include',
      });
      if (membersResponse.ok) {
        const membersResult = await membersResponse.json();
        if (membersResult.success && membersResult.data?.data) {
          setMembers(membersResult.data.data.map((m: any) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
          })));
        }
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const [parentKey, childKey] = keys;
        const currentParent = prev[parentKey as keyof MemberFormData];

        // Ensure the parent object exists and is an object
        if (currentParent && typeof currentParent === 'object') {
          return {
            ...prev,
            [parentKey]: {
              ...currentParent,
              [childKey]: value,
            },
          };
        }
      }
      return prev;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Type-safe handlers for nested objects
  const handleAddressChange = (field: keyof MemberFormData['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));

    if (errors[`address.${field}`]) {
      setErrors(prev => ({ ...prev, [`address.${field}`]: '' }));
    }
  };

  const handleEmergencyContactChange = (field: keyof MemberFormData['emergencyContact'], value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));

    if (errors[`emergencyContact.${field}`]) {
      setErrors(prev => ({ ...prev, [`emergencyContact.${field}`]: '' }));
    }
  };

  const handleAwardsChange = (awards: Array<{ title: string; awardedDate: string }>): void => {
    setFormData(prev => ({ ...prev, awards }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    if (!formData.emergencyContact.name.trim()) newErrors['emergencyContact.name'] = 'Emergency contact name is required';
    if (!formData.emergencyContact.phone.trim()) newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
    if (!formData.emergencyContact.relationship.trim()) newErrors['emergencyContact.relationship'] = 'Emergency contact relationship is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Membership assignment validation
    if (assignMembership) {
      if (!formData.assignMembership?.membershipPlanId) {
        newErrors.membershipPlanId = 'Please select a membership plan';
      }
      if (!formData.assignMembership?.startDate) {
        newErrors.startDate = 'Please select a start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const submitData = { ...formData };

      // Transform address - remove empty fields
      if (submitData.address) {
        const cleanAddress: any = {};
        if (submitData.address.street?.trim()) cleanAddress.street = submitData.address.street.trim();
        if (submitData.address.city?.trim()) cleanAddress.city = submitData.address.city.trim();
        if (submitData.address.state?.trim()) cleanAddress.state = submitData.address.state.trim();
        if (submitData.address.zipCode?.trim()) cleanAddress.zipCode = submitData.address.zipCode.trim();
        if (submitData.address.country?.trim()) cleanAddress.country = submitData.address.country.trim();

        // Only include address if at least one field has value
        if (Object.keys(cleanAddress).length > 0) {
          submitData.address = cleanAddress;
        } else {
          delete (submitData as any).address;
        }
      }

      // Remove empty phone number
      if (!submitData.phoneNumber?.trim()) {
        delete (submitData as any).phoneNumber;
      }

      // Remove assignMembership if not selected
      if (!assignMembership) {
        delete (submitData as any).assignMembership;
      }

      // Remove empty parentId
      if (!submitData.parentId) {
        delete (submitData as any).parentId;
      }

      await onSubmit(submitData as any);
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      phoneNumber: '',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      awards: [],
      parentId: '',
      assignMembership: undefined,
    });
    setErrors({});
    setAssignMembership(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Member</DialogTitle>
      <DialogContent>
        {loadingData && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
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
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            />
          </Grid>

          {/* Parent Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Link to Parent Account (Optional)</InputLabel>
              <Select
                value={formData.parentId}
                onChange={(e) => handleInputChange('parentId', e.target.value)}
                label="Link to Parent Account (Optional)"
              >
                <MenuItem value="">
                  <em>Independent Member</em>
                </MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Address Section */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Address (Optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={formData.address.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State/Province"
                      value={formData.address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ZIP/Postal Code"
                      value={formData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={formData.address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Emergency Contact */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Emergency Contact
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Contact Name"
              value={formData.emergencyContact.name}
              onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
              error={!!errors['emergencyContact.name']}
              helperText={errors['emergencyContact.name']}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Contact Phone"
              value={formData.emergencyContact.phone}
              onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
              error={!!errors['emergencyContact.phone']}
              helperText={errors['emergencyContact.phone']}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Relationship"
              value={formData.emergencyContact.relationship}
              onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
              error={!!errors['emergencyContact.relationship']}
              helperText={errors['emergencyContact.relationship']}
              required
            />
          </Grid>

          {/* Awards Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Awards & Achievements
            </Typography>

            <AwardTypeSelector
              awards={formData.awards}
              onChange={handleAwardsChange}
              disabled={loadingData || loading}
              allowCreate={true}
              allowEdit={true}
              allowDelete={true}
            />
          </Grid>

          {/* Membership Assignment */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={assignMembership}
                  onChange={(e) => setAssignMembership(e.target.checked)}
                />
              }
              label="Assign Membership Plan"
            />
          </Grid>

          {assignMembership && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.membershipPlanId}>
                  <InputLabel>Membership Plan</InputLabel>
                  <Select
                    value={formData.assignMembership?.membershipPlanId || ''}
                    onChange={(e) => handleInputChange('assignMembership', {
                      ...formData.assignMembership,
                      membershipPlanId: e.target.value,
                    })}
                    label="Membership Plan"
                  >
                    {membershipPlans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {plan.name} - ${plan.price.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {plan.durationType === 'unlimited'
                              ? 'Unlimited duration'
                              : `${plan.durationValue} ${plan.durationType}`
                            } • {plan.classTypes.join(', ')} • {
                              plan.isUnlimited
                                ? 'Unlimited/week'
                                : plan.weeklyAttendanceLimit
                                  ? `${plan.weeklyAttendanceLimit} days/week`
                                  : 'No weekly limit'
                            }
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.membershipPlanId && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {errors.membershipPlanId}
                    </Alert>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={formData.assignMembership?.startDate || ''}
                  onChange={(e) => handleInputChange('assignMembership', {
                    ...formData.assignMembership,
                    startDate: e.target.value,
                  })}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Creating...' : 'Create Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}