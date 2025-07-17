// src/app/components/ui/DynamicClassTypeSelector.tsx - Dynamic Class Type Selector with Add/Remove
'use client';

import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface ClassType {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  usageCount: number;
}

interface DynamicClassTypeSelectorProps {
  value: string[]; // Selected class type names
  onChange: (classTypes: string[]) => void;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function DynamicClassTypeSelector({
  value,
  onChange,
  multiple = true,
  label = "Class Types",
  placeholder = "Type to add new class type...",
  error = false,
  helperText,
  disabled = false,
  required = false,
}: DynamicClassTypeSelectorProps) {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ClassType | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Fetch class types from API
  const fetchClassTypes = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error fetching class types:', error);
      setAlertMessage('Failed to load class types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassTypes();
  }, []);

  // Create new class type
  const createClassType = async (name: string) => {
    try {
      setCreateLoading(true);
      const response = await fetch('/api/class-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create class type');
      }

      const data = await response.json();
      if (data.success) {
        const newClassType = data.data;
        setClassTypes(prev => [...prev, newClassType]);
        
        // Add to selection
        if (multiple) {
          onChange([...value, newClassType.name]);
        } else {
          onChange([newClassType.name]);
        }
        
        setAlertMessage(`Class type "${newClassType.name}" created successfully`);
      } else {
        throw new Error(data.error || 'Failed to create class type');
      }
    } catch (error) {
      console.error('Error creating class type:', error);
      setAlertMessage(error instanceof Error ? error.message : 'Failed to create class type');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete class type
  const deleteClassType = async (classType: ClassType) => {
    try {
      const response = await fetch(`/api/class-types/${classType.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete class type');
      }

      const data = await response.json();
      if (data.success) {
        if (data.data.softDeleted) {
          // Mark as inactive in local state
          setClassTypes(prev => 
            prev.map(ct => 
              ct.id === classType.id 
                ? { ...ct, isActive: false }
                : ct
            )
          );
        } else {
          // Remove from local state
          setClassTypes(prev => prev.filter(ct => ct.id !== classType.id));
        }

        // Remove from selection if selected
        onChange(value.filter(v => v !== classType.name));
        
        setAlertMessage(data.message);
      } else {
        throw new Error(data.error || 'Failed to delete class type');
      }
    } catch (error) {
      console.error('Error deleting class type:', error);
      setAlertMessage(error instanceof Error ? error.message : 'Failed to delete class type');
    }
  };

  const handleDeleteClick = (classType: ClassType) => {
    setTypeToDelete(classType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (typeToDelete) {
      deleteClassType(typeToDelete);
    }
    setDeleteDialogOpen(false);
    setTypeToDelete(null);
  };

  const activeClassTypes = classTypes.filter(ct => ct.isActive);
  const options = activeClassTypes.map(ct => ct.name);

  return (
    <Box>
      <Autocomplete
        multiple={multiple}
        freeSolo
        options={options}
        value={multiple ? value : (value.length > 0 ? value[0] : '')}
        onChange={(event, newValue) => {
          if (multiple) {
            const values = Array.isArray(newValue) ? newValue : [];
            
            // Check for new values (not in existing class types)
            const newClassTypes = values.filter(v => 
              typeof v === 'string' && 
              !activeClassTypes.some(ct => ct.name === v) &&
              v.trim() !== ''
            );

            if (newClassTypes.length > 0) {
              // Create new class types
              newClassTypes.forEach(name => createClassType(name));
            } else {
              onChange(values.filter(v => typeof v === 'string'));
            }
          } else {
            const singleValue = Array.isArray(newValue) ? newValue[0] : newValue;
            if (typeof singleValue === 'string') {
              if (!activeClassTypes.some(ct => ct.name === singleValue) && singleValue.trim() !== '') {
                createClassType(singleValue);
              } else {
                onChange([singleValue]);
              }
            } else {
              onChange([]);
            }
          }
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const classType = activeClassTypes.find(ct => ct.name === option);
            const { key, ...chipProps } = getTagProps({ index });
            
            return (
              <Chip
                key={key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: classType?.color || '#718096',
                      }}
                    />
                    {option}
                    <Tooltip title="Delete class type">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (classType) {
                            handleDeleteClick(classType);
                          }
                        }}
                        sx={{ ml: 0.5, p: 0.25 }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                {...chipProps}
                deleteIcon={undefined} // Remove default delete icon
                onDelete={undefined} // Handle delete with custom button
                sx={{
                  bgcolor: classType?.color || 'primary.main',
                  color: 'white',
                  '& .MuiChip-label': {
                    color: 'white',
                  },
                }}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            disabled={disabled || loading}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {createLoading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                  {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                  {params.InputProps.endAdornment}
                </Box>
              ),
            }}
          />
        )}
        loading={loading}
        disabled={disabled}
        renderOption={(props, option) => {
          const classType = activeClassTypes.find(ct => ct.name === option);
          return (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: classType?.color || '#718096',
                  }}
                />
                <Typography sx={{ flexGrow: 1 }}>{option}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {classType?.usageCount && classType.usageCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {classType.usageCount} uses
                    </Typography>
                  )}
                  <Tooltip title="Delete class type">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (classType) {
                          handleDeleteClick(classType);
                        }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          );
        }}
      />

      {/* Alert Message */}
      {alertMessage && (
        <Alert 
          severity="info" 
          onClose={() => setAlertMessage(null)}
          sx={{ mt: 1 }}
        >
          {alertMessage}
        </Alert>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Delete Class Type
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the class type "{typeToDelete?.name}"?
          </Typography>
          {typeToDelete?.usageCount && typeToDelete.usageCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This class type is used in {typeToDelete.usageCount} classes/memberships. 
              It will be marked as inactive instead of being deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}