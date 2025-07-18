// src/app/classes/ClassesPageClient.tsx - CLEANED AND FIXED VERSION
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
Box,
Typography,
CircularProgress,
Alert,
Tabs,
Tab,
Button,
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
import { ClassSchedule, ClassInstance, ClassFormData, ClassFilters } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { SessionData } from '../types';
import Layout from '../components/layout/Layout';

interface ClassesPageClientProps {
session: SessionData;
}

export default function ClassesPageClient({ session }: ClassesPageClientProps): React.JSX.Element {
const { user } = useAuth();
const [tabIndex, setTabIndex] = useState(0);
const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
const [allInstances, setAllInstances] = useState<ClassInstance[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
const [editingClassData, setEditingClassData] = useState<ClassSchedule | ClassInstance | null>(null);
const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteTargetType, setDeleteTargetType] = useState<'schedule' | 'instance' | null>(null);
const [instructors, setInstructors] = useState<Array<{ id: string; name: string; specialties?: string[] }>>([]);
const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day' | 'month'>('week');
const [instanceDisplayMode, setInstanceDisplayMode] = useState<'cards' | 'calendar'>('cards');
const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

// Filter states
const [filters, setFilters] = useState<ClassFilters>({
  searchTerm: '',
  classType: '',
  instructorId: '',
  status: 'all',
  dateRange: 'all',
});

// Load instructors
const loadInstructors = useCallback(async () => {
  try {
    const response = await fetch('/api/users?role=trainer', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instructors');
    }

    const data = await response.json();
    if (data.success) {
      setInstructors(data.data || []);
    }
  } catch (err) {
    console.error('Error loading instructors:', err);
  }
}, []);

// Load class schedules
const loadSchedules = useCallback(async () => {
  try {
    const response = await fetch('/api/classes/schedules', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch class schedules');
    }

    const data = await response.json();
    if (data.success) {
      setSchedules(data.data || []);
    } else {
      throw new Error(data.error || 'Failed to fetch class schedules');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load class schedules');
  }
}, []);

// Load class instances
const loadInstances = useCallback(async () => {
  try {
    const response = await fetch('/api/classes/instances', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch class instances');
    }

    const data = await response.json();
    if (data.success) {
      setAllInstances(data.data || []);
    } else {
      throw new Error(data.error || 'Failed to fetch class instances');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load class instances');
  }
}, []);

// Load all data
const loadData = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    await Promise.all([
      loadInstructors(),
      loadSchedules(),
      loadInstances(),
    ]);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load data');
  } finally {
    setLoading(false);
  }
}, [loadInstructors, loadSchedules, loadInstances]);

// Initial load
useEffect(() => {
  loadData();
}, [loadData]);

// Filter schedules based on filters
const filteredSchedules = useMemo(() => {
  return schedules.filter(schedule => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!schedule.name.toLowerCase().includes(searchLower) &&
          !schedule.classType.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Class type filter
    if (filters.classType && schedule.classType !== filters.classType) {
      return false;
    }

    // Instructor filter
    if (filters.instructorId && schedule.instructorId !== filters.instructorId) {
      return false;
    }

    // Status filter
    if (filters.status === 'active' && !schedule.isActive) {
      return false;
    }
    if (filters.status === 'inactive' && schedule.isActive) {
      return false;
    }

    return true;
  });
}, [schedules, filters]);

