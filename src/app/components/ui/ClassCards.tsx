// src/app/components/ui/ClassCard.tsx - Individual Class Display Card
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Tooltip,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Repeat as RepeatIcon,
  PlayArrow as StartIcon,
  Stop as EndIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { ClassInstance, ClassSchedule, getClassTypeColor, formatClassTime } from '../../types/class';

interface ClassCardProps {
  classData: ClassInstance | ClassSchedule;
  type: 'instance' | 'schedule';
  onEdit?: () => void;
  onDelete?: () => void;
  onViewParticipants?: () => void;
  onStartClass?: () => void;
  onEndClass?: () => void;
  onCancelClass?: () => void;
  showActions?: boolean;
  userRole: 'admin' | 'trainer' | 'staff';
}

export default function ClassCard({
  classData,
  type,
  onEdit,
  onDelete,
  onViewParticipants,
  onStartClass,
  onEndClass,
  onCancelClass,
  showActions = true,
  userRole,
}: ClassCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    handleMenuClose();
  };

  // Determine if this is a class instance or schedule
  const isInstance = type === 'instance';
  const instance = isInstance ? (classData as ClassInstance) : null;
  const schedule = !isInstance ? (classData as ClassSchedule) : null;

  // Get common properties
  const name = classData.name;
  const classType = classData.classType;
  const instructorName = classData.instructorName;
  const maxParticipants = classData.maxParticipants;
  const location = 'location' in classData ? classData.location : undefined;

  // Instance-specific properties
  const date = instance?.date;
  const startTime = instance?.startTime || schedule?.startTime;
  const endTime = instance?.endTime;
  const registeredParticipants = instance?.registeredParticipants || [];
  const waitlist = instance?.waitlist || [];
  const status = instance?.status || 'scheduled';

  // Schedule-specific properties
  const recurrence = schedule?.recurrence;
  const duration = instance?.actualDuration || schedule?.duration;

  const classTypeColor = getClassTypeColor(classType);
  const participantsCount = registeredParticipants.length;
  const waitlistCount = waitlist.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'ongoing': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'ongoing': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const canManageClass = userRole === 'admin' || (userRole === 'trainer' && classData.instructorId);

  return (
    <Card
      sx={{
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Status indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: -4,
          left: 16,
          right: 16,
          height: 4,
          bgcolor: classTypeColor,
          borderRadius: '2px 2px 0 0',
        }}
      />

      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
              {name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={classType}
                size="small"
                sx={{
                  bgcolor: `${classTypeColor}15`,
                  color: classTypeColor,
                  fontWeight: 600,
                  border: `1px solid ${classTypeColor}30`,
                }}
              />
              {instance && (
                <Chip
                  label={getStatusText(status)}
                  size="small"
                  color={getStatusColor(status) as any}
                  variant="outlined"
                />
              )}
              {schedule && recurrence?.type !== 'none' && (
                <Tooltip title={`Repeats ${recurrence?.type}`}>
                  <Chip
                    icon={<RepeatIcon />}
                    label="Recurring"
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                </Tooltip>
              )}
            </Box>
          </Box>

          {showActions && canManageClass && (
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Main Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Instructor */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: 12 }}>
              {instructorName.charAt(0)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {instructorName}
            </Typography>
          </Box>

          {/* Date and Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {instance && date ? (
                `${new Date(date).toLocaleDateString()} • ${formatClassTime(startTime!, duration!)}`
              ) : schedule ? (
                `${formatClassTime(startTime!, duration!)} • ${recurrence?.type !== 'none' ? 
                  `${recurrence?.type}${recurrence?.daysOfWeek?.length ? 
                    ` (${recurrence.daysOfWeek.map(d => 
                      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
                    ).join(', ')})` : ''}` : 'One-time'}`
              ) : (
                'Time TBD'
              )}
            </Typography>
          </Box>

          {/* Location */}
          {location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {location}
              </Typography>
            </Box>
          )}

          {/* Participants */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge
              badgeContent={waitlistCount > 0 ? waitlistCount : 0}
              color="warning"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              invisible={waitlistCount === 0}
            >
              <PeopleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Badge>
            <Typography variant="body2" color="text.secondary">
              {participantsCount}/{maxParticipants} participants
              {waitlistCount > 0 && (
                <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                  (+{waitlistCount} waiting)
                </Typography>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons for Instances */}
        {instance && showActions && canManageClass && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {status === 'scheduled' && onStartClass && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<StartIcon />}
                onClick={onStartClass}
                color="success"
              >
                Start Class
              </Button>
            )}
            {status === 'ongoing' && onEndClass && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EndIcon />}
                onClick={onEndClass}
                color="primary"
              >
                End Class
              </Button>
            )}
            {status === 'scheduled' && onCancelClass && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancelClass}
                color="error"
              >
                Cancel
              </Button>
            )}
            {onViewParticipants && (
              <Button
                size="small"
                variant="text"
                startIcon={<PersonIcon />}
                onClick={onViewParticipants}
              >
                View List
              </Button>
            )}
          </Box>
        )}

        {/* Progress bar for capacity */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Capacity
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {participantsCount}/{maxParticipants}
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 4,
              bgcolor: 'grey.200',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                bgcolor: participantsCount >= maxParticipants ? 'error.main' : 
                         participantsCount >= maxParticipants * 0.8 ? 'warning.main' : 
                         'success.main',
                width: `${Math.min((participantsCount / maxParticipants) * 100, 100)}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onEdit && (
          <MenuItem onClick={() => handleMenuAction(onEdit)}>
            <EditIcon sx={{ mr: 1, fontSize: 18 }} />
            Edit {type === 'instance' ? 'Class' : 'Schedule'}
          </MenuItem>
        )}
        {onViewParticipants && (
          <MenuItem onClick={() => handleMenuAction(onViewParticipants)}>
            <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
            View Participants
          </MenuItem>
        )}
        {onDelete && userRole === 'admin' && (
          <MenuItem 
            onClick={() => handleMenuAction(onDelete)}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
            Delete {type === 'instance' ? 'Class' : 'Schedule'}
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}