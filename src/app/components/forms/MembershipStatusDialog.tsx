// src/app/components/forms/MembershipStatusDialog.tsx - Membership status management dialog
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
  Alert,
  CircularProgress,
  Chip,
  Divider,
  InputAdornment,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  Pause as FreezeIcon,
  PlayArrow as UnfreezeIcon,
  Cancel as CancelIcon,
  RestartAlt as ReactivateIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { MemberMembership, MembershipStatusAction, getMembershipStatusColor, getMembershipStatusText } from '@/app/types/membership';

interface MembershipStatusDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (membershipId: string, action: MembershipStatusAction) => Promise<void>;
  membership: MemberMembership | null;
  loading?: boolean;
}

interface FormData {
  action: 'freeze' | 'unfreeze' | 'cancel' | 'reactivate';
  reason: string;
  freezeDurationType: 'days' | 'specific';
  freezeDuration: number;
  freezeEndDate: string;
  newEndDate: string;
  amount: number;
  paymentReference: string;
}

const DEFAULT_FORM_DATA: FormData = {
  action: 'freeze',
  reason: '',
  freezeDurationType: 'days',
  freezeDuration: 30,
  freezeEndDate: '',
  newEndDate: '',
  amount: 0,
  paymentReference: '',
};

export default function MembershipStatusDialog({
  open,
  onClose,
  onSubmit,
  membership,
  loading = false,
}: MembershipStatusDialogProps) {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Reset form when dialog opens/closes or membership changes
  useEffect(() => {
    if (open && membership) {
      // Determine available actions based on current status
      let defaultAction: FormData['action'] = 'freeze';
      
      switch (membership.status) {
        case 'active':
          defaultAction = 'freeze';
          break;
        case 'frozen':
          defaultAction = 'unfreeze';
          break;
        case 'cancelled':
        case 'expired':
        case 'suspended':
          defaultAction = 'reactivate';
          break;
      }

      setFormData({
        ...DEFAULT_FORM_DATA,
        action: defaultAction,
        newEndDate: getDefaultNewEndDate(),
      });
      setErrors({});
    }
  }, [open, membership]);

  const getDefaultNewEndDate = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // Default to 1 month from now
    return date.toISOString().split('T')[0];
  };

  const getAvailableActions = (): FormData['action'][] => {
    if (!membership) return [];
    
    switch (membership.status) {
      case 'active':
        return ['freeze', 'cancel'];
      case 'frozen':
        return ['unfreeze', 'cancel'];
      case 'cancelled':
      case 'expired':
      case 'suspended':
        return ['reactivate'];
      default:
        return [];
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (formData.action === 'freeze') {
      if (formData.freezeDurationType === 'days') {
        if (formData.freezeDuration < 1 || formData.freezeDuration > 365) {
          newErrors.freezeDuration = 'Freeze duration must be between 1 and 365 days';
        }
      } else {
        if (!formData.freezeEndDate) {
          newErrors.freezeEndDate = 'Freeze end date is required';
        } else {
          const endDate = new Date(formData.freezeEndDate);
          if (endDate <= new Date()) {
            newErrors.freezeEndDate = 'Freeze end date must be in the future';
          }
        }
      }
    }

    if (formData.action === 'reactivate') {
      if (!formData.newEndDate) {
        newErrors.newEndDate = 'New end date is required';
      } else {
        const endDate = new Date(formData.newEndDate);
        if (endDate <= new Date()) {
          newErrors.newEndDate = 'New end date must be in the future';
        }
      }

      if (formData.amount < 0) {
        newErrors.amount = 'Amount must be non-negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!membership || !validateForm()) return;

    setSubmitLoading(true);
    try {
      const action: MembershipStatusAction = {
        action: formData.action,
        reason: formData.reason.trim(),
      };

      if (formData.action === 'freeze') {
        if (formData.freezeDurationType === 'days') {
          action.freezeDuration = formData.freezeDuration;
        } else {
          action.freezeEndDate = formData.freezeEndDate;
        }
      }

      await onSubmit(membership.id, action);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleClose = () => {
    if (!submitLoading && !loading) {
      onClose();
    }
  };

  const getActionIcon = (action: FormData['action']) => {
    switch (action) {
      case 'freeze': return <FreezeIcon />;
      case 'unfreeze': return <UnfreezeIcon />;
      case 'cancel': return <CancelIcon />;
      case 'reactivate': return <ReactivateIcon />;
    }
  };

  const getActionColor = (action: FormData['action']) => {
    switch (action) {
      case 'freeze': return 'info';
      case 'unfreeze': return 'success';
      case 'cancel': return 'error';
      case 'reactivate': return 'warning';
    }
  };

  const availableActions = getAvailableActions();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {getActionIcon(formData.action)}
          <Typography variant="h6">
            Manage Membership Status
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {membership && (
          <Box>
            {/* Current Membership Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Membership Information
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                <Chip 
                  label={`Status: ${getMembershipStatusText(membership.status)}`}
                  color={getMembershipStatusColor(membership.status)}
                  size="small"
                />
                <Chip 
                  label={`Member: ${membership.memberName}`}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={`Plan: ${membership.planName}`}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={`Ends: ${new Date(membership.endDate).toLocaleDateString()}`}
                  variant="outlined"
                  size="small"
                />
              </Box>

              {/* Show freeze information if currently frozen */}
              {membership.status === 'frozen' && membership.freezeStartDate && membership.freezeEndDate && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Frozen:</strong> {new Date(membership.freezeStartDate).toLocaleDateString()} - {new Date(membership.freezeEndDate).toLocaleDateString()}
                  </Typography>
                  {membership.freezeReason && (
                    <Typography variant="body2" color="textSecondary">
                      <strong>Reason:</strong> {membership.freezeReason}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Show cancellation information if cancelled */}
              {membership.status === 'cancelled' && membership.cancellationReason && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Cancellation Reason:</strong> {membership.cancellationReason}
                  </Typography>
                </Box>
              )}
            </Alert>

            <Grid container spacing={3}>
              {/* Action Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={formData.action}
                    onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value as FormData['action'] }))}
                    label="Action"
                    disabled={submitLoading || loading}
                  >
                    {availableActions.map((action) => (
                      <MenuItem key={action} value={action}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getActionIcon(action)}
                          <Typography>
                            {action.charAt(0).toUpperCase() + action.slice(1)} Membership
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Reason */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  error={!!errors.reason}
                  helperText={errors.reason}
                  required
                  disabled={submitLoading || loading}
                  placeholder="Please provide a reason for this action..."
                />
              </Grid>

              {/* Freeze-specific fields */}
              {formData.action === 'freeze' && (
                <>
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" gutterBottom>
                        Freeze Duration
                      </Typography>
                      <RadioGroup
                        value={formData.freezeDurationType}
                        onChange={(e) => setFormData(prev => ({ ...prev, freezeDurationType: e.target.value as 'days' | 'specific' }))}
                        row
                      >
                        <FormControlLabel value="days" control={<Radio />} label="Number of days" />
                        <FormControlLabel value="specific" control={<Radio />} label="Specific end date" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {formData.freezeDurationType === 'days' ? (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Freeze Duration"
                        value={formData.freezeDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, freezeDuration: parseInt(e.target.value) || 0 }))}
                        error={!!errors.freezeDuration}
                        helperText={errors.freezeDuration || 'Duration in days (1-365)'}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">days</InputAdornment>,
                        }}
                        inputProps={{ min: 1, max: 365 }}
                        disabled={submitLoading || loading}
                      />
                    </Grid>
                  ) : (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Freeze End Date"
                        value={formData.freezeEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, freezeEndDate: e.target.value }))}
                        error={!!errors.freezeEndDate}
                        helperText={errors.freezeEndDate}
                        InputLabelProps={{ shrink: true }}
                        disabled={submitLoading || loading}
                      />
                    </Grid>
                  )}
                </>
              )}

              {/* Reactivate-specific fields */}
              {formData.action === 'reactivate' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="New End Date"
                      value={formData.newEndDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, newEndDate: e.target.value }))}
                      error={!!errors.newEndDate}
                      helperText={errors.newEndDate || 'When should this membership expire?'}
                      InputLabelProps={{ shrink: true }}
                      required
                      disabled={submitLoading || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Payment Amount (Optional)"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      error={!!errors.amount}
                      helperText={errors.amount || 'Leave 0 if no additional payment'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                      disabled={submitLoading || loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Payment Reference (Optional)"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                      helperText="Transaction ID, check number, etc."
                      disabled={submitLoading || loading}
                    />
                  </Grid>
                </>
              )}

              {/* Warning for destructive actions */}
              {(formData.action === 'cancel') && (
                <Grid item xs={12}>
                  <Alert severity="warning" icon={<WarningIcon />}>
                    <Typography variant="body2">
                      <strong>Warning:</strong> Cancelling a membership cannot be easily undone. 
                      The member will lose access to classes and will need to purchase a new membership to continue.
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={submitLoading || loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={getActionColor(formData.action)}
          disabled={submitLoading || loading || !membership}
          startIcon={submitLoading ? <CircularProgress size={20} /> : getActionIcon(formData.action)}
        >
          {submitLoading ? 'Processing...' : `${formData.action.charAt(0).toUpperCase() + formData.action.slice(1)} Membership`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}