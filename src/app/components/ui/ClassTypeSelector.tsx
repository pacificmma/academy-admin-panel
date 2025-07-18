// src/app/components/ui/ClassTypeSelector.tsx - FIXED VERSION
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
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ColorLens as ColorIcon,
} from '@mui/icons-material';
import { ClassType } from '@/app/types/class';

interface ClassTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  showUsageCount?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

const DEFAULT_COLORS = [
  '#e53e3e', '#805ad5', '#d69e2e', '#38a169', '#3182ce', 
  '#ed8936', '#4299e1', '#48bb78', '#ed64a6', '#718096'
];

export default function ClassTypeSelector({
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  showUsageCount = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
}: ClassTypeSelectorProps) {
  // State management
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ClassType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(DEFAULT_COLORS[0]);
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // Memoized active class types to prevent unnecessary re-renders
  const activeClassTypes = useMemo(() => 
    classTypes.filter(ct => ct.isActive).sort((a, b) => a.name.localeCompare(b.name)), 
    [classTypes]
  );

  // Load class types with usage count when needed
  const loadClassTypes = useCallback(async () => {
    try {
      setLoading(true);
      setInternalError(null);

      // Build URL with includeUsage parameter when showUsageCount is true
      const url = new URL('/api/class-types', window.location.origin);
      if (showUsageCount) {
        url.searchParams.set('includeUsage', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'max-age=300', // 5 minute cache
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load class types');
      }

      setClassTypes(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load class types';
      setInternalError(errorMessage);
      setClassTypes([]);
    } finally {
      setLoading(false);
    }
  }, [showUsageCount]);

  // Load class types on mount and when showUsageCount changes
  useEffect(() => {
    loadClassTypes();
  }, [loadClassTypes]);

  // Reset form state
  const resetForm = useCallback(() => {
    setNewTypeName('');
    setNewTypeColor(DEFAULT_COLORS[0]);
    setNewTypeDescription('');
    setEditingType(null);
  }, []);

  const cancelEditing = useCallback(() => {
    resetForm();
    setIsAddDialogOpen(false);
  }, [resetForm]);

  // Create new class type
  const createClassType = async (name: string, color: string, description?: string) => {
    const response = await fetch('/api/class-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name: name.trim(),
        color,
        description: description?.trim() || undefined,
        isActive: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create class type');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create class type');
    }

    return result.data;
  };

  const handleCreateClassType = async () => {
    if (!newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const newType = await createClassType(newTypeName, newTypeColor, newTypeDescription);
      
      // Add to local state with usageCount: 0 for new types
      setClassTypes(prev => [...prev, { ...newType, usageCount: 0 }]);
      
      // Select the new type
      onChange(newType.name);
      
      // Reset form and close dialog
      resetForm();
      setIsAddDialogOpen(false);
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Failed to create class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update class type
  const handleUpdateClassType = async () => {
    if (!editingType || !newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const response = await fetch(`/api/class-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newTypeName.trim(),
          color: newTypeColor,
          description: newTypeDescription.trim() || undefined,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update class type');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update class type');
      }

      // Update local state - preserve existing usageCount
      setClassTypes(prev => prev.map(ct => 
        ct.id === editingType.id ? { ...ct, ...result.data, usageCount: ct.usageCount } : ct
      ));
      
      // Update selection if this was the selected value
      if (value === editingType.name) {
        onChange(result.data.name);
      }
      
      // Reset form
      cancelEditing();
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Failed to update class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete class type
  const handleDeleteClassType = async (classType: ClassType) => {
    if (classType.usageCount && classType.usageCount > 0) {
      setInternalError(`Cannot delete "${classType.name}" - it is being used by ${classType.usageCount} class(es)`);
      return;
    }

    try {
      setIsSubmitting(true);
      setInternalError(null);

      const response = await fetch(`/api/class-types/${classType.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete class type');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete class type');
      }

      // Remove from local state
      setClassTypes(prev => prev.filter(ct => ct.id !== classType.id));
      
      // Clear selection if this was selected
      if (value === classType.name) {
        onChange('');
      }

    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Failed to delete class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (classType: ClassType) => {
    setEditingType(classType);
    setNewTypeName(classType.name);
    setNewTypeColor(classType.color);
    setNewTypeDescription(classType.description || '');
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return (
      <FormControl fullWidth>
        <InputLabel>Class Type</InputLabel>
        <Select value="" disabled>
          <MenuItem>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography>Loading...</Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <>
      <FormControl fullWidth error={!!error}>
        <InputLabel required={required}>Class Type</InputLabel>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          label="Class Type"
        >
          {/* Empty option for non-required fields */}
          {!required && (
            <MenuItem value="">
              <em>Select a class type</em>
            </MenuItem>
          )}

          {/* Active class types */}
          {activeClassTypes.map((classType) => (
            <MenuItem key={classType.id} value={classType.name}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: classType.color,
                      border: '1px solid #ddd',
                    }}
                  />
                  <Typography>{classType.name}</Typography>
                  {/* Show usage count only if it's greater than 0 and showUsageCount is true */}
                  {showUsageCount && classType.usageCount !== undefined && classType.usageCount > 0 && (
                    <Chip 
                      label={classType.usageCount} 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                </Box>

                {/* Edit/Delete buttons */}
                {(allowEdit || allowDelete) && (
                  <Box display="flex" gap={0.5}>
                    {allowEdit && (
                      <Tooltip title="Edit class type">
                        <span>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(classType);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    
                    {allowDelete && (
                      <Tooltip title={
                        classType.usageCount !== undefined && classType.usageCount > 0 
                          ? `Cannot delete - used by ${classType.usageCount} class(es)` 
                          : 'Delete class type'
                      }>
                        <span>
                          <IconButton
                            size="small"
                            disabled={classType.usageCount !== undefined && classType.usageCount > 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClassType(classType);
                            }}
                            sx={{
                              opacity: classType.usageCount !== undefined && classType.usageCount > 0 ? 0.5 : 1,
                              cursor: classType.usageCount !== undefined && classType.usageCount > 0 ? 'not-allowed' : 'pointer'
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
            <MenuItem onClick={() => setIsAddDialogOpen(true)}>
              <Box display="flex" alignItems="center" gap={1}>
                <AddIcon fontSize="small" />
                <Typography fontStyle="italic">Add new class type</Typography>
              </Box>
            </MenuItem>
          )}
        </Select>

        {/* Error display */}
        {(error || internalError) && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error || internalError}
          </Alert>
        )}
      </FormControl>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onClose={cancelEditing} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {editingType ? 'Edit Class Type' : 'Add New Class Type'}
            </Typography>
            <IconButton onClick={cancelEditing} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="e.g., MMA, BJJ, Boxing"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {DEFAULT_COLORS.map((color) => (
                  <Tooltip key={color} title={color}>
                    <IconButton
                      size="small"
                      onClick={() => setNewTypeColor(color)}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        border: newTypeColor === color ? '3px solid #000' : '1px solid #ddd',
                        borderRadius: '4px',
                        '&:hover': {
                          backgroundColor: color,
                          opacity: 0.8,
                        },
                      }}
                    >
                      {newTypeColor === color && (
                        <ColorIcon fontSize="small" sx={{ color: '#fff' }} />
                      )}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            <TextField
              label="Description (Optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Brief description of this class type"
            />

            {/* Preview */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <Box display="flex" alignItems="center" gap={1} p={1} bgcolor="#f5f5f5" borderRadius={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: newTypeColor,
                    border: '1px solid #ddd',
                  }}
                />
                <Typography>{newTypeName || 'Class Type Name'}</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={cancelEditing} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={editingType ? handleUpdateClassType : handleCreateClassType}
            variant="contained"
            disabled={!newTypeName.trim() || isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={20} />}
          >
            {isSubmitting ? 'Saving...' : (editingType ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}