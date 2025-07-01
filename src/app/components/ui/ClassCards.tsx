// src/app/components/ui/ClassCards.tsx (Modified to use fixed User type)
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
  type: 'schedule' | 'instance'; // Indicates if it's a schedule or a specific instance
  onEdit: (data: ClassSchedule | ClassInstance) => void;
  onDelete: (id: string, type: 'schedule' | 'instance') => void;
  onStartClass?: (instanceId: string) => void;
  onEndClass?: (instanceId: string) => void;
  onCancelClass?: (instanceId: string) => void;
}

export default function ClassCard({
  classData,
  type,
  onEdit,
  onDelete,
  onStartClass,
  onEndClass,
  onCancelClass,
}: ClassCardProps) {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // User.role now correctly exists due to the fix in src/app/types/auth.ts
  const isInstructor = user?.role === 'trainer' && user.uid === classData.instructorId;
  const isAdmin = user?.role === 'admin';

  const showManagementButtons = type === 'instance' && (isAdmin || isInstructor);

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 3, transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Chip
              label={classData.classType}
              size="small"
              sx={{
                bgcolor: getClassTypeColor(classData.classType),
                color: 'white',
                fontWeight: 'bold',
                mb: 1,
              }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {classData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {classData.instructorName}
            </Typography>
          </Box>
          <IconButton
            aria-label="settings"
            onClick={handleMenuClick}
            sx={{ mt: -1, mr: -1 }}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            {/* Edit Option */}
            {(isAdmin || isInstructor) && (
              <MenuItem onClick={() => { onEdit(classData); handleMenuClose(); }}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
            )}

            {/* Delete/Cancel Option */}
            {isAdmin && ( // Only admin can delete/cancel schedules or instances
              <MenuItem onClick={() => { onDelete(classData.id, type); handleMenuClose(); }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{type === 'schedule' ? 'Delete Schedule' : 'Cancel Instance'}</ListItemText>
              </MenuItem>
            )}

          </Menu>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {type === 'instance'
              ? format(new Date((classData as ClassInstance).date), 'PPP')
              : format(new Date((classData as ClassSchedule).startDate), 'PPP')
            }
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TimeIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {classData.startTime} - {type === 'instance' ? (classData as ClassInstance).endTime : `${Math.floor((parseInt(classData.startTime.split(':')[0]) * 60 + parseInt(classData.startTime.split(':')[1]) + classData.duration) / 60).toString().padStart(2, '0')}:${((parseInt(classData.startTime.split(':')[0]) * 60 + parseInt(classData.startTime.split(':')[1]) + classData.duration) % 60).toString().padStart(2, '0')}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PeopleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            Max Participants: {classData.maxParticipants}
            {type === 'instance' && ` (${(classData as ClassInstance).registeredParticipants.length} registered)`}
          </Typography>
        </Box>

        {type === 'instance' && (classData as ClassInstance).location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {(classData as ClassInstance).location}
            </Typography>
          </Box>
        )}

        {type === 'instance' && (
          <Chip
            label={(classData as ClassInstance).status.toUpperCase()}
            size="small"
            color={
              (classData as ClassInstance).status === 'scheduled'
                ? 'info'
                : (classData as ClassInstance).status === 'ongoing'
                  ? 'success'
                  : (classData as ClassInstance).status === 'completed'
                    ? 'default'
                    : 'error'
            }
            sx={{ mt: 1, fontWeight: 'bold' }}
          />
        )}

        {showManagementButtons && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(classData as ClassInstance).status === 'scheduled' && onStartClass && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={() => onStartClass((classData as ClassInstance).id)}
              >
                Start Class
              </Button>
            )}
            {(classData as ClassInstance).status === 'ongoing' && onEndClass && (
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<StopIcon />}
                onClick={() => onEndClass((classData as ClassInstance).id)}
              >
                End Class
              </Button>
            )}
            {((classData as ClassInstance).status === 'scheduled' || (classData as ClassInstance).status === 'ongoing') && onCancelClass && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => onCancelClass((classData as ClassInstance).id)}
              >
                Cancel Class
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}