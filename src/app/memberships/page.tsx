// src/app/memberships/page.tsx - Main membership management page

import { redirect } from 'next/navigation';
import { getServerSession } from '@/app/lib/auth/session';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import MembershipsPageClient from './MembershipsPageClient';

export default async function MembershipsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Check permissions
  if (!PERMISSIONS.memberships.read.includes(session.role)) {
    redirect('/dashboard');
  }

  return <MembershipsPageClient session={session} />;
}

// src/app/memberships/MembershipsPageClient.tsx - Client component for membership management

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Skeleton,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  FitnessCenter as FitnessCenterIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import Layout from '@/app/components/layout/Layout';
import { SessionData } from '@/app/types';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest, 
  UpdateMembershipPlanRequest,
  MembershipType,
  MembershipDuration,
  AVAILABLE_CLASS_TYPES,
  DEFAULT_MEMBERSHIP_PLANS 
} from '@/app/types/membership';

interface MembershipsPageClientProps {
  session: SessionData;
}

interface FormData extends CreateMembershipPlanRequest {}

const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  'full_access': 'Full Access',
  'bjj_only': 'BJJ Only',
  'mma_only': 'MMA Only',
  'boxing_only': 'Boxing Only',
  'muay_thai_only': 'Muay Thai Only',
  'kickboxing_only': 'Kickboxing Only',
  'wrestling_only': 'Wrestling Only',
  'judo_only': 'Judo Only',
  'karate_only': 'Karate Only',
  'custom': 'Custom',
};

