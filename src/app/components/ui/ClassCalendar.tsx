// src/app/components/ui/ClassCalendar.tsx - FIXED PROPS VERSION
'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  ViewDay as DayIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { ClassInstance, getClassTypeColor } from '../../types/class';
import { format, addDays, startOfWeek, startOfMonth, addWeeks, addMonths, isSameDay, parseISO } from 'date-fns';

interface ClassCalendarProps {
  instances: ClassInstance[]; // Fixed prop name
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onInstanceClick?: (instance: ClassInstance) => void;
  instructors: Array<{ id: string; name: string; specialties?: string[] }>;
}

export default function ClassCalendar({
  instances,
  viewMode,
  currentDate,
  onDateChange,
  onInstanceClick,
  instructors,
}: ClassCalendarProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInstance, setSelectedInstance] = useState<ClassInstance | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, instance: ClassInstance) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedInstance(instance);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInstance(null);
  };

  const handleInstanceClick = (instance: ClassInstance) => {
    onInstanceClick?.(instance);
  };

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(currentDate, -1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, -1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const navigateToday = () => {
    onDateChange(new Date());
  };

  // Get visible dates based on view mode
  const visibleDates = useMemo(() => {
    const dates: Date[] = [];
    
    switch (viewMode) {
      case 'day':
        dates.push(currentDate);
        break;
      case 'week':
        const weekStart = startOfWeek(currentDate);
        for (let i = 0; i < 7; i++) {
          dates.push(addDays(weekStart, i));
        }
        break;
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthStartWeek = startOfWeek(monthStart);
        for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
          dates.push(addDays(monthStartWeek, i));
        }
        break;
    }
    
    return dates;
  }, [currentDate, viewMode]);

  // Filter instances for visible dates
  const visibleInstances = useMemo(() => {
    return instances.filter(instance => {
      const instanceDate = parseISO(instance.date);
      return visibleDates.some(date => isSameDay(date, instanceDate));
    });
  }, [instances, visibleDates]);

  // Group instances by date
  const instancesByDate = useMemo(() => {
    const grouped: Record<string, ClassInstance[]> = {};
    
    visibleInstances.forEach(instance => {
      const dateKey = instance.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(instance);
    });
    
    // Sort instances by start time within each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    return grouped;
  }, [visibleInstances]);

  // Get title for current view
  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

  const getInstructorName = (instructorId: string) => {
    return instructors.find(i => i.id === instructorId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Calendar Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={navigatePrevious}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {getViewTitle()}
          </Typography>
          <IconButton onClick={navigateNext}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<TodayIcon />}
          onClick={navigateToday}
        >
          Today
        </Button>
      </Box>

      {/* Calendar Grid */}
      {viewMode === 'day' && (
        <Box>
          {instancesByDate[format(currentDate, 'yyyy-MM-dd')]?.length ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {instancesByDate[format(currentDate, 'yyyy-MM-dd')].map(instance => (
                <Card
                  key={instance.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                  }}
                  onClick={() => handleInstanceClick(instance)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{instance.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1 }}>
                          <Chip
                            label={instance.classType}
                            size="small"
                            sx={{
                              backgroundColor: getClassTypeColor(instance.classType),
                              color: 'white',
                            }}
                          />
                          <Chip
                            label={instance.status}
                            size="small"
                            color={getStatusColor(instance.status) as any}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {instance.startTime} - {instance.endTime}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getInstructorName(instance.instructorId)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {instance.registeredParticipants.length}/{instance.maxParticipants} participants
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, instance)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No classes scheduled for this day</Typography>
            </Box>
          )}
        </Box>
      )}

      {viewMode === 'week' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {visibleDates.map(date => (
            <Box key={date.toISOString()} sx={{ minHeight: 200, border: '1px solid', borderColor: 'divider', p: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {format(date, 'EEE d')}
              </Typography>
              {instancesByDate[format(date, 'yyyy-MM-dd')]?.map(instance => (
                <Tooltip key={instance.id} title={`${instance.name} - ${instance.startTime}`}>
                  <Box
                    sx={{
                      p: 0.5,
                      mb: 0.5,
                      borderRadius: 1,
                      backgroundColor: getClassTypeColor(instance.classType),
                      color: 'white',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 }
                    }}
                    onClick={() => handleInstanceClick(instance)}
                  >
                    {instance.startTime} {instance.name}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {viewMode === 'month' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box key={day} sx={{ p: 1, textAlign: 'center', fontWeight: 'bold' }}>
              {day}
            </Box>
          ))}
          
          {/* Calendar cells */}
          {visibleDates.map(date => (
            <Box
              key={date.toISOString()}
              sx={{
                minHeight: 80,
                border: '1px solid',
                borderColor: 'divider',
                p: 0.5,
                opacity: format(date, 'M') !== format(currentDate, 'M') ? 0.5 : 1
              }}
            >
              <Typography variant="caption">{format(date, 'd')}</Typography>
              {instancesByDate[format(date, 'yyyy-MM-dd')]?.slice(0, 3).map(instance => (
                <Tooltip key={instance.id} title={`${instance.name} - ${instance.startTime}`}>
                  <Box
                    sx={{
                      p: 0.25,
                      mb: 0.25,
                      borderRadius: 0.5,
                      backgroundColor: getClassTypeColor(instance.classType),
                      color: 'white',
                      fontSize: '0.625rem',
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 }
                    }}
                    onClick={() => handleInstanceClick(instance)}
                  >
                    {instance.name}
                  </Box>
                </Tooltip>
              ))}
              {instancesByDate[format(date, 'yyyy-MM-dd')]?.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  +{instancesByDate[format(date, 'yyyy-MM-dd')].length - 3} more
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleInstanceClick(selectedInstance!); handleMenuClose(); }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Class</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}