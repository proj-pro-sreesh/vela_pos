import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Save 
} from '@mui/icons-material';
import { categoryAPI, menuAPI } from '../../services/api';

const MenuManagement = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [editMenuItem, setEditMenuItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', displayOrder: 0 });
  const [menuItemForm, setMenuItemForm] = useState({
    name: '', description: '', price: '', category: '', isAvailable: true, prepTime: 15
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, menuRes] = await Promise.all([
        categoryAPI.getAllAdmin(),
        menuAPI.getAllAdmin()
      ]);
      setCategories(catRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editCategory) {
        await categoryAPI.update(editCategory._id, categoryForm);
      } else {
        await categoryAPI.create(categoryForm);
      }
      setCategoryDialogOpen(false);
      setEditCategory(null);
      setCategoryForm({ name: '', description: '', displayOrder: 0 });
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('Delete this category?')) {
      try {
        await categoryAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleSaveMenuItem = async () => {
    try {
      const data = { ...menuItemForm, price: parseFloat(menuItemForm.price) };
      if (editMenuItem) {
        await menuAPI.update(editMenuItem._id, data);
      } else {
        await menuAPI.create(data);
      }
      setMenuItemDialogOpen(false);
      setEditMenuItem(null);
      setMenuItemForm({ name: '', description: '', price: '', category: '', isAvailable: true, prepTime: 15 });
      fetchData();
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await menuAPI.toggleAvailability(item._id);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (confirm('Delete this menu item?')) {
      try {
        await menuAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const openCategoryDialog = (cat = null) => {
    if (cat) {
      setEditCategory(cat);
      setCategoryForm({ name: cat.name, description: cat.description, displayOrder: cat.displayOrder });
    } else {
      setEditCategory(null);
      setCategoryForm({ name: '', description: '', displayOrder: 0 });
    }
    setCategoryDialogOpen(true);
  };

  const openMenuItemDialog = (item = null) => {
    if (item) {
      setEditMenuItem(item);
      setMenuItemForm({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category?._id || item.category,
        isAvailable: item.isAvailable,
        prepTime: item.prepTime
      });
    } else {
      setEditMenuItem(null);
      setMenuItemForm({ name: '', description: '', price: '', category: '', isAvailable: true, prepTime: 15 });
    }
    setMenuItemDialogOpen(true);
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Menu Management</Typography>
      </Box>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
        <Tab label="Categories" />
        <Tab label="Menu Items" />
      </Tabs>

      {currentTab === 0 && (
        <Box>
          <Button 
            startIcon={<Add />} 
            variant="contained" 
            onClick={() => openCategoryDialog()}
            sx={{ mb: 2 }}
          >
            Add Category
          </Button>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat._id}>
                    <TableCell>{cat.displayOrder}</TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.description}</TableCell>
                    <TableCell>{cat.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openCategoryDialog(cat)}><Edit /></IconButton>
                      <IconButton onClick={() => handleDeleteCategory(cat._id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {currentTab === 1 && (
        <Box>
          <Button 
            startIcon={<Add />} 
            variant="contained" 
            onClick={() => openMenuItemDialog()}
            sx={{ mb: 2 }}
          >
            Add Menu Item
          </Button>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Prep Time</TableCell>
                  <TableCell>Available</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {menuItems.map(item => (
                  <TableRow key={item._id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category?.name}</TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell>{item.prepTime} min</TableCell>
                    <TableCell>
                      <Switch 
                        checked={item.isAvailable} 
                        onChange={() => handleToggleAvailability(item)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openMenuItemDialog(item)}><Edit /></IconButton>
                      <IconButton onClick={() => handleDeleteMenuItem(item._id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>{editCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            sx={{ mt: 1, mb: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            label="Display Order"
            type="number"
            value={categoryForm.displayOrder}
            onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Menu Item Dialog */}
      <Dialog open={menuItemDialogOpen} onClose={() => setMenuItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={menuItemForm.name}
            onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
            sx={{ mt: 1, mb: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={menuItemForm.description}
            onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            label="Price"
            type="number"
            value={menuItemForm.price}
            onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            select
            label="Category"
            value={menuItemForm.category}
            onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value })}
            sx={{ mb: 1 }}
          >
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Prep Time (minutes)"
            type="number"
            value={menuItemForm.prepTime}
            onChange={(e) => setMenuItemForm({ ...menuItemForm, prepTime: parseInt(e.target.value) })}
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={menuItemForm.isAvailable}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, isAvailable: e.target.checked })}
              />
            }
            label="Available"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuItemDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveMenuItem}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuManagement;
