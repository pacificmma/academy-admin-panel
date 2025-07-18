// src/app/components/ui/ClassTypeSelector.tsx - CLEANED AND FIXED VERSION
'use client';

import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
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
}: ClassTypeSelectorProps) {
  const { user } = useAuth();
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(DEFAULT_COLORS[0]);
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [editingType, setEditingType] = useState<ClassType | null>(null);

  // Load class types
  const loadClassTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/class-types', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch class types');
      }

      const data = await response.json();
      if (data.success) {
        setClassTypes(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch class types');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassTypes();
  }, []);

  // Create new class type
  const handleCreateClassType = async () => {
    if (!newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/class-types', {
        method: 'POST',
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create class type');
      }

      const result = await response.json();
      if (result.success) {
        // Add to local state
        setClassTypes(prev => [...prev, result.data]);
        
        // Select the new type
        onChange(result.data.name);
        
        // Reset form and close dialog
        setNewTypeName('');
        setNewTypeColor(DEFAULT_COLORS[0]);
        setNewTypeDescription('');
        setIsAddDialogOpen(false);
      } else {
        throw new Error(result.error || 'Failed to create class type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update class type
  const handleUpdateClassType = async () => {
    if (!editingType || !newTypeName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class type');
      }

      const result = await response.json();
      if (result.success) {
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
      } else {
        throw new Error(result.error || 'Failed to update class type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete class type
  const handleDeleteClassType = async (classType: ClassType) => {
    if (classType.usageCount && classType.usageCount > 0) {
      setError(`Cannot delete "${classType.name}" - it is being used by ${classType.usageCount} class(es)`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/class-types/${classType.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class type');
      }

      const result = await response.json();
      if (result.success) {
        // Remove from local state
        setClassTypes(prev => prev.filter(ct => ct.id !== classType.id));
        
        // Clear selection if this was selected
        if (value === classType.name) {
          onChange('');
        }
      } else {
        throw new Error(result.error || 'Failed to delete class type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class type');
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

  return (
    <>
      <FormControl fullWidth required={required} disabled={disabled || loading}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          label={label}
          onChange={(e) => onChange(e.target.value)}
          endAdornment={
            user?.role === 'admin' ? (
              <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddDialogOpen(true);
                  }}
                  disabled={loading}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsManageDialogOpen(true);
                  }}
                  disabled={loading}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : null
          }
        >
          {loading ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading...
            </MenuItem>
          ) : availableTypes.length === 0 ? (
            <MenuItem disabled>No class types available</MenuItem>
          ) : (
            availableTypes.map((type) => (
              <MenuItem key={type.id} value={type.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {type.color && (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: type.color,
                      }}
                    />
                  )}
                  {type.name}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {/* Add Class Type Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => !isSubmitting && setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Class Type</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            autoFocus
            margin="dense"
            label="Class Type Name"
            fullWidth
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {DEFAULT_COLORS.map((color) => (
                <Box
                  key={color}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: newTypeColor === color ? '3px solid #000' : '1px solid #ccc',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                  onClick={() => setNewTypeColor(color)}
                />
              ))}
            </Box>
          </Box>
          
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            value={newTypeDescription}
            onChange={(e) => setNewTypeDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateClassType}
            variant="contained"
            disabled={isSubmitting || !newTypeName.trim()}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Class Types Dialog */}
      <Dialog open={isManageDialogOpen} onClose={() => !isSubmitting && setIsManageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Class Types</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {editingType && (
            <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Edit Class Type
              </Typography>
              
              <TextField
                margin="dense"
                label="Class Type Name"
                fullWidth
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                disabled={isSubmitting}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {DEFAULT_COLORS.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: newTypeColor === color ? '3px solid #000' : '1px solid #ccc',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                      }}
                      onClick={() => setNewTypeColor(color)}
                    />
                  ))}
                </Box>
              </Box>
              
              <TextField
                margin="dense"
                label="Description (Optional)"
                fullWidth
                multiline
                rows={2}
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                disabled={isSubmitting}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={handleUpdateClassType}
                  variant="contained"
                  disabled={isSubmitting || !newTypeName.trim()}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : 'Update'}
                </Button>
                <Button onClick={cancelEditing} disabled={isSubmitting}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Existing Class Types
          </Typography>
          
          {classTypes.length === 0 ? (
            <Typography color="text.secondary">No class types found.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {classTypes.map((type) => (
                <Box
                  key={type.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    bgcolor: editingType?.id === type.id ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {type.color && (
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: type.color,
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="subtitle1">{type.name}</Typography>
                      {type.description && (
                        <Typography variant="body2" color="text.secondary">
                          {type.description}
                        </Typography>
                      )}
                    </Box>
                    {type.usageCount !== undefined && (
                      <Chip
                        label={`${type.usageCount} classes`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsManageDialogOpen(false)} disabled={isSubmitting}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}