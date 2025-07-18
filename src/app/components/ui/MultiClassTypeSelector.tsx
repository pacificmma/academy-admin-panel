// src/app/components/ui/MultiClassTypeSelector.tsx - Multi-select version for membership forms
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
import { useAuth } from '@/app/contexts/AuthContext';

interface ClassType {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  usageCount: number;
}

interface MultiClassTypeSelectorProps {
  value: string[]; // Selected class type names
  onChange: (classTypes: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function MultiClassTypeSelector({
  value,
  onChange,
  label = "Class Types",
  placeholder = "Type to add new class type...",
  error = false,
  helperText,
  disabled = false,
  required = false,
}: MultiClassTypeSelectorProps) {
  const { user } = useAuth();
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
      const response = await fetch('/api/class-types?includeUsage=true', {
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
    if (!name.trim()) return;

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create class type');
      }

      const data = await response.json();
      if (data.success) {
        const newClassType = data.data;
        setClassTypes(prev => [...prev, newClassType]);
        
        // Add to selection
        onChange([...value, newClassType.name]);
        
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class type');
      }

      const data = await response.json();
      if (data.success) {
        // Remove from local state
        setClassTypes(prev => prev.filter(ct => ct.id !== classType.id));

        // Remove from selection if selected
        onChange(value.filter(v => v !== classType.name));
        
        setAlertMessage('Class type deleted successfully');
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

  // Handle autocomplete change
  const handleChange = (event: any, newValue: string[]) => {
    // Check for new values (not in existing class types)
    const newClassTypes = newValue.filter(v => 
      !activeClassTypes.some(ct => ct.name === v) &&
      v.trim() !== ''
    );

    if (newClassTypes.length > 0 && user?.role === 'admin') {
      // Create new class types
      newClassTypes.forEach(name => createClassType(name));
    } else {
      // Update selection with existing values only
      const validValues = newValue.filter(v => 
        activeClassTypes.some(ct => ct.name === v)
      );
      onChange(validValues);
    }
  };

  // Custom render option with delete button for admins
  const renderOption = (props: any, option: string) => {
    const classType = activeClassTypes.find(ct => ct.name === option);
    
    return (
      <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {classType?.color && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: classType.color,
              }}
            />
          )}
          <Typography>{option}</Typography>
        </Box>
        
        {user?.role === 'admin' && classType && (
          <Tooltip title={`Delete ${option} (${classType.usageCount} uses)`}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(classType);
              }}
              disabled={classType.usageCount > 0}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  // Custom render tags
  const renderTags = (tagValue: string[], getTagProps: any) => {
    return tagValue.map((option, index) => {
      const classType = activeClassTypes.find(ct => ct.name === option);
      
      return (
        <Chip
          {...getTagProps({ index })}
          key={option}
          label={option}
          sx={{
            bgcolor: classType?.color || '#e0e0e0',
            color: '#fff',
            '& .MuiChip-deleteIcon': {
              color: '#fff',
            },
          }}
        />
      );
    });
  };

  return (
    <Box>
      {alertMessage && (
        <Alert 
          severity={alertMessage.includes('successfully') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage}
        </Alert>
      )}

      <Autocomplete
        multiple
        freeSolo={user?.role === 'admin'}
        options={options}
        value={value}
        onChange={handleChange}
        loading={loading || createLoading}
        disabled={disabled}
        renderOption={renderOption}
        renderTags={renderTags}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {loading || createLoading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </Box>
              ),
            }}
          />
        )}
        getOptionLabel={(option) => option}
        filterSelectedOptions
        clearOnEscape
        limitTags={3}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Delete Class Type
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the class type "{typeToDelete?.name}"?
          </Typography>
          {typeToDelete && typeToDelete.usageCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This class type is currently being used in {typeToDelete.usageCount} classes/memberships.
              You cannot delete it until all references are removed.
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
            disabled={!typeToDelete || typeToDelete.usageCount > 0}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}