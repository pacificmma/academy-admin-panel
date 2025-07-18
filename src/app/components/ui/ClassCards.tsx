// src/app/components/ui/ClassCards.tsx - FIXED: Removed React Fragment from Menu
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
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
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ClassSchedule, ClassInstance, getClassTypeColor } from '@/app/types/class';

interface ClassCardProps {
  classData: ClassSchedule | ClassInstance;
  type: 'schedule' | 'instance';
  onEdit?: (data: ClassSchedule | ClassInstance) => void;
  onDelete?: (data: ClassSchedule | ClassInstance) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onStartClass?: (instanceId: string) => void;
  onEndClass?: (instanceId: string) => void;
  onCancelClass?: (instanceId: string) => void;
}

export default function ClassCard({
  classData,
  type,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  onStartClass,
  onEndClass,
  onCancelClass,
}: ClassCardProps) {
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
    onDelete?.(classData);
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

  const getStatusColor = (status: ClassInstance['status']) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getRecurrenceText = (recurrence: ClassSchedule['recurrence']) => {
    if (recurrence.scheduleType === 'single') return 'Single class';
    
    const days = recurrence.daysOfWeek?.map(day => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return dayNames[day];
    }).join(', ');
    
    return `${recurrence.scheduleType} on ${days}`;
  };

  // Create menu items array to avoid Fragment issues
  const menuItems = [];

  // Edit option
  if (canEdit) {
    menuItems.push(
      <MenuItem key="edit" onClick={handleEdit}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit {type === 'schedule' ? 'Schedule' : 'Instance'}</ListItemText>
      </MenuItem>
    );
  }

  // Instance-specific actions
  if (isInstance && instanceData) {
    if (instanceData.status === 'scheduled' && onStartClass) {
      menuItems.push(
        <MenuItem key="start" onClick={handleStartClass}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Start Class</ListItemText>
        </MenuItem>
      );
    }

    if (instanceData.status === 'ongoing' && onEndClass) {
      menuItems.push(
        <MenuItem key="end" onClick={handleEndClass}>
          <ListItemIcon>
            <StopIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>End Class</ListItemText>
        </MenuItem>
      );
    }

    if (instanceData.status === 'scheduled' && onCancelClass) {
      menuItems.push(
        <MenuItem key="cancel" onClick={handleCancelClass}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cancel Class</ListItemText>
        </MenuItem>
      );
    }
  }

  // Delete option
  if (canDelete) {
    menuItems.push(
      <MenuItem key="delete" onClick={handleDelete} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Delete {type === 'schedule' ? 'Schedule' : 'Instance'}</ListItemText>
      </MenuItem>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {classData.name}
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
              {/* Class Type */}
              <Chip
                label={classData.classType}
                size="small"
                sx={{
                  backgroundColor: getClassTypeColor(classData.classType),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              
              {/* Status for instances */}
              {isInstance && instanceData && (
                <Chip
                  label={instanceData.status}
                  size="small"
                  color={getStatusColor(instanceData.status)}
                  variant="outlined"
                />
              )}
              
              {/* Recurring indicator for schedules */}
              {isSchedule && scheduleData && (
                <Chip
                  icon={<RepeatIcon />}
                  label={scheduleData.recurrence.scheduleType === 'single' ? 'Single' : 'Recurring'}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
            </Box>
          </Box>

          {/* Menu button */}
          {(canEdit || canDelete || onStartClass || onEndClass || onCancelClass) && (
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Details */}
        <Box display="flex" flexDirection="column" gap={1}>
          {/* Date/Time */}
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isInstance && instanceData 
                ? formatDate(instanceData.date)
                : isSchedule && scheduleData
                ? formatDate(scheduleData.startDate)
                : 'No date'
              }
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {formatTime(classData.startTime)} 
              {isInstance && instanceData && (
                ` - ${formatTime(instanceData.endTime)}`
              )}
              {` (${classData.duration} min)`}
            </Typography>
          </Box>

          {/* Instructor */}
          <Typography variant="body2" color="text.secondary">
            <strong>Instructor:</strong> {classData.instructorName}
          </Typography>

          {/* Participants */}
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isInstance && instanceData 
                ? `${instanceData.registeredParticipants.length}/${instanceData.maxParticipants} enrolled`
                : `Max ${classData.maxParticipants} participants`
              }
            </Typography>
          </Box>

          {/* Location */}
          {classData.location && (
            <Box display="flex" alignItems="center" gap={1}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {classData.location}
              </Typography>
            </Box>
          )}

          {/* Recurrence info for schedules */}
          {isSchedule && scheduleData && (
            <Typography variant="body2" color="text.secondary">
              {getRecurrenceText(scheduleData.recurrence)}
            </Typography>
          )}

          {/* Waitlist for instances */}
          {isInstance && instanceData && instanceData.waitlist.length > 0 && (
            <Typography variant="caption" color="warning.main">
              {instanceData.waitlist.length} on waitlist
            </Typography>
          )}

          {/* Notes */}
          {classData.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: 1,
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {classData.notes}
            </Typography>
          )}
        </Box>
      </CardContent>

      {/* Action Menu - Fixed: Removed Fragment, passed array directly */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {menuItems}
      </Menu>
    </Card>
  );
}