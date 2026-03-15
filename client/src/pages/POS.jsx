import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem as MuiMenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { 
  Add, 
  Remove, 
  Delete, 
  ShoppingCart,
  Send,
  Print,
  Search
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { menuAPI, tableAPI, orderAPI } from '../services/api';

const POS = () => {
  const [searchParams] = useSearchParams();
  const [menuData, setMenuData] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(searchParams.get('tableId') || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        menuAPI.getGrouped(),
        tableAPI.getAll()
      ]);
      setMenuData(menuRes.data);
      setTables(tablesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c._id === item._id);
    if (existing) {
      setCart(cart.map(c => 
        c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(c => {
      if (c._id === itemId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c._id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        tableId: selectedTable,
        items: cart.map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        subtotal: cartTotal,
        total: cartTotal
      };

      const response = await orderAPI.create(orderData);
      setLastOrder({ ...response.data, items: cart });
      setSuccess('Order placed successfully!');
      setCart([]);
      setSelectedTable('');
      
      const tablesRes = await tableAPI.getAll();
      setTables(tablesRes.data);
      
      setTimeout(() => {
        setPrintDialogOpen(true);
        setSuccess('');
      }, 500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Typography>Loading menu...</Typography>;
  }

  const getAllMatchingItems = () => {
    if (!searchQuery) return [];
    return menuData.flatMap(category => 
      category.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
  };

  const allSearchResults = getAllMatchingItems();

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid item xs={12} md={8} sx={{ overflow: 'auto', pr: 1 }}>
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Table</InputLabel>
              <Select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                label="Select Table"
              >
                {tables.map(table => (
                  <MuiMenuItem key={table._id} value={table._id}>
                    Table {table.tableNumber} ({table.status})
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
              <Search sx={{ color: 'text.secondary', mr: 1 }} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }}
              />
            </Box>
          </Box>

          {searchQuery ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, bgcolor: 'primary.main', color: 'white', p: 1, borderRadius: 1 }}>
                Search Results ({allSearchResults.length})
              </Typography>
              {allSearchResults.length > 0 ? (
                <Grid container spacing={1}>
                  {allSearchResults.map(item => (
                    <Grid item xs={6} sm={4} md={3} key={item._id}>
                      <Card 
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, opacity: item.isAvailable ? 1 : 0.5 }}
                        onClick={() => item.isAvailable && addToCart(item)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" fontWeight="bold" noWrap>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>{item.description}</Typography>
                          <Typography variant="body2" color="primary" fontWeight="bold">Rs. {item.price}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No items found</Typography>
              )}
            </Box>
          ) : (
            menuData.map((category) => (
              <Box key={category._id} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, bgcolor: 'primary.main', color: 'white', p: 1, borderRadius: 1 }}>
                  {category.name}
                </Typography>
                <Grid container spacing={1}>
                  {category.items.map(item => (
                    <Grid item xs={6} sm={4} md={3} key={item._id}>
                      <Card 
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, opacity: item.isAvailable ? 1 : 0.5 }}
                        onClick={() => item.isAvailable && addToCart(item)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" fontWeight="bold" noWrap>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>{item.description}</Typography>
                          <Typography variant="body2" color="primary" fontWeight="bold">Rs. {item.price}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ShoppingCart />
                <Typography variant="h6">Current Order</Typography>
                <Chip label={cart.length} size="small" color="primary" />
              </Box>

              <Divider sx={{ my: 1 }} />

              <List sx={{ flex: 1, overflow: 'auto', maxHeight: 300 }}>
                {cart.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="Cart is empty" secondary="Add items from the menu" />
                  </ListItem>
                ) : (
                  cart.map(item => (
                    <ListItem key={item._id} sx={{ px: 0 }}>
                      <ListItemText primary={item.name} secondary={"Rs. " + item.price + " each"} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => updateQuantity(item._id, -1)}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item._id, 1)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                      <ListItemSecondaryAction>
                        <Typography variant="body2" fontWeight="bold" sx={{ ml: 1 }}>Rs. {(item.price * item.quantity).toFixed(2)}</Typography>
                        <IconButton edge="end" size="small" onClick={() => removeFromCart(item._id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>

              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">Rs. {cartTotal.toFixed(2)}</Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={cart.length === 0 || !selectedTable || submitting}
                onClick={handleSubmitOrder}
                startIcon={<Send />}
              >
                {submitting ? 'Processing...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Order Bill</DialogTitle>
        <DialogContent>
          {lastOrder && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>{settings.restaurantName || 'VELA RESTAURANT'}</Typography>
              {settings.billHeaderEnglish && <Typography variant="body2" align="center" gutterBottom>{settings.billHeaderEnglish}</Typography>}
              {settings.billHeaderTamil && <Typography variant="body2" align="center" gutterBottom sx={{ fontFamily: 'Noto Sans Tamil, sans-serif' }}>{settings.billHeaderTamil}</Typography>}
              <Divider sx={{ my: 1 }} />
              <Typography>Order No: {lastOrder.orderNumber}</Typography>
              <Typography>Table: {lastOrder.table?.tableNumber || 'N/A'}</Typography>
              <Typography>Date: {new Date(lastOrder.createdAt).toLocaleString()}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Items:</Typography>
              {lastOrder.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{item.name} x{item.quantity}</Typography>
                  <Typography>Rs. {item.price * item.quantity}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">Rs. {cartTotal}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              {settings.billFooter && <Typography variant="body2" align="center" gutterBottom>{settings.billFooter}</Typography>}
              {settings.billFooterTamil && <Typography variant="body2" align="center" gutterBottom sx={{ fontFamily: 'Noto Sans Tamil, sans-serif' }}>{settings.billFooterTamil}</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { window.print(); setPrintDialogOpen(false); }} startIcon={<Print />} variant="contained">Print</Button>
          <Button onClick={() => setPrintDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POS;
