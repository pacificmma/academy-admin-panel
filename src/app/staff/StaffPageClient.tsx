// src/app/staff/StaffPageClient.tsx - Staff Management Client Component
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  FitnessCenter as TrainerIcon,
  People as StaffIcon,
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';

import { SessionData, UserRole } from '../types';
import CreateStaffDialog from '../components/ui/CreateStaffDialog';

interface StaffMember {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  specializations?: string[];
  certifications?: string[];
}

interface StaffPageClientProps {
  session: SessionData;
}

export default function StaffPageClient({ session }: StaffPageClientProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/staff', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch staff members');
      }

      const data = await response.json();
      if (data.success) {
        setStaffMembers(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch staff members');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  // Handle staff creation success
  const handleStaffCreated = (newStaff: StaffMember) => {
    setStaffMembers(prev => [newStaff, ...prev]);
    setCreateDialogOpen(false);
  };

  // Filter staff members based on search term
  const filteredStaff = staffMembers.filter(staff =>
    staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated staff members
  const paginatedStaff = filteredStaff.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle action menu
  const handleActionMenuClick = (event: React.MouseEvent<HTMLElement>, staff: StaffMember) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedStaff(staff);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedStaff(null);
  };

  // Get role icon
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <AdminIcon sx={{ fontSize: 20 }} />;
      case 'trainer':
        return <TrainerIcon sx={{ fontSize: 20 }} />;
      case 'staff':
        return <StaffIcon sx={{ fontSize: 20 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 20 }} />;
    }
  };

  // Get role color
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'trainer':
        return 'primary';
      case 'staff':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Stats cards data
  const statsData = [
    {
      title: 'Total Staff',
      value: staffMembers.length,
      icon: PersonIcon,
      color: 'primary',
    },
    {
      title: 'Admins',
      value: staffMembers.filter(s => s.role === 'admin').length,
      icon: AdminIcon,
      color: 'error',
    },
    {
      title: 'Trainers',
      value: staffMembers.filter(s => s.role === 'trainer').length,
      icon: TrainerIcon,
      color: 'primary',
    },
    {
      title: 'Staff Members',
      value: staffMembers.filter(s => s.role === 'staff').length,
      icon: StaffIcon,
      color: 'secondary',
    },
  ];

  return (
    <Layout session={session} title="Staff Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Staff Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage staff members, trainers, and administrators
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsData.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: `${stat.color}.light`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <stat.icon sx={{ color: `${stat.color}.main`, fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={40} /> : stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Actions Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            placeholder="Search staff members..."
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
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            Add Staff Member
          </Button>
        </Box>

        {/* Staff Table */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box>
                            <Skeleton width={120} height={20} />
                            <Skeleton width={80} height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Skeleton width={150} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={70} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                      <TableCell><Skeleton width={40} /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <PersonIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        {searchTerm ? 'No staff members found matching your search' : 'No staff members found'}
                      </Typography>
                      {!searchTerm && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => setCreateDialogOpen(true)}
                          sx={{ mt: 2 }}
                        >
                          Add First Staff Member
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStaff.map((staff) => (
                    <TableRow key={staff.uid} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: 'primary.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'primary.main',
                              fontWeight: 600,
                            }}
                          >
                            {staff.fullName.charAt(0).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {staff.fullName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {staff.uid.slice(-8)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{staff.email}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{staff.phoneNumber}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={getRoleIcon(staff.role)}
                          label={staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                          color={getRoleColor(staff.role)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={staff.isActive ? 'Active' : 'Inactive'}
                          color={staff.isActive ? 'success' : 'error'}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {staff.lastLoginAt 
                            ? new Date(staff.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleActionMenuClick(e, staff)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {!loading && filteredStaff.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredStaff.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleActionMenuClose}>
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Edit Staff
          </MenuItem>
          <MenuItem onClick={handleActionMenuClose} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Deactivate
          </MenuItem>
        </Menu>

        {/* Create Staff Dialog */}
        <CreateStaffDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onStaffCreated={handleStaffCreated}
        />
      </Container>
    </Layout>
  );
}