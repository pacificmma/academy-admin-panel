// src/app/memberships/MembershipsPageClient.tsx - Fixed with correct TypeScript types
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import {
  MembershipPlan,
  MembershipPlanFormData,
  ClassType,
} from '../types/membership';

interface MembershipStats {
  totalPlans: number;
  activePlans: number;
}

export default function MembershipsPageClient(): React.JSX.Element {
  // Auth and user info
  const { user, sessionData, loading: authLoading } = useAuth();

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

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

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
      const result = await response.json();

      if (response.ok) {
        setMemberships(result.data || []);
        // Update stats
        const totalPlans = result.data?.length || 0;
        const activePlans = result.data?.filter((plan: MembershipPlan) => plan.status === 'active').length || 0;
        setStats({ totalPlans, activePlans });
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, getAuthHeaders, searchTerm]);

  // Create membership
  const handleCreateMembership = async (data: MembershipPlanFormData): Promise<void> => {
    if (!user) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan created successfully!');
        setCreateDialogOpen(false);
        await loadMemberships(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to create membership plan');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create membership plan';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update membership
  const handleUpdateMembership = async (data: MembershipPlanFormData): Promise<void> => {
    if (!user || !selectedMembership) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan updated successfully!');
        setEditDialogOpen(false);
        setSelectedMembership(null);
        await loadMemberships(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to update membership plan');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update membership plan';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete membership
  const handleDeleteMembership = async (): Promise<void> => {
    if (!user || !selectedMembership) return;

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
        setSuccessMessage('Membership plan deleted successfully!');
        setDeleteDialogOpen(false);
        setSelectedMembership(null);
        await loadMemberships(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to delete membership plan');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete membership plan';
      setError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipPlan): void => {
    setMenuAnchor(event.currentTarget);
    setSelectedMembership(membership);
  };

  const handleMenuClose = (): void => {
    setMenuAnchor(null);
  };

  const handleEditClick = (): void => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (): void => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && !authLoading) {
        loadMemberships();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, user, authLoading, loadMemberships]);

  // Initial load
  useEffect(() => {
    if (user && !authLoading) {
      loadMemberships();
    }
  }, [user, authLoading, loadMemberships]);

  // Filter memberships for display - FIXED with correct property names
  const filteredMemberships = memberships.filter(membership =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.classTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated memberships
  const paginatedMemberships = filteredMemberships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Format duration - FIXED
  const formatDuration = (duration: string): string => {
    const durationMap: Record<string, string> = {
      '1_week': '1 Week',
      '2_weeks': '2 Weeks', 
      '3_weeks': '3 Weeks',
      '4_weeks': '4 Weeks',
      '1_month': '1 Month',
      '3_months': '3 Months',
      '6_months': '6 Months',
      '12_months': '12 Months',
      'unlimited': 'Unlimited'
    };
    return durationMap[duration] || duration;
  };

  // Format class types - FIXED with correct property names
  const formatClassTypes = (classTypes: ClassType[]): React.ReactNode => {
    if (!classTypes || classTypes.length === 0) return 'All Classes';
    
    if (classTypes.length <= 3) {
      return classTypes.map(type => (
        <Chip key={type} label={type.toUpperCase()} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
      ));
    }
    
    return (
      <>
        {classTypes.slice(0, 2).map(type => (
          <Chip key={type} label={type.toUpperCase()} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
        ))}
        <Tooltip title={classTypes.slice(2).map(t => t.toUpperCase()).join(', ')}>
          <Chip label={`+${classTypes.length - 2} more`} size="small" />
        </Tooltip>
      </>
    );
  };

  // Loading state
  if (authLoading || (loading && memberships.length === 0)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
        </Grid>

        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  // Check admin access
  if (!sessionData || sessionData.role !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          You don't have permission to access this page. Admin access required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Membership Plans
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Plan
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Plans
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalPlans}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Active Plans
              </Typography>
              <Typography variant="h4" component="div">
                {stats.activePlans}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
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
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Memberships Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Class Types</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : paginatedMemberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="textSecondary">
                      {searchTerm ? 'No membership plans found matching your search.' : 'No membership plans created yet.'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ mt: 2 }}
                      >
                        Create Your First Plan
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMemberships.map((membership) => (
                  <TableRow key={membership.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {membership.name}
                        </Typography>
                        {membership.description && (
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {membership.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {formatDuration(membership.duration)}
                    </TableCell>
                    <TableCell>
                      {formatPrice(membership.price)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        {formatClassTypes(membership.classTypes)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={membership.status === 'active' ? 'Active' : 'Inactive'}
                        size="small"
                        color={membership.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, membership)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && filteredMemberships.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredMemberships.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Dialog - FIXED props */}
      <MembershipFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateMembership}
        mode="create"
      />

      {/* Edit Dialog - FIXED props */}
      <MembershipFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedMembership(null);
        }}
        onSubmit={handleUpdateMembership}
        mode="edit"
        membership={selectedMembership}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedMembership(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Membership Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedMembership?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedMembership(null);
            }}
            disabled={submitLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteMembership}
            color="error"
            variant="contained"
            disabled={submitLoading}
          >
            {submitLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}