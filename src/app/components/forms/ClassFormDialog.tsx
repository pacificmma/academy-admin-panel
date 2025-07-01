// src/app/components/forms/ClassFormDialog.tsx (Güncellendi)
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Autocomplete,
  FormHelperText,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ClassSchedule,
  ClassFormData,
  RecurrencePattern,
  ClassType,
  CLASS_TYPE_OPTIONS,
  LEVEL_OPTIONS,
  getClassTypeColor,
  getNextOccurrences,
  ClassInstance,
} from '../../types/class';

interface ClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData) => Promise<void>;
  classSchedule?: ClassSchedule | null; // Programları düzenlemek için
  initialClassDataForInstanceEdit?: ClassFormData; // Örnekleri düzenlemek için, ClassFormData uyumlu formata dönüştürülmüş
  mode: 'create' | 'edit';
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

const DEFAULT_FORM_DATA: ClassFormData = {
  name: '',
  description: '',
  classType: 'MMA',
  instructorId: '',
  maxParticipants: 20,
  duration: 60,
  startDate: new Date().toISOString().split('T')[0],
  startTime: '18:00',
  recurrence: {
    type: 'none',
    interval: 1,
    daysOfWeek: [],
  },
  // Varsayılan form verilerine isteğe bağlı alanlar eklendi
  location: '',
  requirements: [],
  price: 0,
  level: 'All Levels',
  tags: [],
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pazartesi', short: 'Pzt' },
  { value: 2, label: 'Salı', short: 'Sal' },
  { value: 3, label: 'Çarşamba', short: 'Çar' },
  { value: 4, label: 'Perşembe', short: 'Per' },
  { value: 5, label: 'Cuma', short: 'Cum' },
  { value: 6, label: 'Cumartesi', short: 'Cmt' },
  { value: 0, label: 'Pazar', short: 'Paz' },
];

