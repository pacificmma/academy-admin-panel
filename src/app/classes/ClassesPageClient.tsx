// src/app/classes/ClassesPageClient.tsx (Güncellendi)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import ClassCard from '@/app/components/ui/ClassCards';
import ClassCalendar from '@/app/components/ui/ClassCalendar';
import ClassFormDialog from '@/app/components/forms/ClassFormDialog';
import DeleteConfirmationDialog from '@/app/components/ui/DeleteConfirmationDialog';
import { ClassSchedule, ClassInstance, ClassFormData, ClassType, ClassFilters, CLASS_TYPE_OPTIONS } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function ClassesPageClient() {
  const { user } = useAuth(); // `user` is typed as AuthUser | null from AuthContextType
  const [tabIndex, setTabIndex] = useState(0);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | ClassInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'schedule' | 'instance' | null>(null);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month'>('week');

  const [filters, setFilters] = useState<ClassFilters>({
    classType: undefined,
    instructorId: undefined,
    date: format(new Date(), 'yyyy-MM-dd'),
    searchTerm: '',
  });

  const loadInstructors = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Eğitmenler getirilemedi');
      const data = await res.json();
      setInstructors(data.data.map((staff: any) => ({ id: staff.uid, name: staff.fullName, specialties: staff.specializations || [] })));
    } catch (err: any) {
      console.error('Eğitmenler yüklenemedi:', err);
      setError(err.message || 'Eğitmenler yüklenemedi.');
    }
  }, []);

  const loadClassSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/classes/schedules');
      if (!res.ok) throw new Error('Ders programları getirilemedi');
      const data = await res.json();
      setSchedules(data.data || []);
    } catch (err: any) {
      console.error('Ders programları yüklenemedi:', err);
      setError(err.message || 'Ders programları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClassInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      const today = format(new Date(), 'yyyy-MM-dd');

      if (filters.date) {
        queryParams.append('startDate', filters.date);
      } else {
        queryParams.append('startDate', today);
      }

      if (filters.classType) queryParams.append('classType', filters.classType);
      if (filters.instructorId) queryParams.append('instructorId', filters.instructorId);
      if (filters.searchTerm) queryParams.append('search', filters.searchTerm);
      if (tabIndex === 2 && user?.uid) {
        queryParams.append('instructorId', user.uid);
      }

      const res = await fetch(`/api/classes/instances?${queryParams.toString()}`);
      if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Ders örnekleri getirilemedi');
      }
      const data = await res.json();
      setInstances(data.data || []);
    } catch (err: any) {
      console.error('Ders örnekleri yüklenemedi:', err);
      setError(err.message || 'Ders örnekleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [filters, tabIndex, user?.uid]);

  useEffect(() => {
    loadInstructors();
    if (tabIndex === 0) {
      loadClassSchedules();
    } else if (tabIndex === 1 || (tabIndex === 2 && user?.role === 'trainer')) {
      loadClassInstances();
    }
  }, [tabIndex, loadClassSchedules, loadClassInstances, loadInstructors, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    if (newValue === 1) {
      setFilters({
        classType: undefined,
        instructorId: undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
        searchTerm: '',
      });
      setCalendarViewMode('week');
    } else if (newValue === 0) {
        setFilters({
            classType: undefined,
            instructorId: undefined,
            date: undefined,
            searchTerm: '',
        });
    } else if (newValue === 2) {
        setFilters(prev => ({ ...prev, instructorId: user?.uid, date: format(new Date(), 'yyyy-MM-dd') }));
        setCalendarViewMode('week');
    }
  };

  const handleCreateClassClick = () => {
    setEditingClass(null);
    setFormMode('create');
    setIsFormDialogOpen(true);
  };

  const handleEditClass = (data: ClassSchedule | ClassInstance) => {
    setEditingClass(data);
    setFormMode('edit');
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
    setEditingClass(null);
  };

  const handleSubmitForm = async (formData: ClassFormData) => {
    setLoading(true);
    try {
      let res: Response;
      if (formMode === 'create') {
        res = await fetch('/api/classes/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include',
        });
      } else {
        if (!editingClass) throw new Error('Düzenlenecek ders seçilmedi.');

        if ('recurrence' in editingClass) {
          res = await fetch(`/api/classes/schedules/${editingClass.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include',
          });
        } else {
          const instanceUpdateData = {
            name: formData.name,
            description: formData.description,
            classType: formData.classType,
            instructorId: formData.instructorId,
            maxParticipants: formData.maxParticipants,
            duration: formData.duration,
            date: formData.startDate,
            startTime: formData.startTime,
            location: formData.location,
            requirements: formData.requirements,
            price: formData.price,
            level: formData.level,
            tags: formData.tags,
          };
          res = await fetch(`/api/classes/instances/${editingClass.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(instanceUpdateData),
            credentials: 'include',
          });
        }
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ders ${formMode} işlemi başarısız oldu`);
      }

      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances();
      }
      handleCloseFormDialog();
    } catch (err: any) {
      console.error(`Ders ${formMode} işlemi hatası:`, err);
      setError(err.message || `Ders ${formMode} işlemi başarısız oldu.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (data: ClassSchedule | ClassInstance, type: 'schedule' | 'instance') => {
    setDeleteTargetId(data.id);
    setDeleteTargetType(type);
    setEditingClass(data);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;

    setLoading(true);
    try {
      const endpoint = deleteTargetType === 'schedule'
        ? `/api/classes/schedules/${deleteTargetId}`
        : `/api/classes/instances/${deleteTargetId}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `${deleteTargetType} silme başarısız oldu`);
      }

      if (tabIndex === 0) {
        loadClassSchedules();
      } else {
        loadClassInstances();
      }
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
      setEditingClass(null);
    } catch (err: any) {
      console.error(`${deleteTargetType} silme hatası:`, err);
      setError(err.message || `${deleteTargetType} silme başarısız oldu.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
    setEditingClass(null);
  };

  const handleInstanceAction = useCallback(async (instanceId: string, action: 'start' | 'end' | 'cancel') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/instances/${instanceId}/${action}`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ /* payload if any needed, e.g., for 'end' */ }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Ders ${action} işlemi başarısız oldu`);
      }
      loadClassInstances();
    } catch (err: any) {
      console.error(`Ders örneği ${action} işlemi hatası:`, err);
      setError(err.message || `Ders ${action} işlemi başarısız oldu.`);
    } finally {
      setLoading(false);
    }
  }, [loadClassInstances]);


  const handleFilterChange = (field: keyof ClassFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleCalendarDateClick = (date: Date) => {
    setFilters(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    handleCreateClassClick();
  };

  const handleCalendarViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setCalendarViewMode(mode);
  };


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Ders Yönetimi
        </Typography>
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClassClick}
          >
            Yeni Ders Planla
          </Button>
        )}
      </Box>

      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Ders Programları" />
        <Tab label="Yaklaşan Dersler" />
        {user?.role === 'trainer' && <Tab label="Benim Programım" />}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <Box>
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              {schedules.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">Ders programı bulunamadı. Başlamak için bir tane oluşturun!</Alert>
                </Grid>
              ) : (
                schedules.map((schedule) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={schedule.id}>
                    <ClassCard
                      classData={schedule}
                      type="schedule"
                      onEdit={handleEditClass}
                      onDelete={(id, type) => handleDeleteClass(schedule, type)}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {tabIndex === 1 && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Dersleri Ara"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Ders Tipi</InputLabel>
                    <Select
                      value={filters.classType || ''}
                      onChange={(e) => handleFilterChange('classType', e.target.value as ClassType)}
                      label="Ders Tipi"
                    >
                      <MenuItem value=""><em>Herhangi</em></MenuItem>
                      {CLASS_TYPE_OPTIONS.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Eğitmen</InputLabel>
                    <Select
                      value={filters.instructorId || ''}
                      onChange={(e) => handleFilterChange('instructorId', e.target.value as string)}
                      label="Eğitmen"
                    >
                      <MenuItem value=""><em>Herhangi</em></MenuItem>
                      {instructors.map((instructor) => (
                        <MenuItem key={instructor.id} value={instructor.id}>{instructor.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Tarih"
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                {instances.length === 0 ? (
                  <Grid item xs={12}>
                    <Alert severity="info">Seçilen filtrelere göre yaklaşan ders bulunamadı.</Alert>
                  </Grid>
                ) : (
                  instances
                    .sort((a, b) => {
                      const dateA = parseISO(a.date);
                      const dateB = parseISO(b.date);
                      if (dateA.getTime() !== dateB.getTime()) {
                        return dateA.getTime() - dateB.getTime();
                      }
                      const [hA, mA] = a.startTime.split(':').map(Number);
                      const [hB, mB] = b.startTime.split(':').map(Number);
                      return (hA * 60 + mA) - (hB * 60 + mB);
                    })
                    .map((instance) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={instance.id}>
                        <ClassCard
                          classData={instance}
                          type="instance"
                          onEdit={handleEditClass}
                          onDelete={(id, type) => handleDeleteClass(instance, type)}
                          onStartClass={(id) => handleInstanceAction(id, 'start')} // DÜZELTME
                          onEndClass={(id) => handleInstanceAction(id, 'end')}     // DÜZELTME
                          onCancelClass={(id) => handleInstanceAction(id, 'cancel')} // DÜZELTME
                        />
                      </Grid>
                    ))
                )}
              </Grid>
            </Box>
          )}

          {tabIndex === 2 && user?.role === 'trainer' && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Benim Planlanmış Derslerim
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ClassCalendar
                  classes={instances}
                  viewMode={calendarViewMode}
                  onViewModeChange={handleCalendarViewModeChange}
                  onClassClick={handleEditClass}
                  onDateClick={handleCalendarDateClick}
                  selectedDate={parseISO(filters.date || format(new Date(), 'yyyy-MM-dd'))}
                  onEditClass={handleEditClass}
                  onDeleteClass={(data) => handleDeleteClass(data, 'instance')} // DÜZELTME
                  onStartClass={(id) => handleInstanceAction(id, 'start')} // DÜZELTME
                  onEndClass={(id) => handleInstanceAction(id, 'end')}     // DÜZELTME
                  onCancelClass={(id) => handleInstanceAction(id, 'cancel')} // DÜZELTME
                  userRole={user.role}
                  userId={user.uid}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      <ClassFormDialog
        open={isFormDialogOpen}
        onClose={handleCloseFormDialog}
        onSubmit={handleSubmitForm}
        classSchedule={editingClass && 'recurrence' in editingClass ? editingClass : null}
        initialClassDataForInstanceEdit={
          editingClass && !('recurrence' in editingClass)
            ? {
                name: editingClass.name,
                description: editingClass.notes || editingClass.description || '',
                classType: editingClass.classType,
                instructorId: editingClass.instructorId,
                maxParticipants: editingClass.maxParticipants,
                duration: editingClass.actualDuration || editingClass.duration,
                startDate: editingClass.date,
                startTime: editingClass.startTime,
                recurrence: { type: 'none', interval: 1 },
                location: editingClass.location || '',
                requirements: [],
                price: 0,
                level: 'All Levels',
                tags: [],
              }
            : undefined
        }
        mode={formMode}
        instructors={instructors}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={`Onayı ${deleteTargetType === 'schedule' ? 'Program Silme' : 'Ders İptali'}`}
        itemName={editingClass?.name || ''}
        itemType={deleteTargetType === 'schedule' ? 'ders programı' : 'ders örneği'}
        loading={loading}
        warningMessage={deleteTargetType === 'schedule' ? "Bu işlem ders programını VE İLGİLİ TÜM ÖRNEKLERİNİ silecek." : "Bu işlem bu belirli ders örneğini iptal edecek."}
        additionalInfo={editingClass && !('recurrence' in editingClass) ? [
          { label: 'Tarih', value: format(parseISO(editingClass.date), 'PPP') },
          { label: 'Saat', value: editingClass.startTime },
          { label: 'Eğitmen', value: editingClass.instructorName }
        ] : []}
      />
    </Box>
  );
}