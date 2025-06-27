// src/app/components/ui/Alert.tsx
import React, { useEffect } from 'react';
import {
  Alert as MuiAlert,
  AlertTitle,
  IconButton,
  Collapse,
  Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  open?: boolean;
}

const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onClose,
  autoClose = false,
  duration = 5000,
  open = true,
}) => {
  useEffect(() => {
    if (autoClose && onClose && open) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose, open]);

  // Map our types to MUI severity
  const severity = type;

  return (
    <Collapse in={open}>
      <Box sx={{ mb: 2 }}>
        <MuiAlert
          severity={severity}
          action={
            onClose && (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
                sx={{
                  p: 0.5,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )
          }
          sx={{
            borderRadius: 2,
            fontWeight: 500,
            '& .MuiAlert-message': {
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            },
            '& .MuiAlert-icon': {
              alignItems: 'center',
            },
          }}
        >
          {title && (
            <AlertTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {title}
            </AlertTitle>
          )}
          {message}
        </MuiAlert>
      </Box>
    </Collapse>
  );
};

export default Alert;