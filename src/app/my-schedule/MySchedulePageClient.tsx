// src/app/my-schedule/MySchedulePageClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Button,
  TextField,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import Layout from '@/app/components/layout/Layout';
import { SessionData } from '@/app/types';
import { ClassInstance, getClassTypeColor } from '@/app/types/class';

interface MySchedulePageClientProps {
  session: SessionData;
}

export default function MySchedulePageClient({ session }: MySchedulePageClientProps) {
  const [scheduleItems, setScheduleItems] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(weekStart, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return format(weekEnd, 'yyyy-MM-dd');
  });

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/my-schedule?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load schedule: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setScheduleItems(result.data.items || []);
      } else {
        throw new Error(result.error || 'Failed to load schedule');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'scheduled': return 'success';
      case 'ongoing': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const renderScheduleItem = (item: ClassInstance) => (
    <Card 
      key={item.id} 
      sx={{ 
        mb: 2, 
        borderLeft: `4px solid ${getClassTypeColor(item.classType)}`,
        '&:hover': { 
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {item.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {item.classType} with {item.instructorName}
            </Typography>
          </Box>
          
          <Chip 
            label={item.status.toUpperCase()} 
            color={getStatusColor(item.status)}
            size="small"
          />
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {format(parseISO(item.date), 'MMM dd, yyyy')}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {item.startTime} - {item.endTime}
              </Typography>
            </Box>
          </Grid>

          {item.location && (
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2">{item.location}</Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {item.registeredParticipants.length}/{item.maxParticipants} participants
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Chip 
            label={item.classType}
            size="small"
            sx={{ 
              backgroundColor: getClassTypeColor(item.classType),
              color: 'white',
              fontWeight: 600,
            }}
          />
          {session.role === 'trainer' && item.instructorId === session.uid && (
            <Chip 
              label="INSTRUCTOR"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, fontWeight: 600 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout session={session}>
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <CircularProgress size={60} />
            </Box>
          </Container>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout session={session}>
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              My Schedule
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {session.role === 'trainer' 
                ? 'Your teaching schedule and classes'
                : 'Your schedule and assigned classes'
              }
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    onClick={loadSchedule}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                    fullWidth
                  >
                    Refresh
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Schedule Items */}
          {scheduleItems.length > 0 ? (
            scheduleItems.map(renderScheduleItem)
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No schedule items found
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  {session.role === 'trainer' 
                    ? 'You have no classes scheduled for this period.'
                    : 'You have no scheduled classes for this period.'
                  }
                </Typography>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Layout>
  );
}