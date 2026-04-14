import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { userAPI } from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'waiter' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (showLoading = true) => {
    try {
      setLoading(showLoading);
      setError(null);
      const res = await userAPI.getAll();
      setUsers(res.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editUser) {
        const { password, ...data } = form;
        await userAPI.update(editUser._id, password ? { ...data, password } : data);
      } else {
        await userAPI.create(form);
      }
      setDialogOpen(false);
      setEditUser(null);
      setForm({ username: '', password: '', name: '', role: 'waiter' });
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id, role) => {
    if (role === 'admin') {
      alert('Admin user cannot be deleted.');
      return;
    }
    if (confirm('Delete this user?')) {
      try {
        await userAPI.delete(id);
        fetchUsers();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleReactivate = async (id) => {
    if (confirm('Reactivate this user?')) {
      try {
        await userAPI.reactivate(id);
        fetchUsers();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const openDialog = (user = null) => {
    if (user) {
      // Prevent editing admin user
      if (user.username === 'admin') {
        alert('Admin user cannot be edited. Only password can be reset.');
        return;
      }
      setEditUser(user);
      setForm({ username: user.username, password: '', name: user.name, role: user.role });
    } else {
      setEditUser(null);
      setForm({ username: '', password: '', name: '', role: 'waiter' });
    }
    setDialogOpen(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'biller': return 'info';
      default: return 'default';
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">User Management</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={() => fetchUsers()} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => openDialog()}>
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
          <Button size="small" onClick={() => fetchUsers()}>Retry</Button>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                </TableCell>
                <TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  {user.username !== 'admin' ? (
                    <IconButton onClick={() => openDialog(user)}><Edit /></IconButton>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Protected</Typography>
                  )}
                  {user.username !== 'admin' && (
                    <>
                      <IconButton onClick={() => handleDelete(user._id, user.role)}><Delete /></IconButton>
                      {!user.isActive && (
                        <IconButton onClick={() => handleReactivate(user._id)}><Refresh /></IconButton>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            sx={{ mt: 1, mb: 1 }}
          />
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mb: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 1 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={form.role}
              label="Role"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="waiter">Waiter</MenuItem>
              <MenuItem value="biller">Biller</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={editUser ? 'New Password (leave blank to keep)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
