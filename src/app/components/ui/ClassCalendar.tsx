// src/app/components/ui/ClassCalendar.tsx - SADECE TYPESCRIPT HATALARI DÜZELTİLDİ
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { ClassInstance, getClassTypeColor, ClassSchedule } from '../../types/class';

interface ClassCalendarProps {
  instances: ClassInstance[]; // SADECE PROP ADI DÜZELTİLDİ
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void; // EKLENEN PROP
  onClassClick?: (classInstance: ClassInstance) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
  userRole: 'admin' | 'trainer' | 'visiting_trainer' | 'member';
  onEditClass: (data: ClassSchedule | ClassInstance) => void;
  onDeleteClass: (data: ClassInstance, type: 'instance') => void;
  onStartClass?: (instanceId: string) => void;
  onEndClass?: (instanceId: string) => void;
  onCancelClass?: (instanceId: string) => void;
  userId: string;
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
  instances, // SADECE PROP ADI DÜZELTİLDİ
  viewMode,
  onViewModeChange,
  onClassClick,
  onDateClick,
  selectedDate = new Date(),
  userRole,
  onEditClass,
  onDeleteClass,
  onStartClass,
  onEndClass,
  onCancelClass,
  userId,
}: ClassCalendarProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [eventMenuAnchor, setEventMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Sync currentDate with selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  const events = useMemo(() => {
    return instances.map(classInstance => ({ // SADECE PROP ADI DÜZELTİLDİ
      id: classInstance.id,
      title: classInstance.name,
      startTime: classInstance.startTime,
      endTime: classInstance.endTime,
      date: classInstance.date,
      color: getClassTypeColor(classInstance.classType),
      classInstance,
    }));
  }, [instances]); // SADECE PROP ADI DÜZELTİLDİ

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
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
    // Notify parent about date change
    if (onDateClick) {
      onDateClick(newDate);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === 'week') {
      const dayOfWeek = start.getDay(); // 0 for Sunday, 1 for Monday
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Go to Monday of current week
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6); // End on Sunday
      end.setHours(23, 59, 59, 999);
    } else { // Month view
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of the current month
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const filteredEvents = events.filter(event => {
    // Parse the date string in YYYY-MM-DD format
    const eventDate = new Date(event.date + 'T00:00:00.000Z');
    const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
    
    // Create normalized date range for comparison
    const rangeStartNormalized = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const rangeEndNormalized = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
    
    return eventDateLocal >= rangeStartNormalized && eventDateLocal <= rangeEndNormalized;
  });

  const handleEventClick = (event: CalendarEvent, anchorEl?: HTMLElement) => {
    if (anchorEl) {
      setEventMenuAnchor(anchorEl);
      setSelectedEvent(event);
    } else if (onClassClick) {
      onClassClick(event.classInstance);
    }
  };

  const handleEventMenuClose = () => {
    setEventMenuAnchor(null);
    setSelectedEvent(null);
  };

  const isInstructorOfSelectedEvent = selectedEvent?.classInstance.instructorId === userId;
  const showManagementButtons = userRole === 'admin' || isInstructorOfSelectedEvent;

  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.date + 'T00:00:00.000Z');
      const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
      const currentDateLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      return eventDateLocal.getTime() === currentDateLocal.getTime();
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
            <Typography variant="h6" gutterBottom>
              No classes scheduled
            </Typography>
            <Typography variant="body2">
              Click to schedule a new class for this day
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dayEvents.map(event => (
              <Card
                key={event.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease'
                  },
                  border: `2px solid ${alpha(event.color, 0.2)}`,
                  borderLeft: `6px solid ${event.color}`,
                }}
                onClick={() => handleEventClick(event)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {event.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip
                          label={event.classInstance.classType}
                          size="small"
                          sx={{
                            backgroundColor: event.color,
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                        <Chip
                          label={event.classInstance.status}
                          size="small"
                          color={
                            event.classInstance.status === 'completed' ? 'success' :
                            event.classInstance.status === 'cancelled' ? 'error' :
                            event.classInstance.status === 'ongoing' ? 'warning' : 'primary'
                          }
                        />
                      </Box>

                      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        ⏰ {event.startTime} - {event.endTime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        👨‍🏫 {event.classInstance.instructorName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        👥 {event.classInstance.registeredParticipants.length}/{event.classInstance.maxParticipants} participants
                        {event.classInstance.waitlist.length > 0 && (
                          <span style={{ color: theme.palette.warning.main }}>
                            {' '}• {event.classInstance.waitlist.length} on waitlist
                          </span>
                        )}
                      </Typography>
                    </Box>
                    
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event, e.currentTarget);
                      }}
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

  const renderWeekView = () => {
    const weekDays = [];
    const weekStart = new Date(currentDate);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
    weekStart.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      weekDays.push(day);
    }

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
            <Typography key={dayName} variant="subtitle1" align="center" sx={{ fontWeight: 600, py: 1 }}>
              {dayName}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weekDays.map((day, index) => {
            const dayEvents = filteredEvents.filter(event => {
              const eventDate = new Date(event.date + 'T00:00:00.000Z');
              const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
              const dayLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              return eventDateLocal.getTime() === dayLocal.getTime();
            }).sort((a, b) => a.startTime.localeCompare(b.startTime));

            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <Box
                key={index}
                sx={{
                  minHeight: 120,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 1,
                  bgcolor: isToday ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                  cursor: onDateClick ? 'pointer' : 'default',
                }}
                onClick={() => onDateClick?.(day)}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'primary.main' : 'text.primary',
                    mb: 1
                  }}
                >
                  {day.getDate()}
                </Typography>

                {dayEvents.slice(0, 3).map(event => (
                  <Tooltip key={event.id} title={`${event.title} • ${event.startTime}`}>
                    <Box
                      sx={{
                        p: 0.5,
                        mb: 0.5,
                        borderRadius: 0.5,
                        backgroundColor: event.color,
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          opacity: 0.8,
                          transform: 'scale(1.02)',
                          transition: 'all 0.1s ease'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.startTime} {event.title}
                    </Box>
                  </Tooltip>
                ))}

                {dayEvents.length > 3 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    +{dayEvents.length - 3} more
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderMonthView = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
            <Typography key={dayName} variant="subtitle1" align="center" sx={{ fontWeight: 600, py: 1 }}>
              {dayName}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map((day, index) => {
            const dayEvents = filteredEvents.filter(event => {
              const eventDate = new Date(event.date + 'T00:00:00.000Z');
              const eventDateLocal = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
              const dayLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              return eventDateLocal.getTime() === dayLocal.getTime();
            });

            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <Box
                key={index}
                sx={{
                  minHeight: 100,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 0.5,
                  opacity: isCurrentMonth ? 1 : 0.3,
                  bgcolor: isToday ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                  cursor: onDateClick ? 'pointer' : 'default',
                }}
                onClick={() => onDateClick?.(day)}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'primary.main' : 'text.primary',
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  {day.getDate()}
                </Typography>

                {dayEvents.slice(0, 2).map(event => (
                  <Tooltip key={event.id} title={`${event.title} • ${event.startTime}`}>
                    <Box
                      sx={{
                        p: 0.25,
                        mb: 0.25,
                        borderRadius: 0.25,
                        backgroundColor: event.color,
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          opacity: 0.8
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                    </Box>
                  </Tooltip>
                ))}

                {dayEvents.length > 2 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                    +{dayEvents.length - 2}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        weekStart.setDate(diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      default:
        return '';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Calendar Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateDate('prev')} size="small">
            <ChevronLeftIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>
            {getViewTitle()}
          </Typography>
          
          <IconButton onClick={() => navigateDate('next')} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TodayIcon />}
            onClick={() => navigateDate('today')}
          >
            Today
          </Button>

          <Box sx={{ display: 'flex', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
            <Tooltip title="Day View">
              <IconButton
                size="small"
                onClick={() => onViewModeChange('day')}
                sx={{
                  borderRadius: 0,
                  bgcolor: viewMode === 'day' ? 'primary.main' : 'transparent',
                  color: viewMode === 'day' ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: viewMode === 'day' ? 'primary.dark' : 'action.hover',
                  }
                }}
              >
                <DayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Week View">
              <IconButton
                size="small"
                onClick={() => onViewModeChange('week')}
                sx={{
                  borderRadius: 0,
                  bgcolor: viewMode === 'week' ? 'primary.main' : 'transparent',
                  color: viewMode === 'week' ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: viewMode === 'week' ? 'primary.dark' : 'action.hover',
                  }
                }}
              >
                <WeekIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Month View">
              <IconButton
                size="small"
                onClick={() => onViewModeChange('month')}
                sx={{
                  borderRadius: 0,
                  bgcolor: viewMode === 'month' ? 'primary.main' : 'transparent',
                  color: viewMode === 'month' ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: viewMode === 'month' ? 'primary.dark' : 'action.hover',
                  }
                }}
              >
                <MonthIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Calendar Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Box>

      {/* Event Context Menu */}
      <Menu
        anchorEl={eventMenuAnchor}
        open={Boolean(eventMenuAnchor)}
        onClose={handleEventMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          if (selectedEvent) {
            onEditClass(selectedEvent.classInstance);
          }
          handleEventMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Class</ListItemText>
        </MenuItem>

        {showManagementButtons && selectedEvent?.classInstance.status === 'scheduled' && (
          <MenuItem onClick={() => {
            if (selectedEvent && onStartClass) {
              onStartClass(selectedEvent.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Class</ListItemText>
          </MenuItem>
        )}

        {showManagementButtons && selectedEvent?.classInstance.status === 'ongoing' && (
          <MenuItem onClick={() => {
            if (selectedEvent && onEndClass) {
              onEndClass(selectedEvent.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <StopIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>End Class</ListItemText>
          </MenuItem>
        )}

        {showManagementButtons && selectedEvent?.classInstance.status === 'scheduled' && (
          <MenuItem onClick={() => {
            if (selectedEvent && onCancelClass) {
              onCancelClass(selectedEvent.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel Class</ListItemText>
          </MenuItem>
        )}

        {(userRole === 'admin') && (
          <MenuItem
            onClick={() => {
              if (selectedEvent) {
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
        )}
      </Menu>
    </Box>
  );
}