export default function MembershipsPageClient({ session }: MembershipsPageClientProps) {
  // State management
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembershipPlan | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] = useState<MembershipPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MembershipType | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'full_access',
    duration: 3,
    price: 0,
    currency: 'USD',
    includedClasses: [],
    isActive: true,
    isPublic: true,
    sortOrder: 0,
    autoRenewal: true,
    gracePeriodDays: 7,
  });

  // Load memberships on mount
  useEffect(() => {
    loadMemberships();
  }, []);

  // Auto-clear alerts
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      const user = await getUserToken();
      if (!user) return;

      const response = await fetch('/api/memberships', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMemberships(data.data || []);
      } else {
        setError('Failed to load memberships');
      }
    } catch (err) {
      setError('Error loading memberships');
    } finally {
      setLoading(false);
    }
  };

  const getUserToken = async () => {
    const { user } = useAuth();
    return user;
  };

  const handleOpenDialog = (membership?: MembershipPlan) => {
    if (membership) {
      setEditingMembership(membership);
      setFormData({
        name: membership.name,
        description: membership.description || '',
        type: membership.type,
        duration: membership.duration,
        price: membership.price,
        currency: membership.currency,
        includedClasses: membership.includedClasses,
        classLimitPerMonth: membership.classLimitPerMonth,
        personalTrainingIncluded: membership.personalTrainingIncluded,
        guestPassesIncluded: membership.guestPassesIncluded,
        ageRestrictions: membership.ageRestrictions,
        isActive: membership.isActive,
        isPublic: membership.isPublic,
        sortOrder: membership.sortOrder,
        maxActiveMembers: membership.maxActiveMembers,
        requiresPhysicalExam: membership.requiresPhysicalExam || false,
        requiresParentalConsent: membership.requiresParentalConsent || false,
        autoRenewal: membership.autoRenewal,
        gracePeriodDays: membership.gracePeriodDays,
        notes: membership.notes,
      });
    } else {
      setEditingMembership(null);
      setFormData({
        name: '',
        description: '',
        type: 'full_access',
        duration: 3,
        price: 0,
        currency: 'USD',
        includedClasses: [],
        isActive: true,
        isPublic: true,
        sortOrder: memberships.length,
        autoRenewal: true,
        gracePeriodDays: 7,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMembership(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      setError(null);

      const user = await getUserToken();
      if (!user) {
        setError('Authentication required');
        return;
      }

      const url = editingMembership 
        ? `/api/memberships/${editingMembership.id}`
        : '/api/memberships';
      
      const method = editingMembership ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message || `Membership plan ${editingMembership ? 'updated' : 'created'} successfully`);
        handleCloseDialog();
        loadMemberships();
      } else {
        setError(result.error || 'Failed to save membership plan');
      }
    } catch (err) {
      setError('Error saving membership plan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!membershipToDelete) return;

    try {
      const user = await getUserToken();
      if (!user) return;

      const response = await fetch(`/api/memberships/${membershipToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Membership plan archived successfully');
        setDeleteConfirmOpen(false);
        setMembershipToDelete(null);
        loadMemberships();
      } else {
        setError(result.error || 'Failed to delete membership plan');
      }
    } catch (err) {
      setError('Error deleting membership plan');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, membership: MembershipPlan) => {
    setAnchorEl(event.currentTarget);
    setSelectedMembership(membership);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMembership(null);
  };

  const handleClassToggle = (classType: string) => {
    setFormData(prev => ({
      ...prev,
      includedClasses: prev.includedClasses.includes(classType)
        ? prev.includedClasses.filter(c => c !== classType)
        : [...prev.includedClasses, classType]
    }));
  };

  const filteredMemberships = memberships.filter(membership => {
    const matchesSearch = membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         membership.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         MEMBERSHIP_TYPE_LABELS[membership.type].toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || membership.type === filterType;
    const matchesActive = showInactive || membership.isActive;

    return matchesSearch && matchesType && matchesActive;
  });

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getDurationLabel = (duration: MembershipDuration) => {
    return duration === 1 ? '1 Month' : `${duration} Months`;
  };

  return (
    <Layout session={session} title="Membership Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            background: 'linear-gradient(135deg, #0F5C6B 0%, #2e6f8c 100%)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4, color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Membership Plans
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                Create Plan
              </Button>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Manage membership plans, pricing, and access levels for your academy.
            </Typography>
          </CardContent>
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Search memberships"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Membership Type</InputLabel>
                  <Select
                    value={filterType}
                    label="Membership Type"
                    onChange={(e) => setFilterType(e.target.value as MembershipType | '')}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                    />
                  }
                  label="Show Inactive"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredMemberships.length} plans found
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Membership Plans Grid */}
        <Grid container spacing={3}>
          {loading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width="100%" height={60} sx={{ mt: 2 }} />
                    <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : filteredMemberships.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <LocalOfferIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No membership plans found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm || filterType ? 'Try adjusting your filters' : 'Create your first membership plan to get started'}
                </Typography>
                {!searchTerm && !filterType && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                  >
                    Create Membership Plan
                  </Button>
                )}
              </Paper>
            </Grid>
          ) : (
            filteredMemberships.map((membership) => (
              <Grid item xs={12} md={6} lg={4} key={membership.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    border: membership.isActive ? 'none' : '2px dashed',
                    borderColor: 'grey.300',
                    opacity: membership.isActive ? 1 : 0.7,
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {membership.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip
                            label={MEMBERSHIP_TYPE_LABELS[membership.type]}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={getDurationLabel(membership.duration)}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          {!membership.isActive && (
                            <Chip
                              label="Inactive"
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, membership)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {/* Price */}
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                      {formatPrice(membership.price, membership.currency)}
                    </Typography>

                    {/* Description */}
                    {membership.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {membership.description}
                      </Typography>
                    )}

                    {/* Features */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Included Classes ({membership.includedClasses.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {membership.includedClasses.slice(0, 3).map((classType) => (
                          <Chip
                            key={classType}
                            label={classType}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {membership.includedClasses.length > 3 && (
                          <Chip
                            label={`+${membership.includedClasses.length - 3} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Stats */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {membership.classLimitPerMonth && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {membership.classLimitPerMonth} classes/month
                          </Typography>
                        </Box>
                      )}
                      {membership.personalTrainingIncluded && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {membership.personalTrainingIncluded} PT sessions
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FitnessCenterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {membership.autoRenewal ? 'Auto-renew' : 'Manual renew'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>

                  {/* Visibility indicator */}
                  <Box sx={{ position: 'absolute', top: 8, right: 48 }}>
                    {membership.isPublic ? (
                      <Tooltip title="Visible to members">
                        <ViewIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Hidden from members">
                        <VisibilityOffIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => {
            handleOpenDialog(selectedMembership!);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Plan</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            setMembershipToDelete(selectedMembership!);
            setDeleteConfirmOpen(true);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive Plan</ListItemText>
          </MenuItem>
        </Menu>

        {/* Create/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingMembership ? 'Edit Membership Plan' : 'Create New Membership Plan'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Plan Name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={formData.type}
                      label="Type"
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as MembershipType }))}
                    >
                      {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([key, label]) => (
                        <MenuItem key={key} value={key}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    multiline
                    rows={3}
                    helperText="Internal notes for administrators"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitLoading || !formData.name || formData.includedClasses.length === 0}
            >
              {submitLoading ? 'Saving...' : editingMembership ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Archive Membership Plan</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to archive "{membershipToDelete?.name}"? 
              This will make it inactive and hidden from members, but existing memberships will remain active.
            </Typography>
            {membershipToDelete && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This action cannot be undone. The plan will be archived and removed from the public listing.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Archive Plan
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for Mobile */}
        <Fab
          color="primary"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', md: 'none' },
          }}
        >
          <AddIcon />
        </Fab>
      </Container>
    </Layout>
  );
}Description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    multiline
                    rows={2}
                  />
                </Grid>

                {/* Pricing & Duration */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Pricing & Duration
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={formData.duration}
                      label="Duration"
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value as MembershipDuration }))}
                    >
                      <MenuItem value={1}>1 Month</MenuItem>
                      <MenuItem value={3}>3 Months</MenuItem>
                      <MenuItem value={6}>6 Months</MenuItem>
                      <MenuItem value={12}>12 Months</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    inputProps={{ maxLength: 3 }}
                  />
                </Grid>

                {/* Access & Features */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Included Classes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    {AVAILABLE_CLASS_TYPES.map((classType) => (
                      <Chip
                        key={classType}
                        label={classType}
                        onClick={() => handleClassToggle(classType)}
                        color={formData.includedClasses.includes(classType) ? 'primary' : 'default'}
                        variant={formData.includedClasses.includes(classType) ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Classes per Month"
                    type="number"
                    value={formData.classLimitPerMonth || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      classLimitPerMonth: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    helperText="Leave empty for unlimited"
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Personal Training Sessions"
                    type="number"
                    value={formData.personalTrainingIncluded || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      personalTrainingIncluded: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Guest Passes"
                    type="number"
                    value={formData.guestPassesIncluded || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      guestPassesIncluded: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                {/* Settings */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Settings
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                    }
                    label="Active"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isPublic}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      />
                    }
                    label="Visible to Members"
                    sx={{ display: 'block' }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoRenewal}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoRenewal: e.target.checked }))}
                      />
                    }
                    label="Auto-renewal"
                    sx={{ display: 'block' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Sort Order"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                    inputProps={{ min: 0 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Grace Period (Days)"
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodDays: Number(e.target.value) }))}
                    inputProps={{ min: 0, max: 90 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="