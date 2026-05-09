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
  TextField,
  FormControl,
  InputAdornment,
  Chip,
  Select,
  MenuItem as MuiMenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import { 
  Add, 
  Remove, 
  Delete, 
  ShoppingCart,
  Send,
  Print,
  Search,
  FavoriteBorder,
  Favorite,
  Storefront,
  TableBar,
  Payment
} from '@mui/icons-material';
import { menuAPI, orderAPI, tableAPI } from '../services/api';

const QuickOrderBill = () => {
  // Order state
  const [menuData, setMenuData] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' or 'takeaway'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });
  const [favoriteItems, setFavoriteItems] = useState(() => {
    const saved = localStorage.getItem('favoriteMenuItems');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Bill state
  const [completedOrder, setCompletedOrder] = useState(null);

   useEffect(() => {
      fetchData();
      // Load settings
      const savedSettings = localStorage.getItem('restaurantSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error('Failed to load settings');
        }
      }
    }, []);

    // Set default table for dine-in when no table is selected
    useEffect(() => {
      if (orderType === 'dine-in' && tables.length > 0 && !selectedTable) {
        setSelectedTable(tables[0]._id);
      }
    }, [orderType, tables, selectedTable]);

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

  // Cart functions
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

  const setQuantity = (itemId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      setCart(cart.filter(c => c._id !== itemId));
    } else {
      setCart(cart.map(c => 
        c._id === itemId ? { ...c, quantity: qty } : c
      ));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c._id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Favorite functions
  const toggleFavorite = (menuItem) => {
    setFavoriteItems(prev => {
      const exists = prev.find(item => item._id === menuItem._id);
      let newFavorites;
      if (exists) {
        newFavorites = prev.filter(item => item._id !== menuItem._id);
      } else {
        if (prev.length >= 10) {
          newFavorites = [...prev.slice(1), menuItem];
        } else {
          newFavorites = [...prev, menuItem];
        }
      }
      localStorage.setItem('favoriteMenuItems', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (itemId) => {
    return favoriteItems.some(item => item._id === itemId);
  };

  // Order submission
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (orderType === 'dine-in' && !selectedTable) {
      setError('Please select a table for dine-in orders');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
       const orderData = {
          items: cart.map(item => ({
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || ''
          })),
          subtotal: cartTotal,
          total: cartTotal,
          isTakeaway: orderType === 'takeaway',
          ...(orderType === 'dine-in' && { tableId: selectedTable })
        };

       const response = await orderAPI.create(orderData);
       const newOrder = { ...response.data, items: cart };
       
       // Process payment immediately
       const orderId = response.data._id || response.data.id;
       await orderAPI.processPayment(orderId, {
         paymentMethod,
         amountPaid: cartTotal
       });
       
       // Update order with payment info
       const paidOrder = { 
         ...newOrder, 
         paymentMethod, 
         amountPaid: cartTotal, 
         paidAt: new Date(),
         paymentStatus: 'paid'
       };
       
       setCompletedOrder(paidOrder);
       setSuccess('Order created and payment completed successfully!');
       setCart([]);
       setSelectedTable('');
       
       // Auto-print the bill
       setTimeout(() => {
         printBill(paidOrder);
         setSuccess('');
       }, 500);
     } catch (err) {
       setError(err.response?.data?.message || 'Failed to create order');
     } finally {
       setSubmitting(false);
     }
   };

  // Print bill
  const printBill = (order) => {
    const itemsList = order.items?.map((item, idx) => {
      const sn = String(idx + 1).padEnd(2);
      const name = (item.name + '       ').substring(0, 15).padEnd(15);
      const qty = String('' + item.quantity).padEnd(4);
      const price = ('   ' + item.price.toFixed(2)).slice(-7).padEnd(7);
      const amt = ('      ' + (item.price * item.quantity).toFixed(2)).slice(-8);
      return sn + name + '    ' + qty + ' ' + price + ' ' + amt;
    }).join('\n');
    
    const restaurantName = settings.restaurantName || 'VELA RESTAURANT';
    const restaurantAddress = settings.address || '';
    const restaurantPhone = settings.phone || '';
    const billHeader = settings.billHeaderEnglish || '';
    const billHeaderTamil = settings.billHeaderTamil || '';
    const billFooter = settings.billFooter || 'Thank you for visiting us!';
    const billFooterTamil = settings.billFooterTamil || '';
    
    const totalStr = ('      ' + order.total.toFixed(2)).slice(-8);
    
    const orderTypeLabel = order.isTakeaway ? 'Takeaway' : 'Table ' + (order.tableNumber || 'N/A');
    const paymentMethodLabel = order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH';
    const billContent = 
      "========================================\n" +
      "          " + restaurantName + "\n" +
      "========================================\n" +
      (restaurantAddress ? restaurantAddress + "\n" : "") +
      (restaurantPhone ? "Ph: " + restaurantPhone + "\n" : "") +
      "----------------------------------------\n" +
      (billHeader || billHeaderTamil ? 
        ((billHeader || '') + (billHeaderTamil ? "\n" + billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
      "Bill No: " + order.orderNumber + "\n" +
      "Type: " + orderTypeLabel + "\n" +
      "Payment: " + paymentMethodLabel + "\n" +
      "Date: " + new Date().toLocaleString() + "\n" +
      "----------------------------------------\n" +
      "#  ITEM             QTY    PRICE  AMOUNT\n" +
      "----------------------------------------\n" +
      itemsList + "\n" +
      "----------------------------------------\n" +
      "                 TOTAL:  Rs." + totalStr + "\n" +
      "========================================\n" +
      (billFooter || 'Thank you for visiting us!') + (billFooterTamil ? "\n" + billFooterTamil : "");
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    const billWidth = settings.billWidth || 72;
    const billHeight = settings.billHeight || 210;
    const widthCm = billWidth * 0.1;
    const heightCm = billHeight * 0.1;
    
    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Bill - ${order.orderNumber}</title>
          <style>
            @page {
              size: ${widthCm}cm ${heightCm}cm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 5px;
              font-family: monospace;
              font-size: 12px;
              width: ${widthCm}cm;
              height: ${heightCm}cm;
            }
            @media print {
              body {
                width: ${widthCm}cm;
                height: ${heightCm}cm;
              }
            }
          </style>
        </head>
        <body>
          <pre style="font-family: monospace; font-size: 12px;">${billContent}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    iframeDoc.close();
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
              {/* Order Type Selection */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={orderType === 'dine-in' ? 'contained' : 'outlined'}
                  startIcon={<TableBar />}
                  onClick={() => setOrderType('dine-in')}
                  size="small"
                >
                  Dine In
                </Button>
                <Button
                  variant={orderType === 'takeaway' ? 'contained' : 'outlined'}
                  startIcon={<Storefront />}
                  onClick={() => setOrderType('takeaway')}
                  size="small"
                >
                  Takeaway
                </Button>
              </Box>

              {/* Table Selection - Only show for dine-in */}
              {orderType === 'dine-in' && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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
              )}

              {/* Payment Method Selection */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MuiMenuItem value="cash">Cash</MuiMenuItem>
                  <MuiMenuItem value="card">Card</MuiMenuItem>
                  <MuiMenuItem value="upi">UPI</MuiMenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
                <input
                  type="text"
                  placeholder="Search or add favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }}
                />
              </Box>
              
              {!searchQuery && favoriteItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>⭐ Favorites:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[...favoriteItems].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10).map((item, index) => (
                      <Chip 
                        key={index} 
                        label={item.name} 
                        onClick={() => addToCart(item)} 
                        onDelete={() => toggleFavorite(item)}
                        deleteIcon={<Favorite />}
                        sx={{ cursor: 'pointer', bgcolor: '#fff3e0', '&:hover': { bgcolor: '#ffe0b2' } }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
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
                           <CardContent sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1.5 } }}>
                             <Box sx={{ flex: 1, overflow: 'hidden' }}>
                               <Typography variant="body2" fontWeight="bold" noWrap>{item.name}</Typography>
                               <Typography variant="body2" color="primary" fontWeight="bold">Rs. {item.price}</Typography>
                             </Box>
                             <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                               {isFavorite(item._id) ? <Favorite sx={{ color: '#f44336' }} /> : <FavoriteBorder />}
                             </IconButton>
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
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, bgcolor: 'primary.main', color: 'white', p: 1, borderRadius: 1 }}>
                    All Items
                  </Typography>
                  <Box sx={{ height: '400px', overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Grid container spacing={1}>
                      {menuData.flatMap(category => category.items).map(item => (
                        <Grid item xs={6} sm={4} md={3} key={item._id}>
                          <Card 
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, opacity: item.isAvailable ? 1 : 0.5 }}
                            onClick={() => item.isAvailable && addToCart(item)}
                          >
                            <CardContent sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1.5 } }}>
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography variant="body2" fontWeight="bold" noWrap>{item.name}</Typography>
                                <Typography variant="body2" color="primary" fontWeight="bold">Rs. {item.price}</Typography>
                              </Box>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                                {isFavorite(item._id) ? <Favorite sx={{ color: '#f44336' }} /> : <FavoriteBorder />}
                              </IconButton>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              )}
          </Grid>

           <Grid item xs={12} md={4}>
             <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
               <CardContent sx={{ pb: 1 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                   <ShoppingCart fontSize="medium" />
                   <Typography variant="h6" sx={{ flexGrow: 1 }}>Current Order</Typography>
                   <Chip label={cart.length} size="small" color="primary" sx={{ height: 32 }} />
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
                          <TextField
                            size="small"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item._id, e.target.value)}
                            onBlur={(e) => {
                              const qty = parseInt(e.target.value, 10);
                              if (isNaN(qty) || qty < 1) {
                                setQuantity(item._id, 1);
                              }
                            }}
                            inputProps={{ 
                              style: { textAlign: 'center', padding: '4px 2px' },
                              min: 1,
                              type: 'number'
                            }}
                            sx={{ 
                              width: 50,
                              '& .MuiInputBase-root': {
                                fontSize: '0.875rem',
                              }
                            }}
                          />
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
                  disabled={cart.length === 0 || submitting}
                  onClick={handleSubmitOrder}
                  startIcon={<Send />}
                >
                  {submitting ? 'Processing...' : 'Create Order & Generate Bill'}
                </Button>
               </CardContent>
             </Card>
           </Grid>
         </Grid>
   </Box>
  );
};

export default QuickOrderBill;