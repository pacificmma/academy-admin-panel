// src/app/dashboard/DashboardPageClient.tsx
'use client';

import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Typography,
    Paper,
    Card,
    CardContent,
    Button,
    Grid,
    Avatar,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    School as SchoolIcon,
    FitnessCenter as FitnessCenterIcon,
    AttachMoney as MoneyIcon,
    PersonAdd as PersonAddIcon,
    LocalOffer as LocalOfferIcon,
    Schedule as ScheduleIcon,
    CalendarToday as CalendarIcon,
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import LogoutButton from '../components/ui/LogoutButton';
import { SessionData } from '../types';
import Layout from '../components/layout/Layout';

interface DashboardPageClientProps {
    session: SessionData;
}

export default function DashboardPageClient({ session }: DashboardPageClientProps) {
    const statsCards = [
        {
            title: 'Total Members',
            value: '--',
            icon: PeopleIcon,
            color: 'primary',
            bgColor: 'primary.50',
        },
        {
            title: 'Active Classes',
            value: '--',
            icon: FitnessCenterIcon,
            color: 'secondary',
            bgColor: 'secondary.50',
        },
        {
            title: 'Staff Members',
            value: '--',
            icon: PersonAddIcon,
            color: 'warning',
            bgColor: 'warning.50',
        },
    ];

    const quickActions = [
        {
            title: 'Manage Staff',
            icon: PeopleIcon,
            href: '/staff',
            description: 'Add, edit, and manage staff members',
        },
        {
            title: 'View Members',
            icon: SchoolIcon,
            href: '/members',
            description: 'Manage member profiles and memberships',
        },
        {
            title: 'Manage Classes',
            icon: FitnessCenterIcon,
            href: '/classes',
            description: 'Schedule and organize training sessions',
        },
        {
            title: 'Memberships',
            icon: LocalOfferIcon,
            href: '/memberships',
            description: 'Configure membership plans and pricing',
        },
        {
            title: 'Discounts',
            icon: LocalOfferIcon,
            href: '/discounts',
            description: 'Create and manage discount codes',
        },
        {
            title: 'My Schedule',
            icon: ScheduleIcon,
            href: '/my-schedule',
            description: 'View your personal training schedule',
        },
    ];

    return (
        <Layout session={session} title="Dashboard">
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
                {/* Main Content */}
                <Container maxWidth="xl" sx={{ py: 4 }}>
                    {/* Welcome Section */}
                    <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #0F5C6B 0%, #2e6f8c 100%)' }}>
                        <CardContent sx={{ p: 4, color: 'white' }}>
                            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, color: 'white' }}>
                                Dashboard
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, color: 'white' }}>
                                Welcome to the Pacific MMA Academy admin panel
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.8, color: 'white' }}>
                                Manage your gym operations from here. Monitor member activity, staff schedules, and business metrics.
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {statsCards.map((stat, index) => (
                            <Grid item xs={12} sm={6} lg={3} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4,
                                        },
                                    }}
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
                                                    {stat.value}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                                            <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                Loading...
                                            </Typography>
                                        </Box>
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
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: 3,
                                                    borderColor: 'primary.main',
                                                },
                                            }}
                                            onClick={() => window.location.href = action.href}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1.5,
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