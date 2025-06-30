// src/app/memberships/MembershipsPageClient.tsx - FIXED with proper authentication
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Grid,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  CardMembership as MembershipIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';
import { SessionData } from '../types';
import {
  MembershipPlan,
  MembershipPlanFormData,
  MembershipFilters,
  MembershipStats,
  MEMBERSHIP_STATUSES,
  CLASS_TYPES,
  MEMBERSHIP_DURATIONS
} from '../types/membership';

interface MembershipsPageClientProps {
  session: SessionData;
}

export default function MembershipsPageClient({ session }: MembershipsPageClientProps): React.JSX.Element {
  const { user } = useAuth();
  
  // State management
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState<MembershipStats>({
    totalPlans: 0,
    activePlans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    status?: string[];
    classTypes?: string[];
    duration?: string[];
  }>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Menu states
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Get authentication headers
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadMemberships();
      loadStats();
    }
  }, [user]);

  const loadMemberships = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.classTypes?.length) params.append('classTypes', filters.classTypes.join(','));
      if (filters.duration?.length) params.append('duration', filters.duration.join(','));

      const url = `/api/memberships${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok) {
        setMemberships(result.data || []);
        console.log('Loaded memberships:', result.data?.length || 0);
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, searchTerm, filters]);

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships/stats', { headers });
      const result = await response.json();

      if (response.ok) {
        setStats(result.data);
      }
    } catch (err) {
      // Stats are optional, don't show error for this
      console.warn('Failed to load stats:', err);
    }
  }, [getAuthHeaders]);

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

  // Utility functions
  const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

  const getStatusColor = (status: string): string => {
    const statusConfig = MEMBERSHIP_STATUSES.find(s => s.value === status);
    return statusConfig?.color || '#9e9e9e';
  };

  const getClassTypeLabels = (classTypes: string[]): string => {
    return classTypes.map(type => {
      const classType = CLASS_TYPES.find(c => c.value === type);
      return classType?.label || type;
    }).join(', ');
  };

  const getDurationLabel = (duration: string): string => {
    const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.value === duration);
    return durationConfig?.label || duration;
  };

  // Stats cards
  const statsCards = [
    {
      title: 'Total Plans',
      value: stats.totalPlans,
      icon: MembershipIcon,
      color: 'primary' as const,
    },
    {
      title: 'Active Plans',
      value: stats.activePlans,
      icon: TrendingUpIcon,
      color: 'success' as const,
    },
  ];

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
          }}
        >
          <CardContent sx={{ p: 4, color: 'white' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'white'  }}>
              Membership Plans
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, color: 'white'  }}>
              Create and manage membership plans for your academy
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, color: 'white'  }}>
              Define pricing, duration, and class access for different membership tiers
            </Typography>
          </CardContent>
        </Paper>

        {/* Success/Error Messages */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success">
            {successMessage}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: `${card.color}.main`,
                        color: 'white',
                      }}
                    >
                      <card.icon />
                    </Box>
                    <Box>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                        {loading ? (
                          <Skeleton width={40} />
                        ) : (
                          card.value
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.title}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Controls */}
        <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
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
              sx={{ minWidth: 300 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            >
              Filters
            </Button>
            
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  bgcolor: '#0F5C6B',
                  '&:hover': { bgcolor: '#0a4a57' },
                }}
              >
                Add Plan
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Memberships Table */}
        <Paper elevation={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan Name</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Class Types</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton /></TableCell>
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
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm || Object.keys(filters).length > 0
                          ? 'No membership plans match your search criteria'
                          : 'No membership plans found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMemberships.map((membership) => (
                    <TableRow key={membership.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {membership.name}
                          </Typography>
                          {membership.description && (
                            <Typography variant="body2" color="text.secondary">
                              {membership.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getDurationLabel(membership.duration)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {formatPrice(membership.price)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {membership.classTypes.slice(0, 2).map((type) => (
                            <Chip
                              key={type}
                              label={CLASS_TYPES.find(ct => ct.value === type)?.label || type}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {membership.classTypes.length > 2 && (
                            <Chip
                              label={`+${membership.classTypes.length - 2} more`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={MEMBERSHIP_STATUSES.find(s => s.value === membership.status)?.label}
                          size="small"
                          sx={{ 
                            bgcolor: getStatusColor(membership.status) + '20',
                            color: getStatusColor(membership.status),
                            borderColor: getStatusColor(membership.status),
                          }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {membership.createdAt ? 
                          new Date(membership.createdAt).toLocaleDateString() : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSelectedMembership(membership);
                            setMenuAnchorEl(e.currentTarget);
                          }}
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
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          )}
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              setEditDialogOpen(true);
              setMenuAnchorEl(null);
            }}
          >
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDeleteDialogOpen(true);
              setMenuAnchorEl(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          PaperProps={{ sx: { minWidth: 200 } }}
        >
          <MenuItem>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status || []}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as string[] })}
              >
                {MEMBERSHIP_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MenuItem>
        </Menu>

        {/* Dialogs */}
        <MembershipFormDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateMembership}
          mode="create"
        />

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

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedMembership(null);
          }}
          onConfirm={handleDeleteMembership}
          title="Delete Membership Plan"
          itemName={selectedMembership?.name || ''}
          itemType="membership plan"
          loading={submitLoading}
          additionalInfo={selectedMembership ? [
            { label: 'Duration', value: getDurationLabel(selectedMembership.duration) },
            { label: 'Price', value: formatPrice(selectedMembership.price) },
            { label: 'Status', value: selectedMembership.status },
          ] : []}
          warningMessage="Deleting this membership plan will affect any members currently subscribed to it."
        />
      </Container>
    </Layout>
  );
}