// Filter instances based on filters
const filteredInstances = useMemo(() => {
  let filtered = allInstances.filter(instance => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!instance.name.toLowerCase().includes(searchLower) &&
          !instance.classType.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Class type filter
    if (filters.classType && instance.classType !== filters.classType) {
      return false;
    }

    // Instructor filter
    if (filters.instructorId && instance.instructorId !== filters.instructorId) {
      return false;
    }

    // Status filter
    if (filters.status === 'active' && instance.status !== 'scheduled') {
      return false;
    }
    if (filters.status === 'inactive' && instance.status === 'scheduled') {
      return false;
    }

    return true;
  });

  // Date range filter
  if (filters.dateRange !== 'all') {
    const now = new Date();
    filtered = filtered.filter(instance => {
      const instanceDate = parseISO(instance.date);
      
      switch (filters.dateRange) {
        case 'today':
          return isSameDay(instanceDate, now);
        case 'week':
          return isWithinInterval(instanceDate, {
            start: startOfWeek(now),
            end: endOfWeek(now),
          });
        case 'month':
          return isWithinInterval(instanceDate, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        default:
          return true;
      }
    });
  }

  return filtered.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    return dateA.getTime() - dateB.getTime();
  });
}, [allInstances, filters]);

// Get unique class types from schedules and instances
const availableClassTypes = useMemo(() => {
  const types = new Set<string>();
  schedules.forEach(s => types.add(s.classType));
  allInstances.forEach(i => types.add(i.classType));
  return Array.from(types).sort();
}, [schedules, allInstances]);

// Handle form submission
const handleFormSubmit = async (data: ClassFormData, scheduleId?: string) => {
  try {
    const url = scheduleId 
      ? `/api/classes/schedules/${scheduleId}`
      : '/api/classes/schedules';
    
    const method = scheduleId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save class');
    }

    const result = await response.json();
    if (result.success) {
      await loadData(); // Reload all data
      setIsFormDialogOpen(false);
      setEditingClassData(null);
    } else {
      throw new Error(result.error || 'Failed to save class');
    }
  } catch (err) {
    throw err; // Re-throw to be handled by the form
  }
};

