// src/app/memberships/MembershipsPageClient.tsx - Updated with correct types
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
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import {
  MembershipPlan,
  MembershipPlanFormData,
  MembershipStats,
  formatDuration,
} from '../types/membership';
import { SessionData } from '../types';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';

interface MembershipsPageClientProps {
  session: SessionData;
}

// Local utility function for currency formatting
const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

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
    
    // FIXED: The API returns {data: Array, total: Number} structure
    if (result.success) {
      // The API response structure is: {success: true, data: {data: Array, total: Number}}
      const responseData = result.data || {};
      const fetchedData = responseData.data || [];
      
      // Ensure the data is an array
      if (Array.isArray(fetchedData)) {
        setMemberships(fetchedData);
        
        // Calculate stats
        const totalPlans = fetchedData.length;
        const activePlans = fetchedData.filter((plan: MembershipPlan) => plan.status === 'active').length;
        const inactivePlans = fetchedData.filter((plan: MembershipPlan) => plan.status === 'inactive').length;
        
        setStats({ totalPlans, activePlans, inactivePlans });
      } else {
        setMemberships([]);
        setStats({ totalPlans: 0, activePlans: 0, inactivePlans: 0 });
      }
    } else {
      throw new Error(result.error || 'Failed to load memberships');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Error loading memberships:', err);
    setError(errorMessage);
    setMemberships([]); // Ensure we have a valid empty array on error
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
        throw new Error(result.error || result.details?.[0]?.message || 'Failed to create membership plan');
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
                  <TableCell>Weekly Attendance</TableCell>
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
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {membership.name}
                        </Typography>
                        {membership.description && (
                          <Typography variant="caption" color="textSecondary">
                            {membership.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {membership.durationType === 'unlimited' 
                          ? 'Unlimited' 
                          : formatDuration(membership.durationValue, membership.durationType)
                        }
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(membership.price)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {membership.classTypes.map((classType, index) => (
                          <Chip
                            key={index}
                            label={classType}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    
                    {/* YENİ SÜTUN: Weekly Attendance */}
                    <TableCell>
                      <Typography variant="body2">
                        {membership.isUnlimited 
                          ? 'Unlimited/week'
                          : membership.weeklyAttendanceLimit 
                            ? `${membership.weeklyAttendanceLimit}/week`
                            : 'No limit'
                        }
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                        size="small"
                        color={
                          membership.status === 'active' ? 'success' :
                          membership.status === 'inactive' ? 'default' :
                          'warning'
                        }
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMembership(membership);
                          setMenuAnchor(e.currentTarget);
                        }}
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
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedMembership(null);
          }}
          onConfirm={handleDeleteMembership}
          title="Confirm Deletion"
          itemName={selectedMembership?.name || ''}
          itemType="membership plan"
          loading={submitLoading}
          warningMessage="This action will permanently delete the membership plan."
          additionalInfo={[
            { label: 'Price', value: formatCurrency(selectedMembership?.price || 0,) },
            { label: 'Duration', value: formatDuration(selectedMembership?.durationValue || 0, selectedMembership?.durationType || 'months') },
          ]}
        />

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