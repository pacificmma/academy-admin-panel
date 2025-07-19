// src/app/components/members/MemberMembershipsTab.tsx - Enhanced membership management
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Pause as FreezeIcon,
  PlayArrow as UnfreezeIcon,
  Cancel as CancelIcon,
  RestartAlt as ReactivateIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { MemberRecord } from '@/app/types/member';
import {
  MemberMembership,
  MembershipStatusAction,
  getMembershipStatusColor,
  getMembershipStatusText,
  MembershipPlan,
} from '@/app/types/membership';
import MembershipStatusDialog from '../forms/MembershipStatusDialog';

interface MemberMembershipsTabProps {
  member: MemberRecord;
  refreshTrigger?: number;
}

interface MembershipStats {
  totalMemberships: number;
  activeMemberships: number;
  frozenMemberships: number;
}

interface CreateMembershipFormData {
  membershipPlanId: string;
  startDate: string;
  paymentReference: string;
}

export default function MemberMembershipsTab({ member, refreshTrigger }: MemberMembershipsTabProps): React.JSX.Element {
  const [memberships, setMemberships] = useState<MemberMembership[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState<MembershipStats>({
    totalMemberships: 0,
    activeMemberships: 0,
    frozenMemberships: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Menu and dialog states
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMembership, setSelectedMembership] = useState<MemberMembership | null>(null);
  const [selectedAction, setSelectedAction] = useState<'freeze' | 'unfreeze' | 'cancel' | 'reactivate' | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create membership form state
  const [createFormData, setCreateFormData] = useState<CreateMembershipFormData>({
    membershipPlanId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentReference: '',
  });
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});

  // Load member memberships
  const loadMemberships = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/member-memberships?memberId=${member.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load memberships');
      }

      const membershipData = result.data?.data || [];
      setMemberships(membershipData);

      // Calculate stats
      const newStats: MembershipStats = {
        totalMemberships: membershipData.length,
        activeMemberships: membershipData.filter((m: MemberMembership) => m.status === 'active').length,
        frozenMemberships: membershipData.filter((m: MemberMembership) => m.status === 'frozen').length,
      };
      setStats(newStats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load memberships';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  // Load membership plans
  const loadMembershipPlans = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/memberships?status=active', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data?.data) {
        setMembershipPlans(result.data.data);
      }
    } catch (err) {
      // Silent error - just log
    }
  }, []);

  // Load data when component mounts or refresh is triggered
  useEffect(() => {
    loadMemberships();
    loadMembershipPlans();
  }, [loadMemberships, loadMembershipPlans, refreshTrigger]);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MemberMembership): void => {
    setMenuAnchor(event.currentTarget);
    setSelectedMembership(membership);
  };

  const handleMenuClose = (): void => {
    setMenuAnchor(null);
    // Don't clear selectedMembership here - let dialog handle it
  };

  const handleStatusAction = (action: 'freeze' | 'unfreeze' | 'cancel' | 'reactivate'): void => {
    setSelectedAction(action); // Store the selected action
    setMenuAnchor(null); // Close menu immediately
    setTimeout(() => {
      setStatusDialogOpen(true); // Open dialog after menu closes
    }, 10);
  };

  const handleCreateMembership = (): void => {
    setCreateDialogOpen(true);
    // Reset form
    setCreateFormData({
      membershipPlanId: '',
      startDate: new Date().toISOString().split('T')[0],
      paymentReference: '',
    });
    setCreateFormErrors({});
  };

  // Handle membership status changes
  const handleMembershipStatusChange = async (membershipId: string, action: any): Promise<void> => {
    try {
      setSubmitLoading(true);

      let endpoint = '';
      let requestBody: any = {};

      // Handle different action types
      if (typeof action === 'string') {
        // Legacy action format - shouldn't happen with new dialog
        requestBody = { reason: 'No reason provided' };
        endpoint = `/api/member-memberships/${membershipId}/${action}`;
      } else if (action.action) {
        // New MembershipStatusAction format
        requestBody = { reason: action.reason };
        
        switch (action.action) {
          case 'freeze':
            endpoint = `/api/member-memberships/${membershipId}/freeze`;
            if (action.freezeDuration) {
              requestBody.freezeDuration = action.freezeDuration;
            } else if (action.freezeEndDate) {
              requestBody.freezeEndDate = action.freezeEndDate;
            }
            break;
          case 'unfreeze':
            endpoint = `/api/member-memberships/${membershipId}/unfreeze`;
            break;
          case 'cancel':
            endpoint = `/api/member-memberships/${membershipId}/cancel`;
            break;
          case 'reactivate':
            endpoint = `/api/member-memberships/${membershipId}/reactivate`;
            break;
        }
      } else {
        // Direct reactivate data format from dialog
        endpoint = `/api/member-memberships/${membershipId}/reactivate`;
        requestBody = action;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update membership');
      }

      // Reload memberships to reflect changes
      await loadMemberships();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update membership';
      setError(errorMessage);
      throw err;
    } finally {
      setSubmitLoading(false);
    }
  };

  // Create new membership
  const handleCreateMembershipSubmit = async (): Promise<void> => {
    try {
      // Validate form
      const errors: Record<string, string> = {};
      
      if (!createFormData.membershipPlanId) {
        errors.membershipPlanId = 'Membership plan is required';
      }
      
      if (!createFormData.startDate) {
        errors.startDate = 'Start date is required';
      }

      setCreateFormErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setSubmitLoading(true);
      setError(null);

      const response = await fetch('/api/member-memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          memberId: member.id,
          membershipPlanId: createFormData.membershipPlanId,
          startDate: createFormData.startDate,
          paymentReference: createFormData.paymentReference.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create membership');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create membership');
      }

      // Close dialog and reload data
      setCreateDialogOpen(false);
      await loadMemberships();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create membership';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusActions = (membership: MemberMembership): React.ReactNode[] => {
    const actions = [];
    
    switch (membership.status) {
      case 'active':
        actions.push(
          <MenuItem key="freeze" onClick={() => handleStatusAction('freeze')}>
            <FreezeIcon sx={{ mr: 1 }} fontSize="small" />
            Freeze Membership
          </MenuItem>,
          <MenuItem key="cancel" onClick={() => handleStatusAction('cancel')}>
            <CancelIcon sx={{ mr: 1 }} fontSize="small" color="error" />
            Cancel Membership
          </MenuItem>
        );
        break;
      case 'frozen':
        actions.push(
          <MenuItem key="unfreeze" onClick={() => handleStatusAction('unfreeze')}>
            <UnfreezeIcon sx={{ mr: 1 }} fontSize="small" color="success" />
            Unfreeze Membership
          </MenuItem>,
          <MenuItem key="cancel" onClick={() => handleStatusAction('cancel')}>
            <CancelIcon sx={{ mr: 1 }} fontSize="small" color="error" />
            Cancel Membership
          </MenuItem>
        );
        break;
      case 'cancelled':
      case 'expired':
      case 'suspended':
        actions.push(
          <MenuItem key="reactivate" onClick={() => handleStatusAction('reactivate')}>
            <ReactivateIcon sx={{ mr: 1 }} fontSize="small" color="warning" />
            Reactivate Membership
          </MenuItem>
        );
        break;
    }
    
    return actions;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getSelectedPlan = (): MembershipPlan | undefined => {
    return membershipPlans.find(plan => plan.id === createFormData.membershipPlanId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Memberships
              </Typography>
              <Typography variant="h4">
                {stats.totalMemberships}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Active
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.activeMemberships}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Frozen
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats.frozenMemberships}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Memberships Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Membership History
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateMembership}
              disabled={submitLoading}
            >
              Add Membership
            </Button>
          </Box>

          {memberships.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No memberships found for this member.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateMembership}
                sx={{ mt: 2 }}
              >
                Add First Membership
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Plan</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {membership.planName || 'Unknown Plan'}
                          </Typography>
                          {membership.planClassTypes && membership.planClassTypes.length > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              {membership.planClassTypes.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getMembershipStatusText(membership.status)}
                          color={getMembershipStatusColor(membership.status)}
                          size="small"
                        />
                        {membership.status === 'frozen' && membership.freezeEndDate && (
                          <Tooltip title={`Frozen until ${new Date(membership.freezeEndDate).toLocaleDateString()}`}>
                            <Chip
                              icon={<ScheduleIcon />}
                              label="Until"
                              size="small"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(membership.startDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(membership.endDate).toLocaleDateString()}
                        </Typography>
                        {membership.status === 'frozen' && membership.originalEndDate && (
                          <Tooltip title={`Original end date: ${new Date(membership.originalEndDate).toLocaleDateString()}`}>
                            <InfoIcon fontSize="small" color="info" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={membership.paymentStatus}
                          color={membership.paymentStatus === 'paid' ? 'success' : 
                                 membership.paymentStatus === 'pending' ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(membership.amount || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, membership)}
                          size="small"
                          disabled={submitLoading}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Membership Status Dialog */}
      <MembershipStatusDialog
        open={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          // Clear selectedMembership and selectedAction after dialog animation completes
          setTimeout(() => {
            setSelectedMembership(null);
            setSelectedAction(null);
          }, 200);
        }}
        onSubmit={handleMembershipStatusChange}
        membership={selectedMembership}
        selectedAction={selectedAction}
        loading={submitLoading}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedMembership && getStatusActions(selectedMembership)}
      </Menu>

      {/* Create Membership Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Membership</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!createFormErrors.membershipPlanId}>
                <InputLabel>Membership Plan</InputLabel>
                <Select
                  value={createFormData.membershipPlanId}
                  onChange={(e) => {
                    setCreateFormData(prev => ({ 
                      ...prev, 
                      membershipPlanId: e.target.value,
                    }));
                    setCreateFormErrors(prev => ({ ...prev, membershipPlanId: '' }));
                  }}
                  label="Membership Plan"
                >
                  {membershipPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {plan.name} - {formatCurrency(plan.price)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {plan.durationValue} {plan.durationType} • {plan.classTypes.join(', ')}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {createFormErrors.membershipPlanId && (
                  <Typography variant="caption" color="error">
                    {createFormErrors.membershipPlanId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={createFormData.startDate}
                onChange={(e) => {
                  setCreateFormData(prev => ({ ...prev, startDate: e.target.value }));
                  setCreateFormErrors(prev => ({ ...prev, startDate: '' }));
                }}
                InputLabelProps={{ shrink: true }}
                error={!!createFormErrors.startDate}
                helperText={createFormErrors.startDate}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Reference (Optional)"
                value={createFormData.paymentReference}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                placeholder="Transaction ID, check number, etc."
              />
            </Grid>

            {getSelectedPlan() && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Selected Plan:</strong> {getSelectedPlan()?.name} <br />
                    <strong>Duration:</strong> {getSelectedPlan()?.durationValue} {getSelectedPlan()?.durationType} <br />
                    <strong>Class Types:</strong> {getSelectedPlan()?.classTypes.join(', ')} <br />
                    <strong>Price:</strong> {formatCurrency(getSelectedPlan()?.price || 0)}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={submitLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateMembershipSubmit} 
            variant="contained" 
            disabled={submitLoading}
            startIcon={submitLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {submitLoading ? 'Creating...' : 'Create Membership'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}