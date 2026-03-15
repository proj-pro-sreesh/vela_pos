import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid,
  Card,
  CardContent,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { tableAPI } from '../../services/api';

const TableManagement = () => {
  const [tables, setTables] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTable, setEditTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tableNumber: '', capacity: 4 });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await tableAPI.getAll();
      setTables(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editTable) {
        await tableAPI.update(editTable._id, form);
      } else {
        await tableAPI.create(form);
      }
      setDialogOpen(false);
      setEditTable(null);
      setForm({ tableNumber: '', capacity: 4 });
      fetchTables();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this table?')) {
      try {
        await tableAPI.delete(id);
        fetchTables();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const openDialog = (table = null) => {
    if (table) {
      setEditTable(table);
      setForm({ tableNumber: table.tableNumber, capacity: table.capacity });
    } else {
      setEditTable(null);
      setForm({ tableNumber: '', capacity: 4 });
    }
    setDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'occupied': return 'warning';
      default: return 'default';
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Table Management</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={() => openDialog()}>
          Add Table
        </Button>
      </Box>

      {/* Visual Grid */}
      <Typography variant="h6" sx={{ mb: 2 }}>Floor Plan</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {tables.map(table => (
          <Grid item xs={6} sm={4} md={3} key={table._id}>
            <Card 
              sx={{ 
                textAlign: 'center',
                borderLeft: 4,
                borderColor: `${getStatusColor(table.status)}.main`
              }}
            >
              <CardContent>
                <Typography variant="h4">{table.tableNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {table.capacity} seats
                </Typography>
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {table.status}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table List */}
      <Typography variant="h6" sx={{ mb: 2 }}>Table List</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Table Number</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tables.map(table => (
              <TableRow key={table._id}>
                <TableCell>{table.tableNumber}</TableCell>
                <TableCell>{table.capacity} seats</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{table.status}</TableCell>
                <TableCell>
                  <IconButton onClick={() => openDialog(table)}><Edit /></IconButton>
                  <IconButton onClick={() => handleDelete(table._id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Table Number"
            value={form.tableNumber}
            onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
            sx={{ mt: 1, mb: 1 }}
          />
          <TextField
            fullWidth
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
            inputProps={{ min: 1 }}
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

export default TableManagement;
