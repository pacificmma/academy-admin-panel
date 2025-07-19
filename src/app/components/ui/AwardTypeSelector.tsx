// src/app/components/ui/AwardTypeSelector.tsx - Award type management component
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  EmojiEvents as AwardIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';

interface AwardType {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Award {
  title: string;
  awardedDate: string;
}

interface AwardTypeSelectorProps {
  awards: Award[];
  onChange: (awards: Award[]) => void;
  error?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

const DEFAULT_AWARD_TYPES = [
  'White Belt', 'Blue Belt', 'Purple Belt', 'Brown Belt', 'Black Belt',
  'Tournament Champion', 'Monthly MVP', 'Most Improved', 'Perfect Attendance',
  'Instructor Certification', 'Competition Medal', 'Seminar Completion'
];

export default function AwardTypeSelector({
  awards,
  onChange,
  error,
  disabled = false,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
}: AwardTypeSelectorProps) {
  // State management
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AwardType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [selectedAwardType, setSelectedAwardType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Memoized active award types
  const activeAwardTypes = useMemo(() => 
    awardTypes.filter(at => at.isActive).sort((a, b) => a.title.localeCompare(b.title)), 
    [awardTypes]
  );

  // Load award types
  const loadAwardTypes = useCallback(async () => {
    try {
      setLoading(true);
      setInternalError(null);

      const response = await fetch('/api/award-types?includeUsage=true', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'max-age=300',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load award types');
      }

      setAwardTypes(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load award types';
      setInternalError(errorMessage);
      
      // Create default types if API fails
      const defaultTypes: AwardType[] = DEFAULT_AWARD_TYPES.map((title, index) => ({
        id: `default-${index}`,
        title,
        description: `Default ${title} award`,
        isActive: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setAwardTypes(defaultTypes);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load award types when component mounts
  useEffect(() => {
    loadAwardTypes();
  }, [loadAwardTypes]);

  // Dialog management
  const openAddDialog = useCallback(() => {
    setNewTypeName('');
    setNewTypeDescription('');
    setEditingType(null);
    setIsAddDialogOpen(true);
  }, []);

  const startEdit = useCallback((awardType: AwardType) => {
    setNewTypeName(awardType.title);
    setNewTypeDescription(awardType.description || '');
    setEditingType(awardType);
    setIsAddDialogOpen(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsAddDialogOpen(false);
    setEditingType(null);
    setNewTypeName('');
    setNewTypeDescription('');
  }, []);

  // Add award to member
  const handleAddAward = () => {
    if (!selectedAwardType.trim() || !selectedDate) {
      setInternalError('Please select an award type and date');
      return;
    }

    const newAward: Award = {
      title: selectedAwardType.trim(),
      awardedDate: selectedDate,
    };

    // Check for duplicates
    const isDuplicate = awards.some(
      award => award.title === newAward.title && award.awardedDate === newAward.awardedDate
    );

    if (isDuplicate) {
      setInternalError('This award with the same date already exists');
      return;
    }

    const updatedAwards = [...awards, newAward].sort((a, b) => 
      new Date(b.awardedDate).getTime() - new Date(a.awardedDate).getTime()
    );

    onChange(updatedAwards);
    setSelectedAwardType('');
    setSelectedDate('');
    setInternalError(null);
  };

  // Remove award from member
  const handleRemoveAward = (index: number) => {
    const updatedAwards = awards.filter((_, i) => i !== index);
    onChange(updatedAwards);
  };

  // Create new award type
  const handleCreateAwardType = async () => {
    if (!newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const response = await fetch('/api/award-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newTypeName.trim(),
          description: newTypeDescription.trim() || undefined,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create award type');
      }

      // Auto-select the new award type
      setSelectedAwardType(result.data.title);
      
      // Refresh the list
      await loadAwardTypes();
      cancelEditing();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create award type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update award type
  const handleUpdateAwardType = async () => {
    if (!editingType || !newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const response = await fetch(`/api/award-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newTypeName.trim(),
          description: newTypeDescription.trim() || undefined,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update award type');
      }

      // Update existing awards if name changed
      if (editingType.title !== result.data.title) {
        const updatedAwards = awards.map(award =>
          award.title === editingType.title 
            ? { ...award, title: result.data.title }
            : award
        );
        onChange(updatedAwards);
      }
      
      // Refresh the list
      await loadAwardTypes();
      cancelEditing();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update award type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete award type
  const handleDeleteAwardType = async (awardType: AwardType) => {
    if (!allowDelete) return;

    if (awardType.usageCount && awardType.usageCount > 0) {
      setInternalError(`Cannot delete "${awardType.title}" - it is being used by ${awardType.usageCount} member(s)`);
      return;
    }

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const response = await fetch(`/api/award-types/${awardType.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete award type');
      }

      // Remove awards of this type from member
      const updatedAwards = awards.filter(award => award.title !== awardType.title);
      if (updatedAwards.length !== awards.length) {
        onChange(updatedAwards);
      }
      
      // Refresh the list
      await loadAwardTypes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete award type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={16} />
        <Typography>Loading award types...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Current Awards Display */}
      <Typography variant="subtitle2" gutterBottom>
        <AwardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Awards & Achievements
      </Typography>

      {awards.length > 0 && (
        <Box mb={2}>
          {awards.map((award, index) => (
            <Chip
              key={index}
              icon={<AwardIcon />}
              label={`${award.title} (${new Date(award.awardedDate).toLocaleDateString()})`}
              onDelete={() => handleRemoveAward(index)}
              sx={{ mr: 1, mb: 1 }}
              color="warning"
            />
          ))}
        </Box>
      )}

      {/* Add New Award Section */}
      <Grid container spacing={2} alignItems="end">
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth size="small">
            <InputLabel>Award Type</InputLabel>
            <Select
              value={selectedAwardType}
              onChange={(e) => setSelectedAwardType(e.target.value)}
              disabled={disabled}
              label="Award Type"
            >
              {/* Active award types */}
              {activeAwardTypes.map((awardType) => (
                <MenuItem key={awardType.id} value={awardType.title}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography>{awardType.title}</Typography>
                      {awardType.usageCount !== undefined && awardType.usageCount > 0 && (
                        <Chip 
                          label={awardType.usageCount} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>

                    {/* Edit/Delete buttons */}
                    {(allowEdit || allowDelete) && (
                      <Box display="flex" gap={0.5}>
                        {allowEdit && (
                          <Tooltip title="Edit award type">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(awardType);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {allowDelete && (
                          <Tooltip title={
                            awardType.usageCount !== undefined && awardType.usageCount > 0 
                              ? `Cannot delete - used by ${awardType.usageCount} member(s)` 
                              : 'Delete award type'
                          }>
                            <span>
                              <IconButton
                                size="small"
                                disabled={awardType.usageCount !== undefined && awardType.usageCount > 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAwardType(awardType);
                                }}
                                sx={{
                                  opacity: awardType.usageCount !== undefined && awardType.usageCount > 0 ? 0.5 : 1,
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>
                </MenuItem>
              ))}

              {/* Add new option */}
              {allowCreate && (
                <MenuItem onClick={openAddDialog}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AddIcon fontSize="small" />
                    <Typography fontStyle="italic">Add new award type</Typography>
                  </Box>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="date"
            label="Date Awarded"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            disabled={disabled}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <Button
            onClick={handleAddAward}
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={!selectedAwardType.trim() || !selectedDate || disabled}
            size="small"
            fullWidth
          >
            Add Award
          </Button>
        </Grid>
      </Grid>

      {/* Error display */}
      {(error || internalError) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error || internalError}
        </Alert>
      )}

      {awards.length === 0 && (
        <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
          No awards added yet. Select an award type and date to add achievements.
        </Typography>
      )}

      {/* Add/Edit Award Type Dialog */}
      <Dialog open={isAddDialogOpen} onClose={cancelEditing} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {editingType ? 'Edit Award Type' : 'Add New Award Type'}
            </Typography>
            <IconButton onClick={cancelEditing} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Award Title"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="e.g., Black Belt, Tournament Winner"
            />

            <TextField
              label="Description (Optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Brief description of this award..."
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={cancelEditing} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={editingType ? handleUpdateAwardType : handleCreateAwardType}
            variant="contained"
            disabled={!newTypeName.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <AwardIcon />}
          >
            {isSubmitting ? 'Saving...' : (editingType ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}