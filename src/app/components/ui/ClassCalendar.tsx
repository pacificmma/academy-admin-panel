// src/app/components/ui/ClassCalendar.tsx - FIXED VERSION
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
  TextField,
  InputAdornment,
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
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { ClassInstance, getClassTypeColor, ClassSchedule } from '../../types/class';

interface ClassCalendarProps {
  instances: ClassInstance[];
  onInstanceClick?: (instance: ClassInstance) => void;
  onInstanceEdit?: (instance: ClassInstance) => void;
  loading?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
  userRole?: 'admin' | 'trainer' | 'staff' | 'member' | 'visiting_trainer';
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
  viewMode = 'month',
  onViewModeChange,
  onDateClick,
  selectedDate,
  userRole = 'admin',
  onEditClass,
  onDeleteClass,
  onStartClass,
  onEndClass,
  onCancelClass,
  userId = '',
}: ClassCalendarProps) {
  const theme = useTheme();
  
  // Initialize currentDate with a stable default value
  const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date());
  const [eventMenuAnchor, setEventMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Only sync when selectedDate actually changes and is different
  useEffect(() => {
    if (selectedDate && selectedDate.getTime() !== currentDate.getTime()) {
      setCurrentDate(new Date(selectedDate));
    }
  }, [selectedDate?.getTime(), currentDate]);

  // Memoize expensive calculations with proper dependencies
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

  // FIXED: Prevent date mutation by creating completely new Date objects with proper local dates
  const dateRange = useMemo(() => {
    // Create new Date instances to avoid mutation - use local dates consistently
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (viewMode === 'day') {
      // For day view, start and end are the same day
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === 'week') {
      // Calculate week start (Sunday)
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      
      // Week end (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      return { start, end };
    } else {
      // Month view
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      // Last day of current month
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      
      return { start, end };
    }
  }, [currentDate.getTime(), viewMode]);

  // FIXED: Optimize filtered events with proper local date string comparison
  const filteredEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const { start: rangeStart, end: rangeEnd } = dateRange;

    return events.filter(event => {
      try {
        // FIXED: Parse event date as local date (not UTC) to avoid timezone offset issues
        const [year, month, day] = event.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day); // month is 0-indexed
        
        // Compare using time values for accuracy
        const eventTime = eventDate.getTime();
        
        return eventTime >= rangeStart.getTime() && eventTime <= rangeEnd.getTime();
      } catch {
        return false;
      }
    });
  }, [events, dateRange.start.getTime(), dateRange.end.getTime()]);

  // FIXED: Enhanced navigation with date selection
  const handleDateSelect = useCallback((dateString: string) => {
    if (dateString) {
      const [year, month, day] = dateString.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setCurrentDate(newDate);
    }
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Navigation function for prev/next buttons
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);

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
      }

      return newDate;
    });
  }, [viewMode]);

  // FIXED: Get current date as string for date input using local date formatting
  const currentDateString = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [currentDate]);

  // Stable event click handler
  const handleEventClick = useCallback((event: CalendarEvent, anchorEl?: HTMLElement) => {
    setSelectedEvent(event);
    if (anchorEl) {
      setEventMenuAnchor(anchorEl);
    }
    onInstanceClick?.(event.classInstance);
  }, [onInstanceClick]);

  const handleEventMenuClose = useCallback(() => {
    setEventMenuAnchor(null);
    setSelectedEvent(null);
  }, []);

  // Optimize month view data calculation
  const monthViewData = useMemo(() => {
    if (viewMode !== 'month') return null;

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    
    // Go to the first Sunday before or on the first day of the month
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks = [];
    const currentWeekDate = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        days.push(new Date(currentWeekDate));
        currentWeekDate.setDate(currentWeekDate.getDate() + 1);
      }
      weeks.push(days);
      
      // Stop if we've covered the entire month and the week ends
      if (currentWeekDate > lastDayOfMonth && currentWeekDate.getDay() === 0) {
        break;
      }
    }

    return { weeks, firstDayOfMonth };
  }, [currentDate.getTime(), viewMode]);

  // FIXED: Get events for a specific day with proper local date formatting
  const getEventsForDay = useCallback((day: Date) => {
    // FIXED: Format date as local date to avoid timezone offset issues
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const dayString = `${year}-${month}-${dayOfMonth}`;
    
    return filteredEvents.filter(event => {
      try {
        // Compare with the properly formatted local date string
        return event.date === dayString;
      } catch {
        return false;
      }
    });
  }, [filteredEvents]);

  // Format date display
  const formatDateHeader = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (viewMode === 'week') {
      const weekStart = new Date(dateRange.start);
      const weekEnd = new Date(dateRange.end);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    }
  }, [currentDate, viewMode, dateRange]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={40} height={40} />
            <Skeleton variant="rectangular" width={40} height={40} />
            <Skeleton variant="rectangular" width={80} height={40} />
          </Box>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={30} />
          ))}
        </Box>
        
        <Box>
          {Array.from({ length: 5 }).map((_, i) => (
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

  // FIXED: Complete renderDayView function
  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {formatDateHeader}
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
            <Typography variant="body2">No classes scheduled for this day</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dayEvents.map(event => (
              <Card key={event.id} sx={{ 
                cursor: 'pointer', 
                '&:hover': { transform: 'translateY(-2px)' }, 
                transition: 'transform 0.2s',
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <CardContent onClick={() => handleEventClick(event)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: event.color }}>
                        {event.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.startTime} - {event.endTime}
                      </Typography>
                      <Chip
                        size="small"
                        label={event.classInstance.classType}
                        sx={{ mt: 1, bgcolor: alpha(event.color, 0.1), color: event.color }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // FIXED: Complete renderWeekView function
  const renderWeekView = () => {
    const weekDays: Date[] = [];
    const startOfWeek = new Date(dateRange.start);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {formatDateHeader}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Typography key={day} variant="body2" sx={{ p: 1, textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
              {day} {weekDays[index]?.getDate()}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <Box
                key={index}
                sx={{
                  minHeight: 120,
                  p: 1,
                  border: '1px solid',
                  borderColor: isToday ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: isToday ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                  cursor: onDateClick ? 'pointer' : 'default',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => onDateClick?.(day)}
              >
                <Typography variant="caption" sx={{ 
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'primary.main' : 'text.primary',
                  display: 'block',
                  mb: 0.5
                }}>
                  {day.getDate()}
                </Typography>
                
                {dayEvents.map(event => (
                  <Box
                    key={event.id}
                    sx={{
                      bgcolor: event.color,
                      color: 'white',
                      p: 0.5,
                      mb: 0.5,
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
                    <Typography variant="caption" sx={{ 
                      fontWeight: 600, 
                      display: 'block',
                      fontSize: '0.65rem',
                      lineHeight: 1.2
                    }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      opacity: 0.9,
                      fontSize: '0.6rem',
                      lineHeight: 1
                    }}>
                      {event.startTime}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderMonthView = () => {
    if (!monthViewData) return null;
    
    const { weeks, firstDayOfMonth } = monthViewData;

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {formatDateHeader}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography key={day} variant="body2" sx={{ p: 1, textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
              {day}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = day.getMonth() === firstDayOfMonth.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <Box
                    key={dayIndex}
                    sx={{
                      minHeight: 100,
                      p: 1,
                      border: '1px solid',
                      borderColor: isToday ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: isToday ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                      cursor: onDateClick ? 'pointer' : 'default',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => onDateClick?.(day)}
                  >
                    <Typography variant="caption" sx={{ 
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'primary.main' : 'text.primary'
                    }}>
                      {day.getDate()}
                    </Typography>
                    
                    {dayEvents.map(event => (
                      <Box
                        key={event.id}
                        sx={{
                          bgcolor: event.color,
                          color: 'white',
                          p: 0.5,
                          mb: 0.5,
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

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Navigation and View Controls */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigateDate('prev')}>
            <ChevronLeftIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              type="date"
              value={currentDateString}
              onChange={(e) => handleDateSelect(e.target.value)}
              sx={{ 
                minWidth: 150,
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="outlined"
              size="small"
              onClick={goToToday}
              startIcon={<TodayIcon />}
              sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
            >
              Today
            </Button>
          </Box>
          
          <IconButton size="small" onClick={() => navigateDate('next')}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* View Mode Selector */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Day View">
            <IconButton
              size="small"
              onClick={() => onViewModeChange?.('day')}
              color={viewMode === 'day' ? 'primary' : 'default'}
            >
              <DayIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Week View">
            <IconButton
              size="small"
              onClick={() => onViewModeChange?.('week')}
              color={viewMode === 'week' ? 'primary' : 'default'}
            >
              <WeekIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Month View">
            <IconButton
              size="small"
              onClick={() => onViewModeChange?.('month')}
              color={viewMode === 'month' ? 'primary' : 'default'}
            >
              <MonthIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Calendar Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Box>

      {/* Event Menu */}
      <Menu
        anchorEl={eventMenuAnchor}
        open={Boolean(eventMenuAnchor)}
        onClose={handleEventMenuClose}
      >
        {userRole === 'admin' && [
          <MenuItem key="edit" onClick={() => {
            if (selectedEvent && onEditClass) {
              onEditClass(selectedEvent.classInstance);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Class</ListItemText>
          </MenuItem>,
          <MenuItem key="delete" onClick={() => {
            if (selectedEvent && onDeleteClass) {
              onDeleteClass(selectedEvent.classInstance, 'instance');
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Instance</ListItemText>
          </MenuItem>
        ]}
        
        {(userRole === 'admin' || userRole === 'trainer') && [
          <MenuItem key="start" onClick={() => {
            if (selectedEvent && onStartClass) {
              onStartClass(selectedEvent.classInstance.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Class</ListItemText>
          </MenuItem>,
          <MenuItem key="end" onClick={() => {
            if (selectedEvent && onEndClass) {
              onEndClass(selectedEvent.classInstance.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <StopIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>End Class</ListItemText>
          </MenuItem>,
          <MenuItem key="cancel" onClick={() => {
            if (selectedEvent && onCancelClass) {
              onCancelClass(selectedEvent.classInstance.id);
            }
            handleEventMenuClose();
          }}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel Class</ListItemText>
          </MenuItem>
        ]}
      </Menu>
    </Card>
  );
}