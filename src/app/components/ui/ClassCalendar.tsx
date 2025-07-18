// src/app/components/ui/ClassCalendar.tsx - FIXED VERSION
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
import { ClassInstance, getClassTypeColor } from '../../types/class';

interface ClassCalendarProps {
  instances: ClassInstance[];
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  onInstanceClick?: (instance: ClassInstance) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
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
  viewMode,
  onViewModeChange,
  onInstanceClick,
  onDateClick,
  selectedDate = new Date(),
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
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  };

  const getVisibleEvents = () => {
    const { start, end } = getDateRange();
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= start && eventDate <= end;
    });
  };

  const handleEventClick = (event: CalendarEvent, mouseEvent: React.MouseEvent) => {
    mouseEvent.stopPropagation();
    if (onInstanceClick) {
      onInstanceClick(event.classInstance);
    }
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'day') {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      const { start, end } = getDateRange();
      return `${start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} - ${end.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  };

  const visibleEvents = getVisibleEvents();

  return (
    <Box>
      {/* Calendar Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateDate('prev')}>
            <ChevronLeftIcon />
          </IconButton>
          <Button onClick={() => navigateDate('today')} startIcon={<TodayIcon />}>
            Today
          </Button>
          <IconButton onClick={() => navigateDate('next')}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* Current Date/Range */}
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
          {formatDate(currentDate)}
        </Typography>

        {/* View Mode Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant={viewMode === 'day' ? 'contained' : 'outlined'}
            onClick={() => onViewModeChange('day')}
            startIcon={<DayIcon />}
          >
            Day
          </Button>
          <Button
            size="small"
            variant={viewMode === 'week' ? 'contained' : 'outlined'}
            onClick={() => onViewModeChange('week')}
            startIcon={<WeekIcon />}
          >
            Week
          </Button>
          <Button
            size="small"
            variant={viewMode === 'month' ? 'contained' : 'outlined'}
            onClick={() => onViewModeChange('month')}
            startIcon={<MonthIcon />}
          >
            Month
          </Button>
        </Box>
      </Box>

      {/* Calendar Content */}
      <Box sx={{ minHeight: 400 }}>
        {visibleEvents.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 200,
              color: 'text.secondary'
            }}
          >
            <Typography>No classes scheduled for this period</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {visibleEvents.map((event) => (
              <Card 
                key={event.id}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
                onClick={(e) => handleEventClick(event, e)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {event.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric' 
                        })} • {event.startTime} - {event.endTime}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Instructor: {event.classInstance.instructorName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.classInstance.registeredParticipants?.length || 0}/{event.classInstance.maxParticipants} enrolled
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
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
                          event.classInstance.status === 'scheduled' ? 'primary' :
                          event.classInstance.status === 'ongoing' ? 'warning' :
                          event.classInstance.status === 'completed' ? 'success' :
                          'error'
                        }
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}