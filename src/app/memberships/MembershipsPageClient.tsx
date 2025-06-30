// src/app/memberships/MembershipsPageClient.tsx - Final Professional Version
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
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import {
  MembershipPlan,
  MembershipPlanFormData,
  formatDuration,
  formatCurrency,
} from '../types/membership';
import { SessionData } from '../types';

interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
}

interface MembershipsPageClientProps {
  session: SessionData;
}

export default function MembershipsPageClient({ session }: MembershipsPageClientProps): React.JSX.Element {
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState<MembershipStats>({ totalPlans: 0, activePlans: 0, inactivePlans: 0 });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadMemberships = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const url = `/api/memberships${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { 
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load memberships: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setMemberships(result.data || []);
        const totalPlans = result.data?.length || 0;
        const activePlans = result.data?.filter((plan: MembershipPlan) => plan.status === 'active').length || 0;
        const inactivePlans = result.data?.filter((plan: MembershipPlan) => plan.status === 'inactive').length || 0;
        setStats({ totalPlans, activePlans, inactivePlans });
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleCreateMembership = async (data: MembershipPlanFormData): Promise<void> => {
    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage('Membership plan created successfully!');
        setCreateDialogOpen(false);
        await loadMemberships();
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

  const handleUpdateMembership = async (data: MembershipPlanFormData): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage('Membership plan updated successfully!');
        setEditDialogOpen(false);
        setSelectedMembership(null);
        await loadMemberships();
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

  const handleDeleteMembership = async (): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage('Membership plan deleted successfully!');
        setDeleteDialogOpen(false);
        setSelectedMembership(null);
        await loadMemberships();
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

  const handleChangePage = (event: unknown, newPage: number): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMemberships();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, loadMemberships]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const filteredMemberships = memberships.filter(membership =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.classTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedMemberships = filteredMemberships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Layout session={session} title="Membership Plans">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Membership Plans
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadMemberships}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={loading}
              sx={{
                bgcolor: '#0F5C6B',
                '&:hover': { bgcolor: '#0a4a57' },
              }}
            >
              Create Plan
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
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
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Active Plans
                </Typography>
                <Typography variant="h4" component="div" color="success.main">
                  {stats.activePlans}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Inactive Plans
                </Typography>
                <Typography variant="h4" component="div" color="warning.main">
                  {stats.inactivePlans}
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
            disabled={loading}
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
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton width="60%" /></TableCell>
                      <TableCell><Skeleton width="40%" /></TableCell>
                      <TableCell><Skeleton width="30%" /></TableCell>
                      <TableCell><Skeleton width="80%" /></TableCell>
                      <TableCell><Skeleton width="20%" /></TableCell>
                      <TableCell><Skeleton width="10%" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm ? 'No membership plans found matching your search.' : 'No membership plans created yet.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMemberships.map((membership) => (
                    <TableRow key={membership.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {membership.name}
                        </Typography>
                        {membership.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {membership.description.length > 50 
                              ? `${membership.description.substring(0, 50)}...`
                              : membership.description
                            }
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDuration(membership.durationValue, membership.durationType)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(membership.price, membership.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {membership.classTypes.slice(0, 2).map((type) => (
                            <Chip
                              key={type}
                              label={type}
                              size="small"
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontSize: '0.75rem',
                              }}
                            />
                          ))}
                          {membership.classTypes.length > 2 && (
                            <Chip
                              label={`+${membership.classTypes.length - 2}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
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
                          disabled={loading}
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
          <MenuItem onClick={handleEditClick} disabled={submitLoading}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }} disabled={submitLoading}>
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
              startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
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
          <Alert 
            onClose={() => setSuccessMessage(null)} 
            severity="success" 
            sx={{ width: '100%' }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}