export default function ClassFormDialog({
  open,
  onClose,
  onSubmit,
  classSchedule,
  initialClassDataForInstanceEdit,
  mode,
  instructors,
}: ClassFormDialogProps) {
  const [formData, setFormData] = useState<ClassFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOccurrences, setPreviewOccurrences] = useState<Array<{ date: string; time: string }>>([]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit') {
        if (classSchedule) {
          // Bir program düzenleniyor
          setFormData({
            name: classSchedule.name,
            description: classSchedule.description || '',
            classType: classSchedule.classType,
            instructorId: classSchedule.instructorId,
            maxParticipants: classSchedule.maxParticipants,
            duration: classSchedule.duration,
            startDate: classSchedule.startDate,
            startTime: classSchedule.startTime,
            recurrence: classSchedule.recurrence,
            location: classSchedule.location || '',
            requirements: classSchedule.requirements || [],
            price: classSchedule.price || 0,
            level: classSchedule.level || 'All Levels',
            tags: classSchedule.tags || [],
          });
        } else if (initialClassDataForInstanceEdit) {
          // Bir örnek düzenleniyor
          setFormData(initialClassDataForInstanceEdit);
        } else {
          setFormData(DEFAULT_FORM_DATA);
        }
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, mode, classSchedule, initialClassDataForInstanceEdit]);

  useEffect(() => {
    // Yalnızca programlar için önizleme oluştur, örnekler için değil
    if (mode === 'create' || (mode === 'edit' && classSchedule)) {
        if (formData.recurrence.type !== 'none') {
            const occurrences = getNextOccurrences(
                formData.startDate,
                formData.startTime,
                formData.recurrence,
                5
            );
            setPreviewOccurrences(occurrences);
        } else {
            setPreviewOccurrences([]);
        }
    } else {
        setPreviewOccurrences([]);
    }
  }, [formData.startDate, formData.startTime, formData.recurrence, mode, classSchedule]);

  const handleInputChange = (field: keyof ClassFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    setFormData(prev => ({
      ...prev,
      recurrence: { ...prev.recurrence, [field]: value }
    }));
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = formData.recurrence.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);

    handleRecurrenceChange('daysOfWeek', newDays);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ders adı gerekli';
    }

    if (!formData.instructorId) {
      newErrors.instructorId = 'Eğitmen gerekli';
    }

    if (formData.maxParticipants < 1 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Katılımcılar 1 ile 100 arasında olmalı';
    }

    if (formData.duration < 15 || formData.duration > 240) {
      newErrors.duration = 'Süre 15 ile 240 dakika arasında olmalı';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Başlangıç tarihi gerekli';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Başlangıç saati gerekli';
    }

    // Yalnızca program oluştururken veya düzenlerken tekrarlama doğrulaması yap
    if (mode === 'create' || (mode === 'edit' && classSchedule)) {
      if (formData.recurrence.type === 'weekly' && (!formData.recurrence.daysOfWeek || formData.recurrence.daysOfWeek.length === 0)) {
        newErrors.recurrence = 'Haftalık tekrarlama için en az bir gün seçin';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Formun varsayılan gönderimini engelle
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Ders kaydedilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstructor = instructors.find(i => i.id === formData.instructorId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '90vh' }
        }}
      >
        <form onSubmit={handleSubmit}> {/* onSubmit ile form etiketi */}
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {mode === 'create' ? 'Yeni Ders Planla' : 'Dersi Düzenle'}
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Temel Bilgiler */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Temel Bilgiler
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Ders Adı"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  placeholder="örn: Sabah BJJ Temelleri"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!errors.classType}>
                  <InputLabel>Ders Tipi</InputLabel>
                  <Select
                    value={formData.classType}
                    onChange={(e) => handleInputChange('classType', e.target.value as ClassType)}
                    label="Ders Tipi"
                  >
                    {CLASS_TYPE_OPTIONS.map((type) => (
                      <MenuItem key={type} value={type}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: getClassTypeColor(type),
                            }}
                          />
                          {type}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  multiline
                  rows={2}
                  placeholder="Ders içeriği ve hedefleri hakkında kısa açıklama..."
                />
              </Grid>

              {/* Eğitmen ve Kapasite */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.instructorId}>
                  <InputLabel>Eğitmen</InputLabel>
                  <Select
                    value={formData.instructorId}
                    onChange={(e) => handleInputChange('instructorId', e.target.value)}
                    label="Eğitmen"
                  >
                    {instructors.map((instructor) => (
                      <MenuItem key={instructor.id} value={instructor.id}>
                        <Box>
                          <Typography variant="body1">{instructor.name}</Typography>
                          {instructor.specialties && (
                            <Typography variant="caption" color="text.secondary">
                              {instructor.specialties.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.instructorId && <FormHelperText>{errors.instructorId}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maksimum Katılımcı"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 0)}
                  error={!!errors.maxParticipants}
                  helperText={errors.maxParticipants}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>

              {/* Program Bilgileri */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Program & Zamanlama
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={new Date(formData.startDate)}
                  onChange={(date) => handleInputChange('startDate', date?.toISOString().split('T')[0] || '')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate,
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TimePicker
                  label="Başlangıç Saati"
                  value={new Date(`2000-01-01T${formData.startTime}`)}
                  onChange={(time) => {
                    if (time) {
                      const hours = time.getHours().toString().padStart(2, '0');
                      const minutes = time.getMinutes().toString().padStart(2, '0');
                      handleInputChange('startTime', `${hours}:${minutes}`);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startTime,
                      helperText: errors.startTime,
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Süre (dakika)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  error={!!errors.duration}
                  helperText={errors.duration}
                  inputProps={{ min: 15, max: 240, step: 15 }}
                />
              </Grid>

              {/* Tekrarlama Ayarları - Örnek düzenlenirken gizli */}
              {(mode === 'create' || (mode === 'edit' && classSchedule)) && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Tekrarlama</InputLabel>
                      <Select
                        value={formData.recurrence.type}
                        onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                        label="Tekrarlama"
                      >
                        <MenuItem value="none">Tek seferlik Etkinlik</MenuItem>
                        <MenuItem value="daily">Günlük</MenuItem>
                        <MenuItem value="weekly">Haftalık</MenuItem>
                        <MenuItem value="monthly">Aylık</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.recurrence.type === 'weekly' && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Haftanın Günlerini Seçin:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {DAYS_OF_WEEK.map((day) => (
                          <Chip
                            key={day.value}
                            label={day.short}
                            onClick={() => handleDayOfWeekToggle(day.value)}
                            color={formData.recurrence.daysOfWeek?.includes(day.value) ? 'primary' : 'default'}
                            variant={formData.recurrence.daysOfWeek?.includes(day.value) ? 'filled' : 'outlined'}
                            size="small"
                          />
                        ))}
                      </Box>
                      {errors.recurrence && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {errors.recurrence}
                        </Typography>
                      )}
                    </Grid>
                  )}

                  {formData.recurrence.type !== 'none' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Her"
                          type="number"
                          value={formData.recurrence.interval}
                          onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                          inputProps={{ min: 1, max: 12 }}
                          helperText={`Her ${formData.recurrence.interval} ${formData.recurrence.type === 'daily' ? 'gün' : formData.recurrence.type === 'weekly' ? 'hafta' : 'ay'}`}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="Bitiş Tarihi (İsteğe Bağlı)"
                          value={formData.recurrence.endDate ? new Date(formData.recurrence.endDate) : null}
                          onChange={(date) => handleRecurrenceChange('endDate', date?.toISOString().split('T')[0] || undefined)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                            }
                          }}
                        />
                      </Grid>
                    </>
                  )}
                  {/* Yaklaşan derslerin önizlemesi */}
                  {previewOccurrences.length > 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          Sonraki 5 planlanmış ders:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {previewOccurrences.map((occurrence, index) => (
                            <Chip
                              key={index}
                              label={`${new Date(occurrence.date).toLocaleDateString()} ${occurrence.time}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Alert>
                    </Grid>
                  )}
                </>
              )}
              {/* İsteğe bağlı alanlar: Konum, Gereksinimler, Fiyat, Seviye, Etiketler */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Konum (İsteğe Bağlı)"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="örn: Ana Salon, Minder Alanı 1"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fiyat (İsteğe Bağlı)"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Seviye (İsteğe Bağlı)</InputLabel>
                  <Select
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    label="Seviye (İsteğe Bağlı)"
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <MenuItem key={level} value={level}>{level}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]} // Serbest etiketlere izin ver
                  value={formData.tags || []}
                  onChange={(_, newValue) => handleInputChange('tags', newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} {...getTagProps({ index })} key={index} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Etiketler (İsteğe Bağlı)"
                      placeholder="örn: başlangıç-dostu, sparring"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]} // Serbest gereksinimlere izin ver
                  value={formData.requirements || []}
                  onChange={(_, newValue) => handleInputChange('requirements', newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} {...getTagProps({ index })} key={index} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Gereksinimler (İsteğe Bağlı)"
                      placeholder="örn: su şişesi getir, ağızlık"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? null : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : mode === 'create' ? 'Ders Planla' : 'Dersi Güncelle'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}