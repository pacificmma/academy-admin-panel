// src/app/components/ui/DeleteConfirmationDialog.tsx
'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: string;
  loading?: boolean;
  warningMessage?: string;
  additionalInfo?: {
    label: string;
    value: string | number;
  }[];
}

export default function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  loading = false,
  warningMessage,
  additionalInfo = [],
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'error.50',
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <WarningIcon />
          </Box>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete this {itemType}?
        </Typography>

        <Box
          sx={{
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            my: 2,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {itemType.charAt(0).toUpperCase() + itemType.slice(1)} to delete:
          </Typography>
          <Typography variant="body1" fontWeight="500">
            {itemName}
          </Typography>

          {additionalInfo.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {additionalInfo.map((info, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {info.label}:
                  </Typography>
                  <Chip 
                    label={info.value} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {warningMessage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {warningMessage}
          </Alert>
        )}

        <Alert severity="error" variant="outlined">
          <Typography variant="body2">
            <strong>This action cannot be undone.</strong> All data associated with this {itemType} will be permanently removed from the system.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="error"
          startIcon={loading ? undefined : <DeleteIcon />}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}