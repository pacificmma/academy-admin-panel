// src/app/memberships/MembershipsPageClient.tsx - Fixed version with better error handling
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import {
  MembershipPlan,
  MembershipPlanFormData,
  CLASS_TYPES,
  MEMBERSHIP_STATUSES,
} from '../types/membership';

interface MembershipStats {
  totalPlans: number;
  activePlans: number;
}

export default function MembershipsPageClient(): React.JSX.Element {
  // Auth and user info
  const { user, isLoading: authLoading, getAuthHeaders } = useAuth();

  // Data state
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState<MembershipStats>({ totalPlans: 0, activePlans: 0 });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Error and success state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load memberships with better error handling
  const loadMemberships = useCallback(async (): Promise<void> => {
    if (!user || authLoading) return;

    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const url = `/api/memberships${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to load memberships`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setMemberships(result.data);
      } else {
        // Handle API response without success field (backward compatibility)
        setMemberships(result.data || []);
      }

    } catch (err) {
      console.error('Failed to load memberships:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
      setMemberships([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, searchTerm, user, authLoading]);

  const loadStats = useCallback(async (): Promise<void> => {
    if (!user || authLoading) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships/stats', { headers });
      
      if (response.ok) {
        const result = await response.json();
        setStats(result.data || { totalPlans: 0, activePlans: 0 });
      }
    } catch (err) {
      // Stats are optional, don't show error for this
      console.warn('Failed to load stats:', err);
    }
  }, [getAuthHeaders, user, authLoading]);

  // Filter memberships based on search term
  const filteredMemberships = memberships.filter(membership =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedMemberships = filteredMemberships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Event handlers with proper authentication
  const handleCreateMembership = useCallback(async (formData: MembershipPlanFormData): Promise<void> => {
    try {
      setSubmitLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan created successfully');
        setCreateDialogOpen(false);
        // Refresh the list
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to create membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create membership plan');
    } finally {
      setSubmitLoading(false);
    }
  }, [getAuthHeaders, loadMemberships, loadStats]);

  const handleEditMembership = useCallback(async (formData: MembershipPlanFormData): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan updated successfully');
        setEditDialogOpen(false);
        setSelectedMembership(null);
        // Refresh the list
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to update membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership plan');
    } finally {
      setSubmitLoading(false);
    }
  }, [selectedMembership, getAuthHeaders, loadMemberships, loadStats]);

  const handleDeleteMembership = useCallback(async (): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedMembership(null);
        // Refresh the list
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to delete membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete membership plan');
    } finally {
      setSubmitLoading(false);
    }
  }, [selectedMembership, getAuthHeaders, loadMemberships, loadStats]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    if (user && !authLoading) {
      loadMemberships();
      loadStats();
    }
  }, [loadMemberships, loadStats, user, authLoading]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && !authLoading) {
        setPage(0); // Reset to first page when searching
        loadMemberships();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, loadMemberships, user, authLoading]);

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipPlan) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMembership(membership);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // Get class type display
  const getClassTypeDisplay = (classTypes: string[]) => {
    return classTypes.map(type => {
      const classConfig = CLASS_TYPES.find(ct => ct.value === type);
      return classConfig ? classConfig.label : type;
    });
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusConfig = MEMBERSHIP_STATUSES.find(s => s.value === status);
    return statusConfig || { label: status, color: '#666' };
  };

  // Format price
  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Plan Name</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Class Types</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton width="60%" /></TableCell>
              <TableCell><Skeleton width="40%" /></TableCell>
              <TableCell><Skeleton width="50%" /></TableCell>
              <TableCell><Skeleton width="80%" /></TableCell>
              <TableCell><Skeleton width="30%" /></TableCell>
              <TableCell><Skeleton width="20%" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Please log in to access the membership management system.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Membership Plans
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage gym membership plans and packages
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Plans
              </Typography>
              <Typography variant="h4">
                {stats.totalPlans}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Plans
              </Typography>
              <Typography variant="h4">
                {stats.activePlans}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Actions */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}>
        <TextField
          placeholder="Search membership plans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={loading || submitLoading}
        >
          Add Plan
        </Button>
      </Box>

      {/* Memberships Table */}
      {loading ? renderSkeleton() : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan Name</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Class Types</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell width="60">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'No membership plans found matching your search.' : 'No membership plans yet. Create your first plan!'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMemberships.map((membership) => {
                    const statusInfo = getStatusDisplay(membership.status);
                    return (
                      <TableRow key={membership.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {membership.name}
                            </Typography>
                            {membership.description && (
                              <Typography variant="body2" color="text.secondary">
                                {membership.description.length > 50 
                                  ? `${membership.description.substring(0, 50)}...` 
                                  : membership.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {membership.duration.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          {formatPrice(membership.price, membership.currency)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {getClassTypeDisplay(membership.classTypes).map((classType, index) => (
                              <Chip
                                key={index}
                                label={classType}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              bgcolor: statusInfo.color + '20',
                              color: statusInfo.color,
                              borderColor: statusInfo.color,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="More actions">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, membership)}
                              size="small"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredMemberships.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <MembershipFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateMembership}
        mode="create"
      />

      {/* Edit Dialog */}
      <MembershipFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedMembership(null);
        }}
        onSubmit={handleEditMembership}
        membership={selectedMembership}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Membership Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedMembership?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteMembership} 
            color="error" 
            disabled={submitLoading}
          >
            {submitLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}