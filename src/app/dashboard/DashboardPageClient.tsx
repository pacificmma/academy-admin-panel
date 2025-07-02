// src/app/dashboard/DashboardPageClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    CircularProgress,
    Alert,
    Chip,
    LinearProgress,
} from '@mui/material';
import {
    People as PeopleIcon,
    School as SchoolIcon,
    FitnessCenter as FitnessCenterIcon,
    PersonAdd as PersonAddIcon,
    LocalOffer as LocalOfferIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CardMembership as CardMembershipIcon,
    Discount as DiscountIcon,
    Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '../components/layout/Layout';
import { SessionData } from '../types';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalStaff: number;
  activeStaff: number;
  totalClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  totalMembershipPlans: number;
  activeMembershipPlans: number;
  totalDiscounts: number;
  activeDiscounts: number;
  totalParticipants: number;
  averageAttendance: number;
  lastUpdated: string;
  monthlyGrowth: {
    members: number;
    classes: number;
  };
}

interface DashboardPageClientProps {
    session: SessionData;
}

export default function DashboardPageClient({ session }: DashboardPageClientProps) {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch dashboard statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/dashboard/stats', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard statistics');
                }

                const result = await response.json();
                
                if (result.success) {
                    setStats(result.data);
                } else {
                    throw new Error(result.error || 'Failed to load statistics');
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
                setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statsCards = [
        {
            title: 'Total Members',
            value: stats?.totalMembers ?? 0,
            subtitle: `${stats?.activeMembers ?? 0} active`,
            icon: PeopleIcon,
            color: 'primary',
            bgColor: 'primary.50',
            growth: stats?.monthlyGrowth.members ?? 0,
            route: '/members',
        },
        {
            title: 'Active Classes',
            value: stats?.totalClasses ?? 0,
            subtitle: `${stats?.upcomingClasses ?? 0} upcoming`,
            icon: FitnessCenterIcon,
            color: 'secondary',
            bgColor: 'secondary.50',
            growth: stats?.monthlyGrowth.classes ?? 0,
            route: '/classes',
        },
        {
            title: 'Staff Members',
            value: stats?.totalStaff ?? 0,
            subtitle: `${stats?.activeStaff ?? 0} active`,
            icon: PersonAddIcon,
            color: 'warning',
            bgColor: 'warning.50',
            growth: 0, // Staff growth could be calculated if needed
            route: '/staff',
        },
        {
            title: 'Membership Plans',
            value: stats?.totalMembershipPlans ?? 0,
            subtitle: `${stats?.activeMembershipPlans ?? 0} active`,
            icon: CardMembershipIcon,
            color: 'success',
            bgColor: 'success.50',
            growth: 0,
            route: '/memberships',
        },
        {
            title: 'Discount Codes',
            value: stats?.totalDiscounts ?? 0,
            subtitle: `${stats?.activeDiscounts ?? 0} active`,
            icon: DiscountIcon,
            color: 'info',
            bgColor: 'info.50',
            growth: 0,
            route: '/discounts',
        },
        {
            title: 'Total Participants',
            value: stats?.totalParticipants ?? 0,
            subtitle: `${stats?.averageAttendance ?? 0}% avg attendance`,
            icon: AnalyticsIcon,
            color: 'purple',
            bgColor: '#f3e5f5',
            growth: 0,
            route: '/analytics',
        },
    ];

    const quickActions = [
        {
            title: 'Manage Staff',
            icon: PeopleIcon,
            route: '/staff',
            description: 'Add, edit, and manage staff members',
        },
        {
            title: 'View Members',
            icon: SchoolIcon,
            route: '/members',
            description: 'Manage member profiles and memberships',
        },
        {
            title: 'Manage Classes',
            icon: FitnessCenterIcon,
            route: '/classes',
            description: 'Schedule and organize training sessions',
        },
        {
            title: 'Memberships',
            icon: LocalOfferIcon,
            route: '/memberships',
            description: 'Configure membership plans and pricing',
        },
        {
            title: 'Discounts',
            icon: LocalOfferIcon,
            route: '/discounts',
            description: 'Create and manage discount codes',
        },
        {
            title: 'Analytics',
            icon: AnalyticsIcon,
            route: '/analytics',
            description: 'View detailed analytics and reports',
        },
    ];

    const formatGrowthIndicator = (growth: number) => {
        if (growth === 0) return null;
        
        const isPositive = growth > 0;
        const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;
        const color = isPositive ? 'success.main' : 'error.main';
        
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', color }}>
                <Icon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {Math.abs(growth)}%
                </Typography>
            </Box>
        );
    };

    const handleCardClick = (route: string) => {
        router.push(route);
    };

    const handleActionClick = (route: string) => {
        router.push(route);
    };

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

    if (error) {
        return (
            <Layout session={session}>
                <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
                    <Container maxWidth="xl">
                        <Alert severity="error" sx={{ mb: 4 }}>
                            {error}
                        </Alert>
                        <Button 
                            variant="contained" 
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </Container>
                </Box>
            </Layout>
        );
    }

    return (
        <Layout session={session}>
            <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 4 }}>
                <Container maxWidth="xl">
                    {/* Welcome Header */}
                    <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #0F5C6B 0%, #0F5C6B 100%)' }}>
                        <CardContent sx={{ p: 4, color: 'white' }}>
                            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'white' }}>
                                Welcome back, {session.fullName}!
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, color: 'white' }}>
                                Pacific MMA Academy Dashboard
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.8, color: 'white' }}>
                                Monitor member activity, staff schedules, and business metrics.
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {statsCards.map((stat, index) => (
                            <Grid item xs={12} sm={6} lg={4} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4,
                                        },
                                    }}
                                    onClick={() => handleCardClick(stat.route)}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 2,
                                                    bgcolor: stat.bgColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mr: 2,
                                                }}
                                            >
                                                <stat.icon sx={{ fontSize: 24, color: `${stat.color}.main` }} />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                    {stat.title}
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                    {loading ? '...' : stat.value.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {stat.subtitle}
                                            </Typography>
                                            {formatGrowthIndicator(stat.growth)}
                                        </Box>
                                        
                                        {/* Progress bar for certain metrics */}
                                        {stat.title === 'Total Participants' && stats && (
                                            <Box sx={{ mt: 2 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={Math.min(stats.averageAttendance, 100)} 
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Quick Actions */}
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                                Quick Actions
                            </Typography>

                            <Grid container spacing={3}>
                                {quickActions.map((action, index) => (
                                    <Grid item xs={12} sm={6} lg={4} key={index}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                height: '100%',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    boxShadow: 2,
                                                },
                                            }}
                                            onClick={() => handleActionClick(action.route)}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 2,
                                                            bgcolor: 'primary.50',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mr: 2,
                                                        }}
                                                    >
                                                        <action.icon sx={{ fontSize: 20, color: 'primary.main' }} />
                                                    </Box>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                                            {action.title}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {action.description}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ mt: 2 }}
                                                    fullWidth
                                                >
                                                    Access
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        </Layout>
    );
}