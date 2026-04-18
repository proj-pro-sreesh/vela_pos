import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Switch, 
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Grid,
  IconButton
} from '@mui/material';
import { Save, Refresh } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    restaurantName: 'Vela Restaurant',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    paymentSummary: '',
    billHeaderEnglish: '',
    billHeaderTamil: '',
    billFooter: 'Thank you for visiting us!',
    billFooterTamil: 'எங்களை வருகை தந்ததற்கு நன்றி!',
    billWidth: 72,
    billHeight: 210,
    autoRefresh: true,
    refreshInterval: 30,
    soundAlerts: true
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSwitchChange = (name) => (e) => {
    setSettings(prev => ({
      ...prev,
      [name]: e.target.checked
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate save - in production, this would call an API
    setTimeout(() => {
      setLoading(false);
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      // Store in localStorage for persistence
      localStorage.setItem('restaurantSettings', JSON.stringify(settings));
    }, 500);
  };

  const handleReset = () => {
    const defaults = {
      restaurantName: 'Vela Restaurant',
      address: '',
      phone: '',
      email: '',
      currency: 'INR',
      paymentSummary: '',
      billHeaderEnglish: '',
      billHeaderTamil: '',
      billFooter: 'Thank you for visiting us!',
      billFooterTamil: 'எங்களை வருகை தந்ததற்கு நன்றி!',
      billWidth: 72,
      billHeight: 210,
      autoRefresh: true,
      refreshInterval: 30,
      soundAlerts: true
    };
    setSettings(defaults);
    setSnackbar({ open: true, message: 'Settings reset to defaults', severity: 'info' });
  };

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('restaurantSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings');
      }
    }
  }, []);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Settings</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure your restaurant system settings
      </Typography>

      <Grid container spacing={3}>
        {/* Restaurant Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Restaurant Information</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TextField
                fullWidth
                label="Restaurant Name"
                name="restaurantName"
                value={settings.restaurantName}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={settings.address}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={settings.email}
                onChange={handleChange}
                margin="normal"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Display Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Display Settings</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.autoRefresh} 
                    onChange={handleSwitchChange('autoRefresh')}
                    name="autoRefresh"
                  />
                }
                label="Auto-refresh data"
              />
              <TextField
                fullWidth
                label="Refresh Interval (seconds)"
                name="refreshInterval"
                type="number"
                value={settings.refreshInterval}
                onChange={handleChange}
                margin="normal"
                disabled={!settings.autoRefresh}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Billing Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Billing Settings</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TextField
                fullWidth
                label="Currency"
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                margin="normal"
                select
                SelectProps={{ native: true }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </TextField>
              <TextField
                fullWidth
                label="Payment Summary (UPI, Cash, Card)"
                name="paymentSummary"
                value={settings.paymentSummary}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                placeholder="e.g., UPI: restaurant@upi, Cash, Card"
              />
              <TextField
                fullWidth
                label="Bill Header Message (English)"
                name="billHeaderEnglish"
                value={settings.billHeaderEnglish}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                placeholder="Enter bill header message in English"
              />
              <TextField
                fullWidth
                label="Bill Header Message (Tamil)"
                name="billHeaderTamil"
                value={settings.billHeaderTamil}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                placeholder="தலைப்பு செய்தியை தமிழில் உள்ளிடவும்"
              />
              <TextField
                fullWidth
                label="Bill Footer Message (English)"
                name="billFooter"
                value={settings.billFooter}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Bill Footer Message (Tamil)"
                name="billFooterTamil"
                value={settings.billFooterTamil}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                placeholder="அடிக்கு செய்தியை தமிழில் உள்ளிடவும்"
              />
              <TextField
                fullWidth
                label="Bill Size (mm)"
                name="billSize"
                value={`${settings.billWidth} x ${settings.billHeight} mm`}
                margin="normal"
                disabled
                helperText="Thermal paper size (72x210mm = 3 inch x 8.3 inch roll)"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Notifications</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.soundAlerts} 
                    onChange={handleSwitchChange('soundAlerts')}
                    name="soundAlerts"
                  />
                }
                label="Sound alerts"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<Save />}
          onClick={handleSave}
          disabled={loading}
          size="large"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />}
          onClick={handleReset}
          size="large"
        >
          Reset to Defaults
        </Button>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
