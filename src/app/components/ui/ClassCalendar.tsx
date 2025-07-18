// src/app/components/ui/ClassCalendar.tsx - Performance optimized version
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Skeleton,
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
import { ClassInstance, getClassTypeColor, ClassSchedule } from '../../types/class';

interface ClassCalendarProps {
  instances: ClassInstance[];
  onInstanceClick?: (instance: ClassInstance) => void;
  onInstanceEdit?: (instance: ClassInstance) => void;
  loading?: boolean;
  // Optional advanced props for future use
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
  userRole?: 'admin' | 'trainer' | 'staff' | 'member';
  onEditClass?: (data: ClassSchedule | ClassInstance) => void;
  onDeleteClass?: (data: ClassInstance, type: 'instance') => void;
  onStartClass?: (instanceId: string) => void;
  onEndClass?: (instanceId: string) => void;
  onCancelClass?: (instanceId: string) => void;
  userId?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  color: string;
  classInstance: ClassInstance;
}

export default function ClassCalendar({
  instances,
  onInstanceClick,
  onInstanceEdit,
  loading = false,
  // Default values for optional advanced props
  viewMode = 'month',
  onViewModeChange,
  onDateClick,
  selectedDate = new Date(),
  userRole = 'admin',
  onEditClass,
  onDeleteClass,
  onStartClass,
  onEndClass,
  onCancelClass,
  userId = '',
}: ClassCalendarProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [eventMenuAnchor, setEventMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Sync currentDate with selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  // Memoize expensive calculations
  const events = useMemo(() => {
    if (!instances || instances.length === 0) return [];
    
    return instances.map(classInstance => ({
      id: classInstance.id,
      title: classInstance.name,
      startTime: classInstance.startTime,
      endTime: classInstance.endTime,
      date: classInstance.date,
      color: getClassTypeColor(classInstance.classType),
      classInstance,
    }));
  }, [instances]);

  // Optimize date range calculations
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === 'week') {
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [currentDate, viewMode]);

  // Optimize filtered events with better memoization
  const filteredEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const { start: rangeStart, end: rangeEnd } = dateRange;
    const rangeStartNormalized = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const rangeEndNormalized = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

    return events.filter(event => {
      try {
        const eventDate = new Date(event.date + 'T00:00:00.000Z');
        const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
        return eventDateLocal >= rangeStartNormalized && eventDateLocal <= rangeEndNormalized;
      } catch {
        return false;
      }
    });
  }, [events, dateRange]);

  // Optimize navigation with useCallback
  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);

    switch (direction) {
      case 'prev':
        if (viewMode === 'day') {
          newDate.setDate(newDate.getDate() - 1);
        } else if (viewMode === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setMonth(newDate.getMonth() - 1);
        }
        break;
      case 'next':
        if (viewMode === 'day') {
          newDate.setDate(newDate.getDate() + 1);
        } else if (viewMode === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
        break;
      case 'today':
        newDate.setTime(new Date().getTime());
        break;
    }

    setCurrentDate(newDate);
    onDateClick?.(newDate);
  }, [currentDate, viewMode, onDateClick]);

  const handleEventClick = useCallback((event: CalendarEvent, anchorEl?: HTMLElement) => {
    if (anchorEl) {
      setEventMenuAnchor(anchorEl);
      setSelectedEvent(event);
    } else if (onInstanceClick) {
      onInstanceClick(event.classInstance);
    }
  }, [onInstanceClick]);

  const handleEventMenuClose = useCallback(() => {
    setEventMenuAnchor(null);
    setSelectedEvent(null);
  }, []);

  const isInstructorOfSelectedEvent = selectedEvent?.classInstance.instructorId === userId;
  const showManagementButtons = userRole === 'admin' || isInstructorOfSelectedEvent;

  // Optimize month view rendering with memoization
  const monthViewData = useMemo(() => {
    if (viewMode !== 'month') return null;
    
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const weeks = [];
    const currentWeekDate = new Date(startDate);

    while (currentWeekDate <= lastDayOfMonth || weeks.length < 6) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentWeekDate));
        currentWeekDate.setDate(currentWeekDate.getDate() + 1);
      }
      weeks.push(week);
      if (currentWeekDate > lastDayOfMonth && weeks.length >= 4) break;
    }

    return { weeks, firstDayOfMonth };
  }, [currentDate, viewMode]);

  // Add loading state
  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Skeleton variant="text" width={200} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // Day view rendering function
  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      try {
        const eventDate = new Date(event.date + 'T00:00:00.000Z');
        const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
        const currentDateLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        return eventDateLocal.getTime() === currentDateLocal.getTime();
      } catch {
        return false;
      }
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Typography>

        {dayEvents.length === 0 ? (
          <Box sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
            cursor: onDateClick ? 'pointer' : 'default'
          }}
          onClick={() => onDateClick?.(currentDate)}
          >
            <Typography variant="body1">No classes scheduled for this day</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dayEvents.map(event => (
              <Card key={event.id} sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }} onClick={() => handleEventClick(event)}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        {event.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {`${event.startTime} - ${event.endTime}`}
                        </Typography>
                        <Chip 
                          label={event.classInstance.classType} 
                          size="small" 
                          sx={{ 
                            bgcolor: event.color,
                            color: 'white',
                            fontWeight: 600
                          }} 
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Instructor: {event.classInstance.instructorName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.classInstance.registeredParticipants.length}/{event.classInstance.maxParticipants} participants
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleEventClick(event, e.currentTarget)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Week view rendering function
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    const timeSlots = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return `${hour}:00`;
    });

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 1 }}>
          {/* Header row */}
          <Box sx={{ p: 1 }}></Box>
          {weekDays.map(day => (
            <Box key={day.toISOString()} sx={{ 
              p: 1, 
              textAlign: 'center',
              cursor: onDateClick ? 'pointer' : 'default',
              '&:hover': {
                bgcolor: 'action.hover',
                borderRadius: 1
              }
            }}
            onClick={() => onDateClick?.(day)}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="h6">
                {day.getDate()}
              </Typography>
            </Box>
          ))}

          {/* Time slots and events */}
          {timeSlots.map(timeSlot => (
            <React.Fragment key={timeSlot}>
              <Box sx={{ 
                p: 1, 
                borderTop: 1, 
                borderColor: 'divider',
                fontSize: '0.75rem',
                color: 'text.secondary'
              }}>
                {timeSlot}
              </Box>
              {weekDays.map(day => {
                const dayEvents = filteredEvents.filter(event => {
                  try {
                    const eventDate = new Date(event.date + 'T00:00:00.000Z');
                    const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
                    const dayLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    return eventDateLocal.getTime() === dayLocal.getTime() && 
                      event.startTime.startsWith(timeSlot.substring(0, 2));
                  } catch {
                    return false;
                  }
                });

                return (
                  <Box key={`${day.toISOString()}-${timeSlot}`} sx={{ 
                    p: 0.5, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    minHeight: 40,
                    position: 'relative',
                    cursor: onDateClick ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => onDateClick?.(day)}
                  >
                    {dayEvents.map(event => (
                      <Box
                        key={event.id}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          left: 2,
                          right: 2,
                          bgcolor: event.color,
                          color: 'white',
                          p: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scale(1.02)',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {event.title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          {event.startTime}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  };

  // Month view rendering function
  const renderMonthView = () => {
    if (!monthViewData) return null;
    
    const { weeks, firstDayOfMonth } = monthViewData;

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 1,
          mb: 2
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography key={day} variant="body2" sx={{ 
              p: 1, 
              textAlign: 'center', 
              fontWeight: 600,
              color: 'text.secondary'
            }}>
              {day}
            </Typography>
          ))}
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: 1 
        }}>
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const dayEvents = filteredEvents.filter(event => {
                  try {
                    const eventDate = new Date(event.date + 'T00:00:00.000Z');
                    const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
                    const dayLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    return eventDateLocal.getTime() === dayLocal.getTime();
                  } catch {
                    return false;
                  }
                });

                return (
                  <Box
                    key={`${weekIndex}-${dayIndex}`}
                    sx={{
                      position: 'relative',
                      minHeight: 100,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      bgcolor: isCurrentMonth ? 'background.paper' : 'action.hover',
                      cursor: onDateClick ? 'pointer' : 'default',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => onDateClick?.(day)}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday ? 600 : 400,
                        color: isCurrentMonth ? 'text.primary' : 'text.secondary',
                        mb: 1
                      }}
                    >
                      {day.getDate()}
                    </Typography>
                    {dayEvents.slice(0, 3).map((event, index) => (
                      <Box
                        key={event.id}
                        sx={{
                          bgcolor: event.color,
                          color: 'white',
                          p: 0.5,
                          mb: 0.5,
                          borderRadius: 0.5,
                          fontSize: '0.6rem',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scale(1.02)',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {event.title}
                        </Typography>
                      </Box>
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.6rem'
                      }}>
                        +{dayEvents.length - 3} more
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            onClick={() => navigateDate('prev')}
            sx={{ color: 'inherit' }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center', color: 'white' }}>
            {viewMode === 'month' 
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : viewMode === 'week'
              ? `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
            }
          </Typography>

          <IconButton 
            onClick={() => navigateDate('next')}
            sx={{ color: 'inherit' }}
          >
            <ChevronRightIcon />
          </IconButton>

          <Tooltip title="Today">
            <IconButton 
              onClick={() => navigateDate('today')}
              sx={{ color: 'inherit' }}
            >
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onViewModeChange && (
            <>
              <Tooltip title="Day View">
                <IconButton
                  onClick={() => onViewModeChange('day')}
                  sx={{ 
                    color: 'inherit',
                    bgcolor: viewMode === 'day' ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }}
                >
                  <DayIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Week View">
                <IconButton
                  onClick={() => onViewModeChange('week')}
                  sx={{ 
                    color: 'inherit',
                    bgcolor: viewMode === 'week' ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }}
                >
                  <WeekIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Month View">
                <IconButton
                  onClick={() => onViewModeChange('month')}
                  sx={{ 
                    color: 'inherit',
                    bgcolor: viewMode === 'month' ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }}
                >
                  <MonthIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Calendar Content */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Event Menu */}
      <Menu
        anchorEl={eventMenuAnchor}
        open={Boolean(eventMenuAnchor)}
        onClose={handleEventMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {[
          // Always show View Details
          <MenuItem key="view-details" onClick={() => {
            if (selectedEvent) {
              handleEventClick(selectedEvent);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>,
          
          // Conditionally render management buttons
          ...(showManagementButtons ? [
            <MenuItem key="edit-class" onClick={() => {
              if (selectedEvent && onEditClass) {
                onEditClass(selectedEvent.classInstance);
              } else if (selectedEvent && onInstanceEdit) {
                onInstanceEdit(selectedEvent.classInstance);
              }
              handleEventMenuClose();
            }}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit Class</ListItemText>
            </MenuItem>,

            ...(selectedEvent?.classInstance.status === 'scheduled' && onStartClass ? [
              <MenuItem key="start-class" onClick={() => {
                if (selectedEvent) {
                  onStartClass(selectedEvent.classInstance.id);
                }
                handleEventMenuClose();
              }}>
                <ListItemIcon>
                  <PlayArrowIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Start Class</ListItemText>
              </MenuItem>
            ] : []),

            ...(selectedEvent?.classInstance.status === 'ongoing' && onEndClass ? [
              <MenuItem key="end-class" onClick={() => {
                if (selectedEvent) {
                  onEndClass(selectedEvent.classInstance.id);
                }
                handleEventMenuClose();
              }}>
                <ListItemIcon>
                  <StopIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>End Class</ListItemText>
              </MenuItem>
            ] : []),

            ...(selectedEvent?.classInstance.status === 'scheduled' && onCancelClass ? [
              <MenuItem key="cancel-class" onClick={() => {
                if (selectedEvent) {
                  onCancelClass(selectedEvent.classInstance.id);
                }
                handleEventMenuClose();
              }}>
                <ListItemIcon>
                  <CancelIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Cancel Class</ListItemText>
              </MenuItem>
            ] : []),

            <MenuItem 
              key="delete-class"
              onClick={() => {
                if (selectedEvent && onDeleteClass) {
                  onDeleteClass(selectedEvent.classInstance, 'instance');
                }
                handleEventMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete Class</ListItemText>
            </MenuItem>
          ] : [])
        ]}
      </Menu>
    </Box>
  );
}