// Handle delete confirmation
const handleDeleteConfirm = async () => {
  if (!deleteTargetId || !deleteTargetType) return;

  try {
    const url = deleteTargetType === 'schedule' 
      ? `/api/classes/schedules/${deleteTargetId}`
      : `/api/classes/instances/${deleteTargetId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete class');
    }

    const result = await response.json();
    if (result.success) {
      await loadData(); // Reload all data
    } else {
      throw new Error(result.error || 'Failed to delete class');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete class');
  } finally {
    setIsDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
  }
};

// Handle edit class
const handleEditClass = (classData: ClassSchedule | ClassInstance) => {
  setEditingClassData(classData);
  setFormMode('edit');
  setIsFormDialogOpen(true);
};

// Handle delete class
const handleDeleteClass = (id: string, type: 'schedule' | 'instance') => {
  setDeleteTargetId(id);
  setDeleteTargetType(type);
  setIsDeleteDialogOpen(true);
};

if (loading) {
  return (
    <Layout session={session}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    </Layout>
  );
}

return (
  <Layout session={session}>
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Class Management
        </Typography>
        {user?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormMode('create');
              setEditingClassData(null);
              setIsFormDialogOpen(true);
            }}
          >
            Create Class
          </Button>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            placeholder="Search classes..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>Class Type</InputLabel>
            <Select
              value={filters.classType}
              label="Class Type"
              onChange={(e) => setFilters(prev => ({ ...prev, classType: e.target.value }))}
            >
              <MenuItem value="">All Types</MenuItem>
              {availableClassTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>Instructor</InputLabel>
            <Select
              value={filters.instructorId}
              label="Instructor"
              onChange={(e) => setFilters(prev => ({ ...prev, instructorId: e.target.value }))}
            >
              <MenuItem value="">All Instructors</MenuItem>
              {instructors.map((instructor) => (
                <MenuItem key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as 'all' | 'active' | 'inactive' }))}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.dateRange}
              label="Date Range"
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as 'all' | 'today' | 'week' | 'month' }))}
            >
              <MenuItem value="all">All Dates</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)}>
          <Tab label={`Class Schedules (${filteredSchedules.length})`} />
          <Tab label={`Class Instances (${filteredInstances.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabIndex === 0 && (
        <Box>
          {filteredSchedules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No class schedules found
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {schedules.length === 0 
                  ? "Get started by creating your first class schedule"
                  : "Try adjusting your filters to see more results"
                }
              </Typography>
              {user?.role === 'admin' && schedules.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFormMode('create');
                    setEditingClassData(null);
                    setIsFormDialogOpen(true);
                  }}
                >
                  Create First Class
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredSchedules.map((schedule) => (
                <Grid item xs={12} md={6} lg={4} key={schedule.id}>
                  <ClassCard
                    classData={schedule}
                    type="schedule"
                    onEdit={user?.role === 'admin' ? (data) => handleEditClass(data) : undefined}
                    onDelete={user?.role === 'admin' ? (id, type) => handleDeleteClass(id, type) : undefined}
                    instructorName={instructors.find(i => i.id === schedule.instructorId)?.name || 'Unknown'}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {tabIndex === 1 && (
        <Box>
          {/* Instance Display Mode Toggle */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Button
                variant={instanceDisplayMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setInstanceDisplayMode('cards')}
                sx={{ mr: 1 }}
              >
                Cards View
              </Button>
              <Button
                variant={instanceDisplayMode === 'calendar' ? 'contained' : 'outlined'}
                onClick={() => setInstanceDisplayMode('calendar')}
              >
                Calendar View
              </Button>
            </Box>
            
            {instanceDisplayMode === 'calendar' && (
              <FormControl size="small">
                <InputLabel>View</InputLabel>
                <Select
                  value={calendarViewMode}
                  label="View"
                  onChange={(e) => setCalendarViewMode(e.target.value as 'week' | 'day' | 'month')}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          {instanceDisplayMode === 'cards' ? (
            filteredInstances.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No class instances found
                </Typography>
                <Typography color="text.secondary">
                  {allInstances.length === 0 
                    ? "Class instances will appear here once you create recurring schedules"
                    : "Try adjusting your filters to see more results"
                  }
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filteredInstances.map((instance) => (
                  <Grid item xs={12} md={6} lg={4} key={instance.id}>
                    <ClassCard
                      classData={instance}
                      type="instance"
                      onEdit={user?.role === 'admin' ? () => handleEditClass(instance) : undefined}
                      onDelete={user?.role === 'admin' ? () => handleDeleteClass(instance.id, 'instance') : undefined}
                      instructorName={instructors.find(i => i.id === instance.instructorId)?.name || 'Unknown'}
                    />
                  </Grid>
                ))}
              </Grid>
            )
          ) : (
            <ClassCalendar
              instances={filteredInstances}
              viewMode={calendarViewMode}
              onViewModeChange={setCalendarViewMode}
              onClassClick={(instance: ClassInstance) => handleEditClass(instance)}
              onDateClick={setCurrentCalendarDate}
              selectedDate={currentCalendarDate}
              userRole={user?.role || 'member'}
              onEditClass={handleEditClass}
              onDeleteClass={(instance:any, type: any) => handleDeleteClass(instance.id, type)}
              userId={user?.uid || ''}
            />
          )}
        </Box>
      )}

      {/* Form Dialog */}
      <ClassFormDialog
        open={isFormDialogOpen}
        onClose={() => {
          setIsFormDialogOpen(false);
          setEditingClassData(null);
        }}
        onSubmit={handleFormSubmit}
        classDataForEdit={editingClassData}
        mode={formMode}
        instructors={instructors}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTargetId(null);
          setDeleteTargetType(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteTargetType === 'schedule' ? 'Class Schedule' : 'Class Instance'}`}
        itemName={deleteTargetType === 'schedule' 
          ? schedules.find(s => s.id === deleteTargetId)?.name || 'Unknown'
          : allInstances.find(i => i.id === deleteTargetId)?.name || 'Unknown'
        }
        itemType={deleteTargetType === 'schedule' ? 'class schedule' : 'class instance'}
      />
    </Box>
  </Layout>
);
}