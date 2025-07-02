'use client';

// src/app/members/MembersPageClient.tsx - Members management page
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  EmojiEvents as AwardsIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { MemberRecord, MemberFormData, MemberStats } from '@/app/types/member';
import CreateMemberForm from '@/app/components/forms/CreateMemberForm';
import GroupIcon from "@mui/icons-material/Group"
import Layout from '../components/layout/Layout';
import { SessionData } from '@/app/types';

interface MembersPageClientProps {
  session: SessionData;
}

export default function MembersPageClient({ session }: MembersPageClientProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    linkedMembers: 0,
    independentMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [familyFilter, setFamilyFilter] = useState<'all' | 'independent' | 'linked'>('all');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Action menu state
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  // Load members data
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      }
      if (familyFilter === 'independent') {
        params.append('hasParent', 'false');
      } else if (familyFilter === 'linked') {
        params.append('hasParent', 'true');
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const url = `/api/members${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load members: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const responseData = result.data || {};
        const fetchedData = responseData.data || [];
        
        if (Array.isArray(fetchedData)) {
          setMembers(fetchedData);
          
          // Calculate stats
          const totalMembers = fetchedData.length;
          const activeMembers = fetchedData.filter((member: MemberRecord) => member.isActive).length;
          const inactiveMembers = fetchedData.filter((member: MemberRecord) => !member.isActive).length;
          const linkedMembers = fetchedData.filter((member: MemberRecord) => member.parentId).length;
          const independentMembers = fetchedData.filter((member: MemberRecord) => !member.parentId).length;
          
          setStats({ totalMembers, activeMembers, inactiveMembers, linkedMembers, independentMembers });
        } else {
          setMembers([]);
          setStats({ totalMembers: 0, activeMembers: 0, inactiveMembers: 0, linkedMembers: 0, independentMembers: 0 });
        }
      } else {
        throw new Error(result.error || 'Failed to load members');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, familyFilter]);

  // Load members on component mount and when filters change
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateMember = async (data: MemberFormData): Promise<void> => {
    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage('Member created successfully!');
        setCreateDialogOpen(false);
        await loadMembers();
      } else {
        throw new Error(result.error || result.details?.[0]?.message || 'Failed to create member');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create member';
      setError(errorMessage);
      throw err;
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMember = async (): Promise<void> => {
    if (!selectedMember) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`/api/members/${selectedMember.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(`Member ${selectedMember.isActive ? 'deactivated' : 'deleted'} successfully!`);
        setDeleteDialogOpen(false);
        await loadMembers();
      } else {
        throw new Error(result.error || `Failed to ${selectedMember.isActive ? 'deactivate' : 'delete'} member`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${selectedMember?.isActive ? 'deactivate' : 'delete'} member`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter members based on search term and other filters
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.emergencyContact.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && member.isActive) ||
                         (statusFilter === 'inactive' && !member.isActive);

    const matchesFamily = familyFilter === 'all' ||
                         (familyFilter === 'independent' && !member.parentId) ||
                         (familyFilter === 'linked' && member.parentId);

    return matchesSearch && matchesStatus && matchesFamily;
  });

  // Paginated members
  const paginatedMembers = filteredMembers.slice(
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
  const handleActionMenuClick = (event: React.MouseEvent<HTMLElement>, member: MemberRecord) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleActionMenuClose();
  };

  // Get parent member name
  const getParentName = (parentId: string): string => {
    const parent = members.find(m => m.id === parentId);
    return parent ? parent.fullName : 'Unknown Parent';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout session={session}>
    <Box sx={{ px: 2, py: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Members Management
        </Typography>
        {user?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Member
          </Button>
        )}
      </Box>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Members
                  </Typography>
                  <Typography variant="h6">
                    {stats.totalMembers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Members
                  </Typography>
                  <Typography variant="h6">
                    {stats.activeMembers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Inactive Members
                  </Typography>
                  <Typography variant="h6">
                    {stats.inactiveMembers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <GroupIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Linked Members
                  </Typography>
                  <Typography variant="h6">
                    {stats.linkedMembers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Independent Members
                  </Typography>
                  <Typography variant="h6">
                    {stats.independentMembers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Family Status</InputLabel>
                <Select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value as 'all' | 'independent' | 'linked')}
                  label="Family Status"
                >
                  <MenuItem value="all">All Members</MenuItem>
                  <MenuItem value="independent">Independent</MenuItem>
                  <MenuItem value="linked">Linked to Parent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFamilyFilter('all');
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Family</TableCell>
                <TableCell>Awards</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {member.fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <EmailIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        {member.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {member.phoneNumber && (
                        <Typography variant="body2">
                          <PhoneIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          {member.phoneNumber}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Emergency: {member.emergencyContact.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {member.parentId ? (
                      <Chip
                        icon={<GroupIcon />}
                        label={`Child of ${getParentName(member.parentId)}`}
                        size="small"
                        color="info"
                      />
                    ) : (
                      <Chip
                        icon={<PersonIcon />}
                        label="Independent"
                        size="small"
                        color="default"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {member.awards.length > 0 ? (
                      <Chip
                        icon={<AwardsIcon />}
                        label={`${member.awards.length} Award${member.awards.length !== 1 ? 's' : ''}`}
                        size="small"
                        color="warning"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No awards
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.isActive ? 'Active' : 'Inactive'}
                      color={member.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {user?.role === 'admin' && (
                      <IconButton
                        onClick={(e) => handleActionMenuClick(e, member)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No members found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredMembers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon sx={{ mr: 1 }} />
          {selectedMember?.isActive ? 'Deactivate' : 'Delete'} Member
        </MenuItem>
      </Menu>

      {/* Create Member Dialog */}
      <CreateMemberForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateMember}
        loading={submitLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          {selectedMember?.isActive ? 'Deactivate' : 'Delete'} Member
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {selectedMember?.isActive ? 'deactivate' : 'delete'} {selectedMember?.fullName}?
            {selectedMember?.isActive && ' This will also disable their authentication account.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteMember}
            color="error"
            disabled={submitLoading}
            startIcon={submitLoading && <CircularProgress size={20} />}
          >
            {submitLoading ? 'Processing...' : (selectedMember?.isActive ? 'Deactivate' : 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Layout>
  );
}