// src/app/components/forms/MemberEditDialog.tsx - Updated with AwardTypeSelector
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  CreditCard as MembershipIcon,
  EmojiEvents as AwardsIcon,
  Phone as PhoneIcon,
  Home as AddressIcon,
} from '@mui/icons-material';
import { MemberRecord, UpdateMemberRequest } from '@/app/types/member';
import AwardTypeSelector from '../ui/AwardTypeSelector';
import MemberMembershipsTab from '../members/MemberMembershipsTab';

interface MemberEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (memberId: string, data: UpdateMemberRequest) => Promise<void>;
  member: MemberRecord | null;
  loading?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface FormData {
  fullName: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  awards: Array<{
    title: string;
    awardedDate: string;
  }>;
  parentId: string;
  isActive: boolean;
}

const DEFAULT_FORM_DATA: FormData = {
  fullName: '',
  phoneNumber: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
  awards: [],
  parentId: '',
  isActive: true,
};

export default function MemberEditDialog({
  open,
  onClose,
  onSubmit,
  member,
  loading = false,
}: MemberEditDialogProps): React.JSX.Element {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reset form when dialog opens/closes or member changes
  useEffect(() => {
    if (open && member) {
      setFormData({
        fullName: member.fullName || '',
        phoneNumber: member.phoneNumber || '',
        address: {
          street: member.address?.street || '',
          city: member.address?.city || '',
          state: member.address?.state || '',
          zipCode: member.address?.zipCode || '',
          country: member.address?.country || '',
        },
        emergencyContact: {
          name: member.emergencyContact?.name || '',
          phone: member.emergencyContact?.phone || '',
          relationship: member.emergencyContact?.relationship || '',
        },
        awards: member.awards || [],
        parentId: member.parentId || '',
        isActive: member.isActive,
      });
      setErrors({});
      setTabValue(0);
    }
  }, [open, member]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.emergencyContact.name.trim()) {
      newErrors['emergencyContact.name'] = 'Emergency contact name is required';
    }

    if (!formData.emergencyContact.phone.trim()) {
      newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
    }

    if (!formData.emergencyContact.relationship.trim()) {
      newErrors['emergencyContact.relationship'] = 'Emergency contact relationship is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any): void => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0] as keyof FormData] as any,
            [keys[1]]: value,
          },
        };
      }
      return prev;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAwardsChange = (awards: Array<{ title: string; awardedDate: string }>): void => {
    setFormData(prev => ({ ...prev, awards }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!member || !validateForm()) return;

    setSubmitLoading(true);
    try {
      const updateData: UpdateMemberRequest = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        awards: formData.awards.filter(award => award.title.trim() && award.awardedDate),
        parentId: formData.parentId.trim() || undefined,
        isActive: formData.isActive,
      };

      await onSubmit(member.id, updateData);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh for memberships tab
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = (): void => {
    if (!submitLoading && !loading) {
      onClose();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon />
            <Typography variant="h6">
              Edit Member: {member?.fullName}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {member && (
              <>
                <Chip
                  label={member.isActive ? 'Active' : 'Inactive'}
                  color={member.isActive ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  label={member.email}
                  variant="outlined"
                  size="small"
                />
              </>
            )}
            <IconButton onClick={handleClose} disabled={submitLoading || loading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="member edit tabs">
            <Tab 
              label="Personal Info" 
              icon={<PersonIcon />} 
              iconPosition="start"
              id="member-tab-0"
              aria-controls="member-tabpanel-0"
            />
            <Tab 
              label="Memberships" 
              icon={<MembershipIcon />} 
              iconPosition="start"
              id="member-tab-1"
              aria-controls="member-tabpanel-1"
            />
          </Tabs>
        </Box>

        <Box sx={{ px: 3, py: 2 }}>
          {/* Personal Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
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
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              {/* Address Information */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  <AddressIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Address Information
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  disabled={submitLoading || loading}
                />
              </Grid>

              {/* Emergency Contact */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  <PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Emergency Contact
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                  error={!!errors['emergencyContact.name']}
                  helperText={errors['emergencyContact.name']}
                  required
                  disabled={submitLoading || loading}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact Phone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                  error={!!errors['emergencyContact.phone']}
                  helperText={errors['emergencyContact.phone']}
                  required
                  disabled={submitLoading || loading}
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
                  required
                  disabled={submitLoading || loading}
                />
              </Grid>

              {/* Awards Section with AwardTypeSelector */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <AwardTypeSelector
                  awards={formData.awards}
                  onChange={handleAwardsChange}
                  disabled={submitLoading || loading}
                  allowCreate={true}
                  allowEdit={true}
                  allowDelete={true}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Memberships Tab */}
          <TabPanel value={tabValue} index={1}>
            {member && (
              <MemberMembershipsTab 
                member={member} 
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={submitLoading || loading}
        >
          Cancel
        </Button>
        {tabValue === 0 && ( // Only show save button on personal info tab
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitLoading || loading || !member}
            startIcon={submitLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {submitLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}