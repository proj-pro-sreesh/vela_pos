import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Restaurant,
  ArrowBack
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Forgot password states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: enter email, 2: enter code and new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(username, password);
      
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'waiter':
          navigate('/waiter');
          break;
        case 'biller':
          navigate('/biller');
          break;
        default:
          navigate('/tables');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handlers
  const handleOpenForgotPassword = () => {
    setForgotPasswordOpen(true);
    setResetStep(1);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
    setGeneratedCode('');
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setResetStep(1);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
    setGeneratedCode('');
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: resetEmail
      });
      
      // For demo purposes, show the code if email not configured
      if (response.data.resetCode) {
        setGeneratedCode(response.data.resetCode);
      }
      setResetStep(2);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to generate reset code');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters');
      return;
    }

    setResetLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: resetEmail,
        resetCode: resetCode,
        newPassword: newPassword
      });
      
      setResetSuccess(true);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Restaurant sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Vela POS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Restaurant Management System
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              autoComplete="username"
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleOpenForgotPassword}
                sx={{ cursor: 'pointer' }}
              >
                Forgot Password?
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={handleCloseForgotPassword} maxWidth="xs" fullWidth>
        <DialogTitle>
          {resetSuccess ? 'Password Reset' : resetStep === 1 ? 'Reset Password' : 'Enter Reset Code'}
        </DialogTitle>
        <DialogContent>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          )}
          
          {resetSuccess ? (
            <Alert severity="success">
              Your password has been reset successfully. You can now login with your new password.
            </Alert>
          ) : resetStep === 1 ? (
            <form onSubmit={handleRequestResetCode}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your email address to request a password reset code.
              </Typography>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                margin="normal"
                required
                autoFocus
              />
              {generatedCode && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Reset Code: <strong>{generatedCode}</strong>
                  <Typography variant="caption" display="block">
                    (Email not configured - using demo mode)
                  </Typography>
                </Alert>
              )}
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the reset code sent to your email and create a new password.
              </Typography>
              <TextField
                fullWidth
                label="Reset Code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                margin="normal"
                required
                autoFocus
                inputProps={{ maxLength: 6, style: { textTransform: 'uppercase' } }}
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
              />
            </form>
          )}
        </DialogContent>
        <DialogActions>
          {resetStep === 2 && !resetSuccess && (
            <Button onClick={() => setResetStep(1)} startIcon={<ArrowBack />}>
              Back
            </Button>
          )}
          <Button onClick={handleCloseForgotPassword}>
            {resetSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!resetSuccess && (
            <Button
              onClick={resetStep === 1 ? handleRequestResetCode : handleResetPassword}
              variant="contained"
              disabled={resetLoading}
            >
              {resetLoading ? <CircularProgress size={24} /> : resetStep === 1 ? 'Send Code' : 'Reset Password'}
            </Button>
          )}
          {resetSuccess && (
            <Button onClick={handleCloseForgotPassword} variant="contained">
              Back to Login
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
