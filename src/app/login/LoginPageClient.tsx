// src/app/login/LoginPageClient.tsx
'use client';

import {
    Box,
    Card,
    CardContent,
    Typography,
    Container,
    Paper,
    Divider,
} from '@mui/material';
import {
    FitnessCenter as FitnessCenterIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import LoginForm from '@/app/components/forms/LoginForm';

export default function LoginPageClient() {
    // Dinamik yıl hesaplama
    const currentYear = new Date().getFullYear();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                px: 2,
                bgcolor: 'background.default',
                backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}
        >
            <Container maxWidth="sm">
                <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                    {/* Main Login Card */}
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            overflow: 'visible',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        <CardContent sx={{ p: 5 }}>
                            {/* Header */}
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 2,
                                        bgcolor: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 3,
                                        boxShadow: '0 4px 8px rgba(15, 92, 107, 0.25)',
                                    }}
                                >
                                    <FitnessCenterIcon sx={{ fontSize: 32, color: 'white' }} />
                                </Box>

                                <Typography
                                    variant="h5"
                                    component="h2"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        mb: 1,
                                        letterSpacing: '0.01em',
                                    }}
                                >
                                    Pacific MMA Academy Admin Panel
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 4 }} />

                            {/* Login Form */}
                            <LoginForm />

                            {/* Footer */}
                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.75rem',
                                        display: 'block',
                                        mb: 1,
                                    }}
                                >
                                    Having trouble signing in? Contact your administrator
                                </Typography>

                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    This system is for authorized staff only
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Copyright with Dynamic Year */}
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                            }}
                        >
                            © {currentYear} Pacific MMA Academy. All rights reserved.
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}