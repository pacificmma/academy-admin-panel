// src/app/login/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginForm from '@/app/components/forms/LoginForm';
import { Box, Card, CardContent, Typography, Container } from '@mui/material';

export default async function LoginPage() {
  // Check if user is already logged in
  const session = await getServerSession();
  
  if (session?.isActive) {
    // Redirect based on user role
    if (session.role === 'admin') {
      redirect('/dashboard');
    } else {
      redirect('/classes');
    }
  }

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
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 1,
                    letterSpacing: '0.02em',
                  }}
                >
                  PACIFIC MMA
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  Admin Login
                </Typography>
              </Box>

              {/* Login Form */}
              <LoginForm />

              {/* Footer Link */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                >
                  Having trouble signing in?{' '}
                  <Typography
                    component="span"
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      '&:hover': {
                        textDecoration: 'none',
                      },
                    }}
                  >
                    Contact your administrator.
                  </Typography>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Copyright */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              © 2024 Pacific MMA Academy. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}