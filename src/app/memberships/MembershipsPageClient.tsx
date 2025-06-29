// src/app/memberships/MembershipsPageClient.tsx - Complete implementation
'use client';

import { useState, useEffect } from 'react';
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
  AttachMoney as MoneyIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import MembershipFormDialog from '../components/forms/MembershipFormDialog';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';
import { SessionData } from '../types';
import { 
  MembershipPlan, 
  MembershipPlanFormData,
  MembershipFilters, 
  MEMBERSHIP_STATUSES, 
  CLASS_TYPES,
  MEMBERSHIP_DURATIONS 
} from '../types/membership';

interface MembershipsPageClientProps {
  session: SessionData;
}

export default function MembershipsPageClient({ session }: MembershipsPageClientProps) {
  // State management
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MembershipFilters>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    totalRevenue: 0,
    popularPlan: '',
  });

  // Load memberships data
  useEffect(() => {
    loadMemberships();
  }, [filters, searchTerm]);

  const loadMemberships = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filters.status?.length) queryParams.append('status', filters.status.join(','));
      if (filters.classTypes?.length) queryParams.append('classTypes', filters.classTypes.join(','));
      if (filters.duration?.length) queryParams.append('duration', filters.duration.join(','));
      if (filters.priceRange) {
        queryParams.append('minPrice', filters.priceRange.min.toString());
        queryParams.append('maxPrice', filters.priceRange.max.toString());
      }

      const response = await fetch(`/api/memberships?${queryParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load memberships');
      }

      setMemberships(result.data || []);
      setStats(result.stats || stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMembership = async (data: MembershipPlanFormData) => {
    try {
      setSubmitLoading(true);
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create membership');
      }

      setMemberships(prev => [result.data, ...prev]);
      setSuccessMessage('Membership plan created successfully');
      setCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
      throw err; // Re-throw to prevent dialog from closing
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditMembership = async (data: MembershipPlanFormData) => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update membership');
      }

      setMemberships(prev => 
        prev.map(m => m.id === selectedMembership.id ? result.data : m)
      );
      setSuccessMessage('Membership plan updated successfully');
      setEditDialogOpen(false);
      setSelectedMembership(null);
    } catch (err: any) {
      setError(err.message);
      throw err; // Re-throw to prevent dialog from closing
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMembership = async () => {
    if (!selectedMembership) return;

    try {
      setSubmitLoading(true);
      const response = await fetch(`/api/memberships/${selectedMembership.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete membership');
      }

      setMemberships(prev => prev.filter(m => m.id !== selectedMembership.id));
      setSuccessMessage('Membership plan deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedMembership(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredMemberships = memberships.filter(membership =>
    membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membership.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedMemberships = filteredMemberships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const getStatusColor = (status: string) => {
    const statusConfig = MEMBERSHIP_STATUSES.find(s => s.value === status);
    return statusConfig?.color || '#9e9e9e';
  };

  const getClassTypeLabels = (classTypes: string[]) => {
    return classTypes.map(type => {
      const classType = CLASS_TYPES.find(c => c.value === type);
      return classType?.label || type;
    }).join(', ');
  };

  const getDurationLabel = (duration: string) => {
    const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.value === duration);
    return durationConfig?.label || duration;
  };

  const statsCards = [
    {
      title: 'Total Plans',
      value: stats.totalPlans,
      icon: MembershipIcon,
      color: 'primary',
    },
    {
      title: 'Active Plans',
      value: stats.activePlans,
      icon: TrendingUpIcon,
      color: 'success',
    },
    {
      title: 'Monthly Revenue',
      value: formatPrice(stats.totalRevenue),
      icon: MoneyIcon,
      color: 'warning',
    },
    {
      title: 'Popular Plan',
      value: stats.popularPlan || 'N/A',
      icon: StarIcon,
      color: 'secondary',
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
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Membership Plans
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              Create and manage membership plans for your academy
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
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
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: `${stat.color}.50`,
                        color: `${stat.color}.main`,
                      }}
                    >
                      <stat.icon />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {stat.title}
                      </Typography>
                      <Typography variant="h6" fontWeight="600">
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Actions and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Create Membership Plan
              </Button>

              <TextField
                placeholder="Search membership plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <IconButton
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                sx={{ bgcolor: 'grey.100' }}
              >
                <FilterIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {/* Memberships Table */}
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
                  <TableCell>Members</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Loading memberships...
                    </TableCell>
                  </TableRow>
                ) : paginatedMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      {searchTerm ? 'No memberships found matching your search' : 'No membership plans created yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMemberships.map((membership) => (
                    <TableRow key={membership.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: membership.colorCode || '#1976d2',
                            }}
                          />
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="500">
                                {membership.name}
                              </Typography>
                              {membership.isPopular && (
                                <Chip label="Popular" size="small" color="warning" />
                              )}
                            </Box>
                            {membership.description && (
                              <Typography variant="caption" color="text.secondary">
                                {membership.description}
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
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {getClassTypeLabels(membership.classTypes)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={membership.status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(membership.status)}20`,
                            color: getStatusColor(membership.status),
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          0 {/* TODO: Add member count from member-membership relationship */}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => {
                            setMenuAnchorEl(e.currentTarget);
                            setSelectedMembership(membership);
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
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit Plan
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDeleteDialogOpen(true);
              setMenuAnchorEl(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete Plan
          </MenuItem>
        </Menu>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          PaperProps={{ sx: { minWidth: 250, p: 2 } }}
        >
          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
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

          <FormControl size="small" fullWidth>
            <InputLabel>Duration</InputLabel>
            <Select
              multiple
              value={filters.duration || []}
              onChange={(e) => setFilters({ ...filters, duration: e.target.value as string[] })}
            >
              {MEMBERSHIP_DURATIONS.map((duration) => (
                <MenuItem key={duration.value} value={duration.value}>
                  {duration.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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