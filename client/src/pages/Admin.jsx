import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  CardActionArea,
  CircularProgress
} from '@mui/material';
import { 
  RestaurantMenu, 
  People, 
  TableBar, 
  Settings,
  Analytics
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Admin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ tables: 0, users: 0, menuItems: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [tablesRes, usersRes, menuRes] = await Promise.all([
          axios.get('/api/tables', config),
          axios.get('/api/users', config),
          axios.get('/api/menu', config)
        ]);

        setStats({
          tables: tablesRes.data.length || 0,
          users: usersRes.data.length || 0,
          menuItems: menuRes.data.length || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const menuItems = [
    {
      title: 'Menu Management',
      description: 'Manage categories and menu items',
      icon: <RestaurantMenu sx={{ fontSize: 48 }} />,
      path: '/admin/menu',
      color: '#1976d2'
    },
    {
      title: 'User Management',
      description: 'Manage staff accounts and roles',
      icon: <People sx={{ fontSize: 48 }} />,
      path: '/admin/users',
      color: '#388e3c'
    },
    {
      title: 'Table Management',
      description: 'Configure restaurant tables',
      icon: <TableBar sx={{ fontSize: 48 }} />,
      path: '/admin/tables',
      color: '#f57c00'
    },
    {
      title: 'Reports',
      description: 'Sales analytics and insights',
      icon: <Analytics sx={{ fontSize: 48 }} />,
      path: '/admin/reports',
      color: '#0288d1'
    },
    {
      title: 'Settings',
      description: 'System configuration',
      icon: <Settings sx={{ fontSize: 48 }} />,
      path: '/admin/settings',
      color: '#7b1fa2'
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Admin Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your restaurant operations
      </Typography>

      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.path}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea 
                onClick={() => navigate(item.path)}
                sx={{ height: '100%', p: 2, textAlign: 'center' }}
              >
                <Box sx={{ color: item.color, mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Quick Stats</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total Tables</Typography>
                {loading ? <CircularProgress size={24} /> : <Typography variant="h4">{stats.tables}</Typography>}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Active Users</Typography>
                {loading ? <CircularProgress size={24} /> : <Typography variant="h4">{stats.users}</Typography>}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Menu Items</Typography>
                {loading ? <CircularProgress size={24} /> : <Typography variant="h4">{stats.menuItems}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Admin;
