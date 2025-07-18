// src/app/components/ui/ClassCalendar.tsx - COMPLETELY FIXED CALENDAR
'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ClassInstance, getClassTypeColor } from '@/app/types/class';

interface ClassCalendarProps {
  instances: ClassInstance[];
  onInstanceClick?: (instance: ClassInstance) => void;
  onInstanceEdit?: (instance: ClassInstance) => void;
  loading?: boolean;
}

interface CalendarDay {
  date: Date;
  instances: ClassInstance[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function ClassCalendar({
  instances,
  onInstanceClick,
  onInstanceEdit,
  loading = false,
}: ClassCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    return days.map((date): CalendarDay => {
      const dayInstances = instances.filter(instance => {
        try {
          const instanceDate = parseISO(instance.date);
          return isSameDay(instanceDate, date);
        } catch {
          return false;
        }
      });

      return {
        date,
        instances: dayInstances,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
      };
    });
  }, [currentMonth, instances]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.instances.length > 0) {
      setSelectedDay(day);
    }
  };

  const handleInstanceClick = (instance: ClassInstance) => {
    onInstanceClick?.(instance);
    setSelectedDay(null);
  };

  const handleInstanceEdit = (instance: ClassInstance, event: React.MouseEvent) => {
    event.stopPropagation();
    onInstanceEdit?.(instance);
    setSelectedDay(null);
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

  const getStatusColor = (status: ClassInstance['status']) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      {/* Calendar Header */}
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="between" 
        mb={2}
        sx={{ 
          backgroundColor: 'background.paper',
          borderRadius: 1,
          p: 2,
          boxShadow: 1,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight="bold">
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Button
            size="small"
            startIcon={<TodayIcon />}
            onClick={goToToday}
            variant="outlined"
          >
            Today
          </Button>
          
          <IconButton onClick={() => navigateMonth('prev')} size="small">
            <ChevronLeftIcon />
          </IconButton>
          
          <IconButton onClick={() => navigateMonth('next')} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Grid */}
      <Card sx={{ overflow: 'hidden' }}>
        {/* Weekday Headers */}
        <Grid container sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {WEEKDAYS.map((day) => (
            <Grid item xs key={day} sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Days */}
        <Grid container>
          {calendarDays.map((day, index) => (
            <Grid 
              item 
              xs 
              key={index}
              sx={{ 
                minHeight: 120,
                borderRight: index % 7 !== 6 ? 1 : 0,
                borderBottom: Math.floor(index / 7) < 5 ? 1 : 0,
                borderColor: 'divider',
                p: 0.5,
                backgroundColor: day.isCurrentMonth ? 'background.paper' : 'background.default',
                cursor: day.instances.length > 0 ? 'pointer' : 'default',
                '&:hover': day.instances.length > 0 ? {
                  backgroundColor: 'action.hover',
                } : {},
              }}
              onClick={() => handleDayClick(day)}
            >
              <Box height="100%" display="flex" flexDirection="column">
                {/* Day Number */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: day.isToday ? 'bold' : 'normal',
                    color: day.isToday ? 'primary.main' : 
                           day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                    textAlign: 'center',
                    mb: 0.5,
                  }}
                >
                  {format(day.date, 'd')}
                </Typography>

                {/* Class Instances */}
                <Box flex={1} display="flex" flexDirection="column" gap={0.5}>
                  {day.instances.slice(0, 3).map((instance) => (
                    <Tooltip
                      key={instance.id}
                      title={`${instance.name} - ${formatTime(instance.startTime)} (${instance.instructorName})`}
                    >
                      <Chip
                        label={
                          <Box display="flex" alignItems="center" gap={0.5} width="100%">
                            <Typography variant="caption" noWrap>
                              {formatTime(instance.startTime)}
                            </Typography>
                            <Typography variant="caption" noWrap flex={1}>
                              {instance.name}
                            </Typography>
                          </Box>
                        }
                        size="small"
                        sx={{
                          backgroundColor: getClassTypeColor(instance.classType),
                          color: 'white',
                          fontSize: '0.65rem',
                          height: 20,
                          justifyContent: 'flex-start',
                          '& .MuiChip-label': {
                            px: 0.5,
                            overflow: 'hidden',
                            width: '100%',
                          },
                        }}
                      />
                    </Tooltip>
                  ))}

                  {/* Show count if more instances */}
                  {day.instances.length > 3 && (
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      +{day.instances.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedDay && (
          <>
            <DialogTitle>
              <Typography variant="h6">
                Classes on {format(selectedDay.date, 'EEEE, MMMM d, yyyy')}
              </Typography>
            </DialogTitle>

            <DialogContent>
              <Box display="flex" flexDirection="column" gap={2}>
                {selectedDay.instances
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((instance) => (
                    <Paper
                      key={instance.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      onClick={() => handleInstanceClick(instance)}
                    >
                      <Box display="flex" alignItems="center" justifyContent="between">
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: getClassTypeColor(instance.classType),
                              }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {instance.name}
                            </Typography>
                            <Chip
                              label={instance.status}
                              size="small"
                              color={getStatusColor(instance.status)}
                              variant="outlined"
                            />
                          </Box>

                          <Typography variant="body2" color="text.secondary">
                            {formatTime(instance.startTime)} - {formatTime(instance.endTime)}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Instructor: {instance.instructorName}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Participants: {instance.registeredParticipants.length}/{instance.maxParticipants}
                          </Typography>

                          {instance.location && (
                            <Typography variant="body2" color="text.secondary">
                              Location: {instance.location}
                            </Typography>
                          )}
                        </Box>

                        {onInstanceEdit && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleInstanceEdit(instance, e)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  ))}
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setSelectedDay(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}