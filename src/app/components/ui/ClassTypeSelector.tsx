// src/app/components/ui/ClassTypeSelector.tsx - Updated with Multiple Selection Support
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
  FormHelperText,
  OutlinedInput,
  SelectChangeEvent,
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
  // Single selection props
  value?: string;
  onChange?: (value: string) => void;
  
  // Multiple selection props
  selectedValues?: string[];
  onMultipleChange?: (values: string[]) => void;
  multiple?: boolean;
  
  // Common props
  error?: string;
  required?: boolean;
  disabled?: boolean;
  showUsageCount?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  label?: string;
  helperText?: string;
}

const DEFAULT_COLORS = [
  '#e53e3e', '#805ad5', '#d69e2e', '#38a169', '#3182ce', 
  '#ed8936', '#4299e1', '#48bb78', '#ed64a6', '#718096'
];

export default function ClassTypeSelector({
  // Single selection
  value = '',
  onChange,
  
  // Multiple selection
  selectedValues = [],
  onMultipleChange,
  multiple = false,
  
  // Common props
  error,
  required = false,
  disabled = false,
  showUsageCount = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  label = 'Class Type',
  helperText,
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setInternalError(errorMessage);
      
      // Set fallback class types if API fails
      setClassTypes([
        { id: '1', name: 'MMA', color: '#e53e3e', description: 'Mixed Martial Arts', isActive: true, createdAt: '', updatedAt: '', createdBy: '' },
        { id: '2', name: 'BJJ', color: '#805ad5', description: 'Brazilian Jiu-Jitsu', isActive: true, createdAt: '', updatedAt: '', createdBy: '' },
        { id: '3', name: 'Boxing', color: '#d69e2e', description: 'Boxing training', isActive: true, createdAt: '', updatedAt: '', createdBy: '' },
        { id: '4', name: 'Muay Thai', color: '#38a169', description: 'The Art of Eight Limbs', isActive: true, createdAt: '', updatedAt: '', createdBy: '' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [showUsageCount]);

  // Load class types on component mount
  useEffect(() => {
    loadClassTypes();
  }, [loadClassTypes]);

  // Handle selection change (both single and multiple)
  const handleSelectionChange = (event: SelectChangeEvent<string | string[]>) => {
    const eventValue = event.target.value;
    
    if (multiple && onMultipleChange) {
      const newSelection = typeof eventValue === 'string' ? eventValue.split(',') : eventValue;
      onMultipleChange(newSelection);
    } else if (!multiple && onChange) {
      onChange(eventValue as string);
    }
  };

  // Dialog management functions
  const openAddDialog = useCallback(() => {
    setNewTypeName('');
    setNewTypeColor(DEFAULT_COLORS[0]);
    setNewTypeDescription('');
    setEditingType(null);
    setIsAddDialogOpen(true);
  }, []);

  const startEdit = useCallback((classType: ClassType) => {
    setNewTypeName(classType.name);
    setNewTypeColor(classType.color);
    setNewTypeDescription(classType.description || '');
    setEditingType(classType);
    setIsAddDialogOpen(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsAddDialogOpen(false);
    setEditingType(null);
    setNewTypeName('');
    setNewTypeColor(DEFAULT_COLORS[0]);
    setNewTypeDescription('');
  }, []);

  // API operations
  const handleCreateClassType = useCallback(async () => {
    if (!newTypeName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/class-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newTypeName.trim(),
          color: newTypeColor,
          description: newTypeDescription.trim(),
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create class type');
      }

      // Auto-select the new class type if applicable
      const newClassType = result.data;
      if (multiple && onMultipleChange) {
        onMultipleChange([...selectedValues, newClassType.name]);
      } else if (!multiple && onChange) {
        onChange(newClassType.name);
      }
      
      // Refresh the list
      await loadClassTypes();
      cancelEditing();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create class type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [newTypeName, newTypeColor, newTypeDescription, multiple, selectedValues, onMultipleChange, onChange, loadClassTypes, cancelEditing]);

  const handleUpdateClassType = useCallback(async () => {
    if (!editingType || !newTypeName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/class-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newTypeName.trim(),
          color: newTypeColor,
          description: newTypeDescription.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update class type');
      }

      // Update selection if the name changed
      const updatedClassType = result.data;
      if (editingType.name !== updatedClassType.name) {
        if (multiple && onMultipleChange) {
          const updatedSelection = selectedValues.map(name => 
            name === editingType.name ? updatedClassType.name : name
          );
          onMultipleChange(updatedSelection);
        } else if (!multiple && onChange && value === editingType.name) {
          onChange(updatedClassType.name);
        }
      }
      
      // Refresh the list
      await loadClassTypes();
      cancelEditing();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update class type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingType, newTypeName, newTypeColor, newTypeDescription, multiple, selectedValues, onMultipleChange, onChange, value, loadClassTypes, cancelEditing]);

  const handleDeleteClassType = useCallback(async (classType: ClassType) => {
    if (!allowDelete) return;

    // Additional safety check for classes with usage
    if (showUsageCount && classType.usageCount && classType.usageCount > 0) {
      setInternalError(`Cannot delete "${classType.name}" - it is being used in ${classType.usageCount} classes`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/class-types/${classType.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete class type');
      }

      // Remove from selection if selected
      if (multiple && onMultipleChange) {
        const updatedSelection = selectedValues.filter(name => name !== classType.name);
        onMultipleChange(updatedSelection);
      } else if (!multiple && onChange && value === classType.name) {
        onChange('');
      }
      
      // Refresh the list
      await loadClassTypes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete class type';
      setInternalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [allowDelete, showUsageCount, multiple, selectedValues, onMultipleChange, onChange, value, loadClassTypes]);

  // Determine current selection for display
  const currentSelection = multiple ? selectedValues : [value].filter(Boolean);

  // Render value for multi-select
  const renderValue = (selected: string | string[]) => {
    if (!multiple) {
      return selected as string;
    }
    
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {selectedArray.map((selectedValue) => {
          const classType = activeClassTypes.find(ct => ct.name === selectedValue);
          return (
            <Chip
              key={selectedValue}
              label={selectedValue}
              size="small"
              sx={{
                backgroundColor: classType?.color || '#e0e0e0',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <>
      {/* Error Alert */}
      {internalError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInternalError(null)}>
          {internalError}
        </Alert>
      )}

      {/* Main Form Control */}
      <FormControl fullWidth error={!!error} disabled={disabled || loading}>
        <InputLabel required={required}>{label}</InputLabel>
        <Select
          multiple={multiple}
          value={multiple ? selectedValues : value}
          onChange={handleSelectionChange}
          input={multiple ? <OutlinedInput label={label} /> : undefined}
          renderValue={multiple ? renderValue : undefined}
          label={label}
        >
          {/* Loading state */}
          {loading && (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading class types...
            </MenuItem>
          )}

          {/* Empty option for non-required single selection */}
          {!multiple && !required && !loading && (
            <MenuItem value="">
              <em>Select a class type</em>
            </MenuItem>
          )}

          {/* Add new option */}
          {allowCreate && !loading && (
            <MenuItem onClick={openAddDialog}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              Add New Class Type
            </MenuItem>
          )}

          {/* Active class types */}
          {!loading && activeClassTypes.map((classType) => (
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
                    
                    {allowDelete && (
                      <Tooltip title={
                        classType.usageCount !== undefined && classType.usageCount > 0 
                          ? `Cannot delete - used in ${classType.usageCount} classes`
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
                              color: classType.usageCount !== undefined && classType.usageCount > 0 
                                ? 'text.disabled' 
                                : 'error.main'
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

          {/* No class types available */}
          {!loading && activeClassTypes.length === 0 && (
            <MenuItem disabled>
              No class types available
            </MenuItem>
          )}
        </Select>
        
        {/* Helper text */}
        {error && <FormHelperText>{error}</FormHelperText>}
        {!error && helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onClose={cancelEditing} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {editingType ? 'Edit Class Type' : 'Add New Class Type'}
            </Typography>
            <IconButton onClick={cancelEditing} disabled={isSubmitting}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <TextField
              label="Class Type Name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., Advanced MMA"
              disabled={isSubmitting}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {DEFAULT_COLORS.map((color) => (
                  <Tooltip key={color} title={color}>
                    <IconButton
                      onClick={() => setNewTypeColor(color)}
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
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