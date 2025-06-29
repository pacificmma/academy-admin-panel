// src/app/membership-packages/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Fab,
  Paper,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  MenuItem as MenuItemComponent,
  Divider,
  Avatar,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';

import MembershipPackageForm from '@/app/components/MembershipPackageForm';
import ProtectedRoute from '@/app/components/auth/ProtectedRoutes';
import { useAuth } from '@/app/contexts/AuthContext';

import {
  MembershipPackageRecord,
  PackageUsageStats,
  AgeGroup,
} from '@/app/types/membershipPackages';
import {
  getAllMembershipPackages,
  updateMembershipPackage,
  deleteMembershipPackage,
  getPackageUsageStats,
  cloneMembershipPackage,
  getAllSportCategories,
} from '@/app/services/membershipPackageService';

const MembershipPackagesPage = () => {
  const [packages, setPackages] = useState<MembershipPackageRecord[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<MembershipPackageRecord[]>([]);
  const [packageStats, setPackageStats] = useState<Record<string, PackageUsageStats>>({});
  const [openForm, setOpenForm] = useState(false);
  const [editData, setEditData] = useState<MembershipPackageRecord | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Menu and dialog states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPackage, setSelectedPackage] = useState<MembershipPackageRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<MembershipPackageRecord | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('displayOrder');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, sessionData } = useAuth();

  useEffect(() => {
    loadPackages();
  }, [refreshTrigger]);

  // Filter and sort packages
  useEffect(() => {
    let filtered = [...packages];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pkg => 
        pkg.name.toLowerCase().includes(query) ||
        (pkg.description && pkg.description.toLowerCase().includes(query))
      );
    }

    // Age group filter
    if (ageGroupFilter !== 'all') {
      filtered = filtered.filter(pkg => 
        pkg.ageGroup === ageGroupFilter || pkg.ageGroup === 'both'
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }

    // Sort packages
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'createdAt':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'popularity':
          const statsA = packageStats[a.id];
          const statsB = packageStats[b.id];
          return (statsB?.totalSubscriptions || 0) - (statsA?.totalSubscriptions || 0);
        case 'displayOrder':
        default:
          if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    setFilteredPackages(filtered);
  }, [packages, searchQuery, ageGroupFilter, statusFilter, sortBy, packageStats]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const packagesData = await getAllMembershipPackages();
      setPackages(packagesData);
      
      // Load stats for each package
      const stats: Record<string, PackageUsageStats> = {};
      const statsPromises = packagesData.map(async (pkg) => {
        try {
          const packageStats = await getPackageUsageStats(pkg.id);
          stats[pkg.id] = packageStats;
        } catch (error) {
          // Default stats on error
          stats[pkg.id] = {
            packageId: pkg.id,
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            pausedSubscriptions: 0,
            cancelledSubscriptions: 0,
            totalRevenue: 0,
          };
        }
      });
      
      await Promise.allSettled(statsPromises);
      setPackageStats(stats);
      
    } catch (err: any) {
      setError(err.message || 'Üyelik paketleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const stats = {
      totalPackages: packages.length,
      activePackages: packages.filter(p => p.status === 'Active').length,
      adultPackages: packages.filter(p => p.ageGroup === 'adult' || p.ageGroup === 'both').length,
      youthPackages: packages.filter(p => p.ageGroup === 'youth' || p.ageGroup === 'both').length,
      totalRevenue: 0,
      totalSubscriptions: 0,
    };

    Object.values(packageStats).forEach(stat => {
      stats.totalRevenue += stat.totalRevenue;
      stats.totalSubscriptions += stat.totalSubscriptions;
    });

    return stats;
  }, [packages, packageStats]);

  const handleFormClose = () => {
    setOpenForm(false);
    setEditData(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (packageData: MembershipPackageRecord) => {
    setEditData(packageData);
    setOpenForm(true);
    handleMenuClose();
  };

  const handleAddNew = () => {
    setEditData(undefined);
    setOpenForm(true);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, pkg: MembershipPackageRecord) => {
    setAnchorEl(event.currentTarget);
    setSelectedPackage(pkg);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPackage(null);
  };

  const handleToggleStatus = async (pkg: MembershipPackageRecord) => {
    try {
      const newStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
      await updateMembershipPackage(
        pkg.id, 
        { status: newStatus },
        sessionData?.uid,
        sessionData?.fullName
      );
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setError(`Paket durumu güncellenemedi: ${error.message}`);
    }
    handleMenuClose();
  };

  const handleClone = async (pkg: MembershipPackageRecord) => {
    if (!sessionData) {
      setError('Paket kopyalamak için giriş yapmalısınız.');
      return;
    }

    try {
      const newName = `${pkg.name} (Kopya)`;
      await cloneMembershipPackage(pkg.id, newName, sessionData.uid, sessionData.fullName);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setError(`Paket kopyalanamadı: ${error.message}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = (pkg: MembershipPackageRecord) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;

    try {
      await deleteMembershipPackage(packageToDelete.id);
      setRefreshTrigger(prev => prev + 1);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    } catch (error: any) {
      setError(`Paket silinemedi: ${error.message}`);
    }
  };

  const getDurationDisplay = (pkg: MembershipPackageRecord) => {
    const unit = pkg.durationType === 'months' ? 'ay' : pkg.durationType === 'weeks' ? 'hafta' : 'gün';
    return `${pkg.duration} ${unit}`;
  };

  const getPriceDisplay = (pkg: MembershipPackageRecord) => {
    if (pkg.durationType === 'months') {
      return `₺${pkg.price}/ay`;
    }
    return `₺${pkg.price} toplam`;
  };

  const getAgeGroupIcon = (ageGroup: AgeGroup) => {
    switch (ageGroup) {
      case 'adult': return <PersonIcon />;
      case 'youth': return <ChildCareIcon />;
      case 'both': return <FamilyRestroomIcon />;
      default: return <GroupIcon />;
    }
  };

  const getAgeGroupDisplay = (ageGroup: AgeGroup) => {
    switch (ageGroup) {
      case 'adult': return 'Yetişkin';
      case 'youth': return 'Çocuk/Genç';
      case 'both': return 'Tüm Yaşlar';
      default: return ageGroup;
    }
  };

  const getSportCategoriesDisplay = async (pkg: MembershipPackageRecord) => {
    if (pkg.isFullAccess) {
      return 'Tam Erişim';
    }
    
    try {
      const allCategories = await getAllSportCategories();
      const categoryNames = pkg.sportCategories
        .map(catId => allCategories.find(cat => cat.id === catId)?.name)
        .filter(Boolean);
      
      if (categoryNames.length <= 2) {
        return categoryNames.join(', ');
      }
      
      return `${categoryNames.slice(0, 2).join(', ')} +${categoryNames.length - 2} daha`;
    } catch (error) {
      return `${pkg.sportCategories.length} spor`;
    }
  };

  const renderPackageCard = (pkg: MembershipPackageRecord) => {
    const stats = packageStats[pkg.id];
    
    return (
      <Card
        key={pkg.id}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: pkg.isPopular ? 2 : 1,
          borderColor: pkg.isPopular ? 'warning.main' : 'divider',
          '&:hover': {
            boxShadow: theme.shadows[4],
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out',
          },
        }}
      >
        {pkg.isPopular && (
          <Box
            sx={{
              position: 'absolute',
              top: -10,
              right: 16,
              backgroundColor: 'warning.main',
              color: 'warning.contrastText',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <StarIcon sx={{ fontSize: 14 }} />
            Popüler
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h3" fontWeight={600} sx={{ mb: 0.5 }}>
                {pkg.name}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={pkg.status === 'Active' ? 'Aktif' : pkg.status === 'Inactive' ? 'Pasif' : 'Arşivlenmiş'} 
                  size="small" 
                  color={pkg.status === 'Active' ? 'success' : pkg.status === 'Inactive' ? 'warning' : 'default'}
                />
                <Chip 
                  label={getDurationDisplay(pkg)} 
                  size="small" 
                  variant="outlined"
                  icon={<AccessTimeIcon />}
                />
                <Chip 
                  label={getAgeGroupDisplay(pkg.ageGroup)} 
                  size="small" 
                  variant="outlined"
                  icon={getAgeGroupIcon(pkg.ageGroup)}
                />
              </Box>
            </Box>
            
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuClick(e, pkg)}
              sx={{ mt: -1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {pkg.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {pkg.description}
            </Typography>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="h4" color="primary.main" fontWeight={700}>
              {getPriceDisplay(pkg)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FitnessCenterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {pkg.isFullAccess ? 'Tam Erişim' : `${pkg.sportCategories.length} Spor`}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {pkg.isUnlimited ? 'Sınırsız ders' : 
               `${pkg.classLimitPerWeek ? `${pkg.classLimitPerWeek}/hafta` : ''}${pkg.classLimitPerWeek && pkg.classLimitPerMonth ? ', ' : ''}${pkg.classLimitPerMonth ? `${pkg.classLimitPerMonth}/ay` : ''}`}
            </Typography>
          </Box>

          {/* Package Features */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {pkg.allowFreeze && (
              <Chip label="Dondurma izni" size="small" variant="outlined" />
            )}
            {pkg.autoRenewal && (
              <Chip label="Otomatik yenileme" size="small" variant="outlined" />
            )}
            {pkg.guestPassesIncluded && pkg.guestPassesIncluded > 0 && (
              <Chip label={`${pkg.guestPassesIncluded} misafir geçişi`} size="small" variant="outlined" />
            )}
          </Box>

          {/* Usage Stats */}
          {stats && (
            <Paper sx={{ p: 1.5, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                Kullanım İstatistikleri
              </Typography>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 1 
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary.main" fontWeight={600}>
                    {stats.totalSubscriptions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Üyelik
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main" fontWeight={600}>
                    ₺{stats.totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gelir
                  </Typography>
                </Box>
              </Box>
              
              {stats.averageRating && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    {stats.averageRating.toFixed(1)} ({stats.totalReviews} değerlendirme)
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => handleEdit(pkg)}
          >
            Paketi Düzenle
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LinearProgress />
          <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
            Üyelik paketleri yükleniyor...
          </Typography>
        </Container>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
              Üyelik Paketleri
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Spor salonu üyelik paketlerinizi yönetin
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Paket Ekle
          </Button>
        </Box>

        {/* Overview Stats */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
          gap: 3, 
          mb: 4 
        }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
              <LocalOfferIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="primary.main">
              {overviewStats.totalPackages}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Toplam Paket
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
              <TrendingUpIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="success.main">
              {overviewStats.activePackages}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Aktif Paket
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
              <GroupIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="warning.main">
              {overviewStats.totalSubscriptions}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Toplam Üyelik
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
              <AttachMoneyIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="info.main">
              ₺{overviewStats.totalRevenue.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Toplam Gelir
            </Typography>
          </Paper>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
            gap: 2 
          }}>
            <TextField
              label="Paket Ara"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small">
              <InputLabel>Yaş Grubu</InputLabel>
              <Select
                value={ageGroupFilter}
                label="Yaş Grubu"
                onChange={(e) => setAgeGroupFilter(e.target.value as AgeGroup | 'all')}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="adult">Yetişkin</MenuItem>
                <MenuItem value="youth">Çocuk/Genç</MenuItem>
                <MenuItem value="both">Tüm Yaşlar</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>Durum</InputLabel>
              <Select
                value={statusFilter}
                label="Durum"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="Active">Aktif</MenuItem>
                <MenuItem value="Inactive">Pasif</MenuItem>