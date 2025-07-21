// src/app/staff/StaffPageClient.tsx - Onay butonu metnini iletmek ve durumu değiştirmeyi işlemek için güncellendi
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
  Snackbar,
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
import { SessionData } from '../types';
import { StaffRecord } from '../types/staff';
import { UserRole } from '../types/auth'; // UserRole'ü auth tiplerinden içe aktar
import CreateStaffDialog from '../components/ui/CreateStaffDialog';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';

interface StaffPageClientProps {
  session: SessionData;
}

export default function StaffPageClient({ session }: StaffPageClientProps) {
  const [staffMembers, setStaffMembers] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // Durum değiştirme onayı için kullanılır

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);

  // Personel üyelerini getir
  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      setError(null);
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

  // Personel oluşturma başarısını işle
  const handleStaffCreated = (newStaff: StaffRecord) => {
    setStaffMembers(prev => [newStaff, ...prev]);
    setCreateDialogOpen(false);
    setSuccessMessage('Staff member created successfully!');
  };

  // Personel güncelleme başarısını işle
  const handleStaffUpdated = (updatedStaff: StaffRecord) => {
    setStaffMembers(prev => prev.map(staff => staff.uid === updatedStaff.uid ? updatedStaff : staff));
    setEditDialogOpen(false);
    setSelectedStaff(null);
    setSuccessMessage('Staff member updated successfully!');
  };

  // Personel durumu değiştirme (pasifleştir/aktif hale getir)
  const handleStaffStatusToggle = async () => {
    if (!selectedStaff) return;

    try {
      setSubmitLoading(true);
      setError(null);
      const response = await fetch(`/api/staff/${selectedStaff.uid}`, {
        method: 'DELETE', // DELETE metodu durumu değiştirmek için kullanılır
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setDeleteDialogOpen(false);
        setSelectedStaff(null);
        // Yapılan işleme göre başarı mesajını güncelle
        const actionMessage = selectedStaff.isActive ? 'deactivated' : 'activated';
        setSuccessMessage(`Staff member ${actionMessage} successfully!`);
        fetchStaffMembers(); // Güncel 'isActive' durumunu almak için tam listeyi yenile
      } else {
        throw new Error(result.error || `Failed to ${selectedStaff.isActive ? 'deactivate' : 'activate'} staff member`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${selectedStaff?.isActive ? 'deactivate' : 'activate'} member`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Arama terimine göre personel üyelerini filtrele
  const filteredStaff = staffMembers.filter(staff =>
    staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sayfalanmış personel üyeleri
  const paginatedStaff = filteredStaff.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Sayfa değişimini işle
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Sayfa başına satır değişimini işle
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Eylem menüsünü işle
  const handleActionMenuClick = (event: React.MouseEvent<HTMLElement>, staff: StaffRecord) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedStaff(staff);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
    handleActionMenuClose();
  };

  // Bu artık durum değiştirme diyalogunu tetikleyecek
  const handleStatusToggleClick = () => {
    setDeleteDialogOpen(true);
    handleActionMenuClose();
  };

  // Rol ikonunu al
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <AdminIcon sx={{ fontSize: 20 }} />;
      case 'trainer':
        return <TrainerIcon sx={{ fontSize: 20 }} />;
      case 'visiting_trainer':
        return <StaffIcon sx={{ fontSize: 20 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 20 }} />;
    }
  };

  // Rol rengini al
  const getRoleColor = (role: UserRole): 'error' | 'primary' | 'secondary' | 'default' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'trainer':
        return 'primary';
      case 'visiting_trainer':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // İstatistik kartları verileri
  const statsData = [
    {
      title: 'Total Staff',
      value: staffMembers.length,
      icon: PersonIcon,
      color: 'primary',
      bgColor: 'primary.50',
    },
    {
      title: 'Admins',
      value: staffMembers.filter(s => s.role === 'admin').length,
      icon: AdminIcon,
      color: 'error',
      bgColor: 'error.50',
    },
    {
      title: 'Trainers',
      value: staffMembers.filter(s => s.role === 'trainer').length,
      icon: TrainerIcon,
      color: 'primary',
      bgColor: 'primary.50',
    },
    {
      title: 'Staff Members',
      value: staffMembers.filter(s => s.role === 'visiting_trainer').length,
      icon: StaffIcon,
      color: 'secondary',
      bgColor: 'secondary.50',
    },
  ];

  return (
    <Layout session={session} title="Staff Management">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Başlık Bölümü */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Staff Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage staff members, trainers, and administrators
          </Typography>
        </Box>

        {/* Hata Uyarısı */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* İstatistik Kartları */}
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
                      bgcolor: stat.bgColor,
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

        {/* Eylem Çubuğu */}
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

        {/* Personel Tablosu */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Skeleton variant="circular" width={40} height={40} /><Box><Skeleton width={120} height={20} /><Skeleton width={80} height={16} /></Box></Box></TableCell>
                      <TableCell><Skeleton width={150} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={70} /></TableCell>
                      <TableCell><Skeleton width={40} /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <PersonIcon sx={{ fontSize: 64, mb: 2, color: 'grey.400' }} />
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
                              color: 'white',
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
                          {staff.phoneNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{staff.phoneNumber}</Typography>
                            </Box>
                          )}
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

                      <TableCell align="right">
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleActionMenuClick(e, staff)}
                            size="small"
                            // Yöneticiler kendi hesaplarını bu kullanıcı arayüzünden doğrudan pasifleştiremezler
                            disabled={session.uid === staff.uid && staff.role === 'admin'} 
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

          {/* Sayfalama */}
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

        {/* Eylem Menüsü */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {selectedStaff && (
            <MenuItem onClick={handleEditClick} disabled={submitLoading}>
              <EditIcon sx={{ mr: 1, fontSize: 20 }} />
              Edit Staff
            </MenuItem>
          )}
          {selectedStaff && session.uid !== selectedStaff.uid && (
            <MenuItem
              onClick={handleStatusToggleClick} // Durum değiştirme diyalogunu tetiklemek için değiştirildi
              sx={{ color: selectedStaff.isActive ? 'error.main' : 'success.main' }}
              disabled={submitLoading}
            >
              {selectedStaff.isActive ? (
                <>
                  <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Deactivate
                </>
              ) : (
                <>
                  <AddIcon sx={{ mr: 1, fontSize: 20 }} /> Activate
                </>
              )}
            </MenuItem>
          )}
        </Menu>

        {/* Personel Oluşturma Diyaloğu */}
        <CreateStaffDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onStaffCreated={handleStaffCreated}
          mode="create"
        />

        {/* Personel Düzenleme Diyaloğu */}
        <CreateStaffDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedStaff(null);
          }}
          onStaffUpdated={handleStaffUpdated}
          initialStaffData={selectedStaff}
          mode="edit"
        />

        {/* Durum Değiştirme Onayı Diyaloğu (DeleteConfirmationDialog kullanılarak) */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedStaff(null);
          }}
          onConfirm={handleStaffStatusToggle} // Yeni durum değiştirme işleyicisini çağır
          title={selectedStaff?.isActive ? "Confirm Deactivation" : "Confirm Activation"}
          itemName={selectedStaff?.fullName || ''}
          itemType="staff member"
          loading={submitLoading}
          warningMessage={selectedStaff?.isActive ? 
            "This action will deactivate the staff member. They will no longer be able to log in." : 
            "This action will reactivate the staff member. They will be able to log in again."
          }
          // Mevcut duruma göre özelleştirilebilir buton metnini ilet
          confirmButtonText={selectedStaff?.isActive ? "Deactivate" : "Activate"} 
          additionalInfo={selectedStaff ? [
            { label: 'Role', value: selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1) },
            { label: 'Email', value: selectedStaff.email },
          ] : []}
        />

        {/* Başarı Snackbar'ı */}
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