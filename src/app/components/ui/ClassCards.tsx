// src/app/components/ui/ClassCards.tsx - FIXED PROPS VERSION
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ClassSchedule, ClassInstance, getClassTypeColor } from '@/app/types/class';
import { useAuth } from '@/app/contexts/AuthContext';

interface ClassCardProps {
  classData: ClassSchedule | ClassInstance;
  type: 'schedule' | 'instance';
  onEdit?: (data: ClassSchedule | ClassInstance) => void;
  onDelete?: (id: string, type: 'schedule' | 'instance') => void;
  onStartClass?: (instanceId: string) => void;
  onEndClass?: (instanceId: string) => void;
  onCancelClass?: (instanceId: string) => void;
  instructorName?: string;
}

export default function ClassCard({
  classData,
  type,
  onEdit,
  onDelete,
  onStartClass,
  onEndClass,
  onCancelClass,
  instructorName,
}: ClassCardProps) {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit?.(classData);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(classData.id, type);
    handleMenuClose();
  };

  const handleStartClass = () => {
    if (type === 'instance') {
      onStartClass?.(classData.id);
    }
    handleMenuClose();
  };

  const handleEndClass = () => {
    if (type === 'instance') {
      onEndClass?.(classData.id);
    }
    handleMenuClose();
  };

  const handleCancelClass = () => {
    if (type === 'instance') {
      onCancelClass?.(classData.id);
    }
    handleMenuClose();
  };

  const isSchedule = type === 'schedule';
  const isInstance = type === 'instance';
  const instanceData = isInstance ? (classData as ClassInstance) : null;
  const scheduleData = isSchedule ? (classData as ClassSchedule) : null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const canEdit = user?.role === 'admin';
  const canDelete = user?.role === 'admin';
  const canManageInstance = user?.role === 'admin' && isInstance;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header with title and menu */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1, pr: 1 }}>
            {classData.name}
          </Typography>
          {(canEdit || canDelete || canManageInstance) && (
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ flexShrink: 0 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Class Type Chip */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={classData.classType}
            size="small"
            sx={{
              backgroundColor: getClassTypeColor(classData.classType),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
          {isInstance && instanceData && (
            <Chip
              label={instanceData.status}
              size="small"
              color={getStatusColor(instanceData.status) as any}
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        {/* Class Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Date and Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isSchedule ? (
                scheduleData?.recurrence.scheduleType === 'recurring' ? (
                  `Recurring: ${scheduleData.recurrence.daysOfWeek?.map(day => 
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                  ).join(', ')}`
                ) : (
                  format(new Date(scheduleData?.startDate || ''), 'MMM dd, yyyy')
                )
              ) : (
                format(new Date(instanceData?.date || ''), 'MMM dd, yyyy')
              )}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isSchedule ? scheduleData?.startTime : instanceData?.startTime}
              {isInstance && instanceData?.endTime && ` - ${instanceData.endTime}`}
              {` (${classData.duration} min)`}
            </Typography>
          </Box>

          {/* Instructor */}
          <Typography variant="body2" color="text.secondary">
            <strong>Instructor:</strong> {instructorName || classData.instructorName}
          </Typography>

          {/* Participants */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isInstance ? (
                `${instanceData?.registeredParticipants?.length || 0}/${classData.maxParticipants}`
              ) : (
                `Max: ${classData.maxParticipants}`
              )}
            </Typography>
          </Box>

          {/* Location */}
          {classData.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {classData.location}
              </Typography>
            </Box>
          )}

          {/* Waitlist for instances */}
          {isInstance && instanceData?.waitlist && instanceData.waitlist.length > 0 && (
            <Typography variant="caption" color="warning.main">
              Waitlist: {instanceData.waitlist.length}
            </Typography>
          )}
        </Box>
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {canEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {canManageInstance && instanceData?.status === 'scheduled' && (
          <MenuItem onClick={handleStartClass}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Class</ListItemText>
          </MenuItem>
        )}

        {canManageInstance && instanceData?.status === 'ongoing' && (
          <MenuItem onClick={handleEndClass}>
            <ListItemIcon>
              <StopIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>End Class</ListItemText>
          </MenuItem>
        )}

        {canManageInstance && instanceData?.status === 'scheduled' && (
          <MenuItem onClick={handleCancelClass}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel Class</ListItemText>
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}