// src/app/components/ui/ClassCalendar.tsx - Calendar View for Classes
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
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  ViewDay as DayIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { ClassInstance, getClassTypeColor, formatClassTime } from '../../types/class';

interface ClassCalendarProps {
  classes: ClassInstance[];
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  onClassClick?: (classInstance: ClassInstance) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
  userRole: 'admin' | 'trainer' | 'staff';
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
  classes,
  viewMode,
  onViewModeChange,
  onClassClick,
  onDateClick,
  selectedDate = new Date(),
  userRole,
}: ClassCalendarProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [eventMenuAnchor, setEventMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Convert classes to calendar events
  const events = useMemo(() => {
    return classes.map(classInstance => ({
      id: classInstance.id,
      title: classInstance.name,
      startTime: classInstance.startTime,
      endTime: classInstance.endTime,
      date: classInstance.date,
      color: getClassTypeColor(classInstance.classType),
      classInstance,
    }));
  }, [classes]);

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
        setCurrentDate(new Date());
        return;
    }
    
    setCurrentDate(newDate);
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      return { start, end };
    } else if (viewMode === 'week') {
      // Get start of week (Monday)
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else {
      // Month view
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= rangeStart && eventDate <= rangeEnd;
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

  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(event => 
      new Date(event.date).toDateString() === currentDate.toDateString()
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));

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
            {userRole === 'admin' && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Click to schedule a class
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dayEvents.map(event => (
              <Card
                key={event.id}
                sx={{
                  borderLeft: `4px solid ${event.color}`,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => handleEventClick(event)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {event.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatClassTime(event.startTime, 
                          event.classInstance.actualDuration || 60)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.classInstance.instructorName}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={event.classInstance.classType}
                          size="small"
                          sx={{
                            bgcolor: `${event.color}15`,
                            color: event.color,
                          }}
                        />
                        <Chip
                          label={`${event.classInstance.registeredParticipants.length}/${event.classInstance.maxParticipants}`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
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
    const weekDays: Date[] = [];
    const startOfWeek = new Date(rangeStart);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    const timeSlots = [];
    for (let hour = 6; hour <= 22; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    return (
      <Box sx={{ p: 2 }}>
        {/* Week header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 1, mb: 2 }}>
          <Box /> {/* Empty cell for time column */}
          {weekDays.map(day => (
            <Box
              key={day.toISOString()}
              sx={{
                p: 1,
                textAlign: 'center',
                borderRadius: 1,
                bgcolor: day.toDateString() === new Date().toDateString() ? 'primary.main' : 'transparent',
                color: day.toDateString() === new Date().toDateString() ? 'primary.contrastText' : 'text.primary',
                cursor: onDateClick ? 'pointer' : 'default',
              }}
              onClick={() => onDateClick?.(day)}
            >
              <Typography variant="caption" display="block">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="h6">
                {day.getDate()}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Week grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '60px repeat(7, 1fr)', 
          gap: 1,
          maxHeight: '60vh',
          overflow: 'auto',
        }}>
          {timeSlots.map(time => (
            <React.Fragment key={time}>
              <Box sx={{ p: 1, textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary' }}>
                {time}
              </Box>
              {weekDays.map(day => {
                const dayEvents = filteredEvents.filter(event => {
                  const eventDate = new Date(event.date);
                  const eventHour = parseInt(event.startTime.split(':')[0]);
                  const timeHour = parseInt(time.split(':')[0]);
                  return eventDate.toDateString() === day.toDateString() && 
                         eventHour === timeHour;
                });

                return (
                  <Box
                    key={`${day.toISOString()}-${time}`}
                    sx={{
                      minHeight: 40,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 0.5,
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

  const renderMonthView = () => {
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

    return (
      <Box sx={{ p: 2 }}>
        {/* Month header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography
              key={day}
              variant="subtitle2"
              sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Month grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weeks.flat().map(date => {
            const dayEvents = filteredEvents.filter(event =>
              new Date(event.date).toDateString() === date.toDateString()
            );

            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <Box
                key={date.toISOString()}
                sx={{
                  minHeight: 80,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  cursor: onDateClick ? 'pointer' : 'default',
                  bgcolor: isToday ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => onDateClick?.(date)}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'primary.main' : 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {date.getDate()}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {dayEvents.slice(0, 2).map(event => (
                    <Tooltip key={event.id} title={`${event.title} - ${event.startTime}`}>
                      <Box
                        sx={{
                          bgcolor: event.color,
                          color: 'white',
                          p: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
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
                        {event.title.length > 12 ? `${event.title.slice(0, 12)}...` : event.title}
                      </Box>
                    </Tooltip>
                  ))}
                  {dayEvents.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayEvents.length - 2} more
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Card sx={{ height: 'fit-content' }}>
      {/* Calendar Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateDate('prev')} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Button
              onClick={() => navigateDate('today')}
              startIcon={<TodayIcon />}
              variant="outlined"
              size="small"
            >
              Today
            </Button>
            <IconButton onClick={() => navigateDate('next')} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric',
              ...(viewMode === 'day' && { day: 'numeric', weekday: 'long' })
            })}
          </Typography>
        </Box>

        {/* View Mode Selector */}
        <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, p: 0.5, border: 1, borderColor: 'divider' }}>
          <IconButton
            size="small"
            onClick={() => onViewModeChange('day')}
            sx={{
              bgcolor: viewMode === 'day' ? 'primary.main' : 'transparent',
              color: viewMode === 'day' ? 'primary.contrastText' : 'text.secondary',
              '&:hover': {
                bgcolor: viewMode === 'day' ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <DayIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onViewModeChange('week')}
            sx={{
              bgcolor: viewMode === 'week' ? 'primary.main' : 'transparent',
              color: viewMode === 'week' ? 'primary.contrastText' : 'text.secondary',
              '&:hover': {
                bgcolor: viewMode === 'week' ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <WeekIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onViewModeChange('month')}
            sx={{
              bgcolor: viewMode === 'month' ? 'primary.main' : 'transparent',
              color: viewMode === 'month' ? 'primary.contrastText' : 'text.secondary',
              '&:hover': {
                bgcolor: viewMode === 'month' ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <MonthIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Content */}
      <Box sx={{ minHeight: 400 }}>
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
        {selectedEvent && onClassClick && (
          <MenuItem onClick={() => {
            onClassClick(selectedEvent.classInstance);
            handleEventMenuClose();
          }}>
            View Details
          </MenuItem>
        )}
        {selectedEvent && userRole === 'admin' && (
          <MenuItem onClick={handleEventMenuClose}>
            Edit Class
          </MenuItem>
        )}
        {selectedEvent && userRole === 'admin' && (
          <MenuItem onClick={handleEventMenuClose} sx={{ color: 'error.main' }}>
            Cancel Class
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}