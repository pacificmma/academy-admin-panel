// src/app/components/ui/ClassTypeSelector.tsx - FIXED VERSION
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';

interface ClassType {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  usageCount?: number;
}

interface ClassTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  includeInactive?: boolean;
  error?: boolean;
  helperText?: string;
}

const DEFAULT_COLORS = [
  '#e53e3e', '#805ad5', '#d69e2e', '#38a169', '#3182ce', 
  '#ed8936', '#4299e1', '#48bb78', '#ed64a6', '#718096'
];

export default function ClassTypeSelector({
  value,
  onChange,
  label = 'Class Type',
  required = false,
  disabled = false,
  includeInactive = false,
  error = false,
  helperText,
}: ClassTypeSelectorProps) {
  const { user } = useAuth();
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(DEFAULT_COLORS[0]);
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [editingType, setEditingType] = useState<ClassType | null>(null);

  // Load class types with better error handling
  const loadClassTypes = useCallback(async () => {
    try {
      setLoading(true);
      setInternalError(null);
      
      // Include usage count for admins to show delete restrictions
      const includeUsage = user?.role === 'admin' ? 'true' : 'false';
      
      const response = await fetch(`/api/class-types?includeUsage=${includeUsage}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch class types';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response, use the default message
          if (response.status === 401) {
            errorMessage = 'Authentication required';
          } else if (response.status === 403) {
            errorMessage = 'Access denied';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success) {
        const types = Array.isArray(data.data) ? data.data : [];
        setClassTypes(types);
        
        // If no types exist and user is admin, initialize default types
        if (types.length === 0 && user?.role === 'admin') {
          await initializeDefaultTypes();
        }
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load class types';
      setInternalError(errorMessage);
      
      // Set fallback empty array to prevent UI crashes
      setClassTypes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  // Initialize default class types if none exist
  const initializeDefaultTypes = async () => {
    const defaultTypes = [
      { name: 'MMA', color: '#e53e3e', description: 'Mixed Martial Arts' },
      { name: 'BJJ', color: '#805ad5', description: 'Brazilian Jiu-Jitsu' },
      { name: 'Boxing', color: '#d69e2e', description: 'Boxing training' },
      { name: 'Muay Thai', color: '#38a169', description: 'The Art of Eight Limbs' },
      { name: 'Fitness', color: '#48bb78', description: 'General fitness training' },
    ];

    try {
      for (const type of defaultTypes) {
        await createClassType(type.name, type.color, type.description);
      }
    } catch (error) {
      // Don't fail if default initialization doesn't work
    }
  };

  useEffect(() => {
    loadClassTypes();
  }, [loadClassTypes]);

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
      
      // Add to local state
      setClassTypes(prev => [...prev, newType]);
      
      // Select the new type
      onChange(newType.name);
      
      // Reset form and close dialog
      setNewTypeName('');
      setNewTypeColor(DEFAULT_COLORS[0]);
      setNewTypeDescription('');
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

      // Update local state
      setClassTypes(prev => prev.map(ct => 
        ct.id === editingType.id ? { ...ct, ...result.data } : ct
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

      // Reload class types to get updated usage counts
      await loadClassTypes();
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Failed to delete class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a class type
  const startEditing = (classType: ClassType) => {
    setEditingType(classType);
    setNewTypeName(classType.name);
    setNewTypeColor(classType.color || DEFAULT_COLORS[0]);
    setNewTypeDescription(classType.description || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingType(null);
    setNewTypeName('');
    setNewTypeColor(DEFAULT_COLORS[0]);
    setNewTypeDescription('');
  };

  // Filter class types
  const availableTypes = classTypes.filter(ct => includeInactive || ct.isActive);
  const isFormDisabled = disabled || loading;

  return (
    <>
      <FormControl fullWidth required={required} disabled={isFormDisabled} error={error}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          label={label}
          onChange={(e) => onChange(e.target.value)}
          endAdornment={
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {loading && <CircularProgress size={20} />}
              {user?.role === 'admin' && !loading && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadClassTypes();
                    }}
                    disabled={isFormDisabled}
                    title="Refresh class types"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddDialogOpen(true);
                    }}
                    disabled={isFormDisabled}
                    title="Add new class type"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsManageDialogOpen(true);
                    }}
                    disabled={isFormDisabled}
                    title="Manage class types"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          }
        >
          {availableTypes.length === 0 && !loading ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No class types available
              </Typography>
            </MenuItem>
          ) : (
            availableTypes.map((type) => (
              <MenuItem key={type.id} value={type.name}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 1 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: type.color || '#718096',
                      }}
                    />
                    <Typography>{type.name}</Typography>
                    {type.description && (
                      <Typography variant="caption" color="text.secondary">
                        - {type.description}
                      </Typography>
                    )}
                  </Box>
                  {user?.role === 'admin' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          startEditing(type);
                          setIsManageDialogOpen(true);
                        }}
                        disabled={isSubmitting}
                        title={`Edit ${type.name}`}
                        sx={{ 
                          opacity: 0.7,
                          '&:hover': { opacity: 1 },
                          minWidth: 24,
                          minHeight: 24,
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (window.confirm(`Are you sure you want to delete "${type.name}"?`)) {
                            handleDeleteClassType(type);
                          }
                        }}
                        disabled={isSubmitting || Boolean(type.usageCount && type.usageCount > 0)}
                        title={
                          type.usageCount && type.usageCount > 0 
                            ? `Cannot delete - used in ${type.usageCount} class(es)`
                            : `Delete ${type.name}`
                        }
                        sx={{ 
                          opacity: 0.7,
                          '&:hover': { opacity: 1 },
                          color: (type.usageCount && type.usageCount > 0) ? 'text.disabled' : 'error.main',
                          minWidth: 24,
                          minHeight: 24,
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
        {(helperText || internalError) && (
          <FormHelperText>
            {internalError || helperText}
          </FormHelperText>
        )}
      </FormControl>

      {/* Add Class Type Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Class Type</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Class Type Name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              margin="normal"
              placeholder="e.g., Karate, Wrestling"
              disabled={isSubmitting}
            />
            
            <TextField
              fullWidth
              label="Description (Optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
              placeholder="Brief description of this class type"
              disabled={isSubmitting}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {DEFAULT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewTypeColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: newTypeColor === color ? 3 : 1,
                      borderColor: newTypeColor === color ? 'primary.main' : 'divider',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {internalError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {internalError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateClassType}
            variant="contained"
            disabled={!newTypeName.trim() || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Class Types Dialog */}
      <Dialog open={isManageDialogOpen} onClose={() => setIsManageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Class Types</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {classTypes.map((type) => (
              <Box key={type.id} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: type.color || '#718096',
                    }}
                  />
                  <Box>
                    <Typography variant="body1">{type.name}</Typography>
                    {type.description && (
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    )}
                  </Box>
                  {type.usageCount !== undefined && (
                    <Chip
                      label={`${type.usageCount} uses`}
                      size="small"
                      color={type.usageCount > 0 ? 'primary' : 'default'}
                    />
                  )}
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => startEditing(type)}
                    disabled={isSubmitting}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClassType(type)}
                    disabled={isSubmitting || Boolean(type.usageCount && type.usageCount > 0)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
            
            {internalError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {internalError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsManageDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}