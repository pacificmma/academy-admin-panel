// src/app/memberships/MembershipsPageClient.tsx - FIXED VERSION with correct dialog props
'use client';

import React, { useState, useEffect } from 'react';
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

  // Load data on component mount
  useEffect(() => {
    loadMemberships();
    loadStats();
  }, []);

  const loadMemberships = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.classTypes?.length) params.append('classTypes', filters.classTypes.join(','));
      if (filters.duration?.length) params.append('duration', filters.duration.join(','));

      const response = await fetch(`/api/memberships?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setMemberships(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/memberships/stats');
      const result = await response.json();

      if (response.ok) {
        setStats(result.data);
      }
    } catch (err) {
      // Stats are optional, don't show error for this
      console.warn('Failed to load stats:', err);
    }
  };

  // Filter memberships based on search term
  const filteredMemberships = memberships.filter(membership =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedMemberships = filteredMemberships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Event handlers with proper async/await handling
  const handleCreateMembership = async (formData: MembershipPlanFormData): Promise<void> => {
    try {
      setSubmitLoading(true);

      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan created successfully');
        setCreateDialogOpen(false);
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to create membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create membership plan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditMembership = async (formData: MembershipPlanFormData): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);

      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan updated successfully');
        setEditDialogOpen(false);
        setSelectedMembership(null);
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to update membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership plan');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMembership = async (): Promise<void> => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);

      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Membership plan deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedMembership(null);
        await Promise.all([loadMemberships(), loadStats()]);
      } else {
        throw new Error(result.error || 'Failed to delete membership plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete membership plan');
    } finally {
      setSubmitLoading(false);
    }
  };

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

  // Stats cards - cleaned version
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

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                elevation={0}
                sx={{
                  background: `${card.color === 'primary' ? '#e3f2fd' : '#e8f5e8'}`,
                  border: '1px solid',
                  borderColor: `${card.color}.200`,
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${card.color}.100`,
                        color: `${card.color}.700`,
                      }}
                    >
                      <card.icon />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {card.title}
                      </Typography>
                      <Typography variant="h5" component="p" fontWeight="bold">
                        {card.value}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Main Content */}
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Toolbar */}
          <Box
            sx={{
              p: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <TextField
                placeholder="Search membership plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <FilterIcon />
              </IconButton>
            </Box>
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

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Plan Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Class Types</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
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
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor:'#1976d2',
                            }}
                          />
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {membership.name}
                            </Typography>
                            {membership.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {membership.description.length > 50
                                  ? `${membership.description.substring(0, 50)}...`
                                  : membership.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getDurationLabel(membership.duration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {formatPrice(membership.price)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getClassTypeLabels(membership.classTypes)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={membership.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(membership.status),
                            color: 'white',
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {membership.createdAt ? new Date(membership.createdAt).toLocaleDateString() : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
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

          {/* Pagination */}
          {!loading && paginatedMemberships.length > 0 && (
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

        {/* FIXED: Dialogs with correct props based on actual component interfaces */}
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