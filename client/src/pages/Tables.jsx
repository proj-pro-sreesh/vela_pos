import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, Tab, Tabs, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider,
  FormControl, InputLabel, Select, Alert
} from '@mui/material';
import { 
  Delete, Print, Person, LocalShipping, ShoppingCart, Edit, Search, Receipt, Star, FavoriteBorder, Favorite 
} from '@mui/icons-material';
import { tableAPI, orderAPI, menuAPI, reportAPI } from '../services/api';

const statusColors = {
  available: 'success',
  occupied: 'error',
  reserved: 'warning'
};

export default function Tables() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState({});
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [orderItems, setOrderItems] = useState([]);
  const [takeawayName, setTakeawayName] = useState('');
  const [categories, setCategories] = useState([]);
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOrderItems, setEditingOrderItems] = useState([]);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [editMenuSearchQuery, setEditMenuSearchQuery] = useState('');
  const [popularItems, setPopularItems] = useState([]);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [billLoading, setBillLoading] = useState(false);
  const [showBillPrinted, setShowBillPrinted] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });
  const [favoriteItems, setFavoriteItems] = useState(() => {
    const saved = localStorage.getItem('favoriteMenuItems');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchTables();
    fetchActiveOrders();
    fetchPopularItems();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tableAPI.getWithOrders();
      setTables(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setLoading(false);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      const response = await reportAPI.getPopularItems({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      setPopularItems(response.data || []);
    } catch (error) {
      console.error('Error fetching popular items:', error);
    }
  };

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

  const fetchActiveOrders = async () => {
    try {
      const response = await orderAPI.getActive();
      const ordersData = response.data;
      const ordersByTable = {};
      const takeawayArray = [];
      ordersData.forEach(order => {
        const tableRef = order.table;
        const tableId = tableRef?._id ? String(tableRef._id) : (order.tableId ? String(order.tableId) : null);
        const isTakeaway = order.isTakeaway || order.customerName === 'Takeaway' || order.customerName === 'takeaway';
        if (tableId && !isTakeaway) {
          ordersByTable[tableId] = order;
        } else if (isTakeaway) {
          takeawayArray.push(order);
        }
      });
      setOrders(ordersByTable);
      setTakeawayOrders(takeawayArray);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await menuAPI.getAll();
      setMenuItems(response.data);
      // Extract categories from menu items
      const itemCategories = [...new Set(response.data.map(item => {
        if (typeof item.category === 'string') return item.category;
        if (item.category && typeof item.category === 'object') return item.category.name;
        return null;
      }).filter(Boolean))];
      
      // Also fetch categories from API to have a complete list
      let apiCategories = [];
      try {
        const catResponse = await fetch('http://localhost:5000/api/categories', {
          headers: { 'Authorization': localStorage.getItem('token') }
        });
        if (catResponse.ok) {
          const catData = await catResponse.json();
          apiCategories = catData.map(c => c.name);
        }
      } catch (e) {
        console.log('Could not fetch categories:', e);
      }
      
      // Use API categories if item categories is empty, otherwise use item categories
      const uniqueCategories = itemCategories.length > 0 ? itemCategories : apiCategories;
      setCategories(uniqueCategories.length > 0 ? uniqueCategories : ['All']);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const getTableOrders = (tableId) => {
    const key = String(tableId);
    return orders[key] || orders[String(tableId)] || orders[Number(tableId)] || null;
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  async function handleTableClick(table) {
    setSelectedTable(table);
    if (table.status === 'available' || table.status === 'occupied') {
      await fetchMenuItems();
      const tableId = String(table.id || table._id);
      const existingOrder = getTableOrders(tableId);
      if (existingOrder && existingOrder.items) {
        setOrderItems(existingOrder.items.map(item => ({
          id: item.menuItem || item.menuItemId || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })));
      }
      setOrderDialogOpen(true);
    }
  }

  async function handlePlaceOrder(isTakeaway = false) {
    if (orderItems.length === 0) return;
    try {
      const tableId = String(selectedTable?.id || selectedTable?._id);
      const existingOrder = getTableOrders(tableId);
      if (existingOrder && !isTakeaway) {
        const orderId = existingOrder._id || existingOrder.id;
        const updatedItems = orderItems.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }));
        await orderAPI.update(orderId, {
          items: updatedItems,
          subtotal: calculateTotal(),
          total: calculateTotal()
        });
        await tableAPI.update(tableId, { status: 'occupied' });
      } else {
        const orderData = {
          tableId: isTakeaway ? null : tableId,
          customerName: isTakeaway ? (takeawayName || 'Takeaway') : '',
          items: orderItems.map(item => ({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          subtotal: calculateTotal(),
          total: calculateTotal(),
          isTakeaway: isTakeaway,
          status: 'active'
        };
        await orderAPI.create(orderData);
        if (!isTakeaway) {
          await tableAPI.update(tableId, { status: 'occupied' });
        }
      }
      setOrderDialogOpen(false);
      setOrderItems([]);
      setTakeawayName('');
      fetchTables();
      fetchActiveOrders();
    } catch (error) {
      alert('Failed to place order: ' + (error.response?.data?.message || error.message));
    }
  }

  function handlePayment() {
    if (!selectedTable) return;
    const tableId = String(selectedTable?.id || selectedTable?._id);
    const tableOrder = getTableOrders(tableId);
    if (tableOrder) {
      navigate('/biller', { state: { orderId: tableOrder.id || tableOrder._id } });
    }
  }

  const handleOpenBillDialog = (order) => {
    setBillingOrder(order);
    setPaymentMethod('cash');
    setBillDialogOpen(true);
  };

  const handleQuickBill = async () => {
    if (!billingOrder) return;
    setBillLoading(true);
    try {
      await orderAPI.processPayment(billingOrder.id || billingOrder._id, {
        paymentMethod,
        amountPaid: billingOrder.total
      });
      setShowBillPrinted(true);
      setBillLoading(false);
      fetchActiveOrders();
      fetchTables();
    } catch (error) {
      alert('Payment failed: ' + (error.response?.data?.message || error.message));
      setBillLoading(false);
    }
  };

  const handlePrintBill = () => {
    if (!billingOrder) return;
    printOrderBill(billingOrder);
    setTimeout(() => {
      setBillDialogOpen(false);
      setBillingOrder(null);
      setShowBillPrinted(false);
    }, 1000);
  };

  const printOrderBill = (order) => {
    if (!order) return;
    const restaurantName = settings.restaurantName || 'VELA RESTAURANT';
    const restaurantAddress = settings.address || '';
    const restaurantPhone = settings.phone || '';
    const billHeader = settings.billHeaderEnglish || '';
    const billHeaderTamil = settings.billHeaderTamil || '';
    const billFooter = settings.billFooter || 'Thank you for visiting us!';
    const billFooterTamil = settings.billFooterTamil || '';
    const itemsList = order.items?.map((item, idx) => {
      const sn = String(idx + 1).padEnd(2);
      const name = (item.name + '       ').substring(0, 15).padEnd(15);
      const qty = String('' + item.quantity).padEnd(4);
      const price = ('   ' + item.price.toFixed(2)).slice(-7).padEnd(7);
      const amt = ('      ' + (item.price * item.quantity).toFixed(2)).slice(-8);
      return sn + name + '    ' + qty + '' + price + '' + amt;
    }).join('\n');
    const totalStr = ('      ' + order.total.toFixed(2)).slice(-8);
    const billContent = 
      "========================================\n" +
      "          " + restaurantName + "\n" +
      "========================================\n" +
      (restaurantAddress ? restaurantAddress + "\n" : "") +
      (restaurantPhone ? "✆: " + restaurantPhone + "\n" : "") +
      "----------------------------------------\n" +
      (billHeader || billHeaderTamil ? 
        ((billHeader || '') + (billHeaderTamil ? "\n" + billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
      "Bill No: " + order.orderNumber + "\n" +
      "Table: " + (order.tableNumber || 'Takeaway') + "\n" +
      "Date: " + (order.paidAt ? new Date(order.paidAt).toLocaleString() : new Date().toLocaleString()) + "\n" +
      "----------------------------------------\n" +
      "#  ITEM             QTY    PRICE  AMOUNT  \n" +
      "----------------------------------------\n" +
      itemsList + "\n" +
      "----------------------------------------\n" +
      "                 TOTAL:  ₹" + totalStr + "\n" +
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

  const handleAddItem = (menuItem) => {
    const existingItem = orderItems.find(item => item.id === menuItem._id);
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.id === menuItem._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1
      }]);
    }
  };

  const handleRemoveItem = (itemId) => {
    const existingItem = orderItems.find(item => item.id === itemId);
    if (existingItem && existingItem.quantity > 1) {
      setOrderItems(orderItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setOrderItems(orderItems.filter(item => item.id !== itemId));
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      setOrderItems(orderItems.filter(item => item.id !== itemId));
    } else {
      setOrderItems(orderItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setEditingOrderItems(order.items.map(item => ({
      id: item.menuItem || item.menuItemId || item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })));
    setEditOrderDialogOpen(true);
  };

  const calculateEditTotal = () => {
    return editingOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleEditAddItem = (menuItem) => {
    const existingItem = editingOrderItems.find(item => item.id === menuItem._id);
    if (existingItem) {
      setEditingOrderItems(editingOrderItems.map(item => 
        item.id === menuItem._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setEditingOrderItems([...editingOrderItems, {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1
      }]);
    }
  };

  const handleEditRemoveItem = (itemId) => {
    const existingItem = editingOrderItems.find(item => item.id === itemId);
    if (existingItem && existingItem.quantity > 1) {
      setEditingOrderItems(editingOrderItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setEditingOrderItems(editingOrderItems.filter(item => item.id !== itemId));
    }
  };

  const handleEditQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      setEditingOrderItems(editingOrderItems.filter(item => item.id !== itemId));
    } else {
      setEditingOrderItems(editingOrderItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    try {
      const orderId = editingOrder._id || editingOrder.id;
      const updatedItems = editingOrderItems.map(item => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));
      await orderAPI.update(orderId, {
        items: updatedItems,
        subtotal: calculateEditTotal(),
        total: calculateEditTotal()
      });
      setEditOrderDialogOpen(false);
      setEditingOrder(null);
      setEditingOrderItems([]);
      fetchActiveOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteOrderClick = (order) => {
    setDeletingOrder(order);
    setDeleteOrderDialogOpen(true);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      const orderId = deletingOrder._id || deletingOrder.id;
      await orderAPI.delete(orderId);
      setDeleteOrderDialogOpen(false);
      setDeletingOrder(null);
      fetchTables();
      fetchActiveOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <Typography>Loading tables...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Table Management</Typography>
      </Box>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Floor View" />
        <Tab label="Order View" />
      </Tabs>

      {currentTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<LocalShipping />}
              onClick={() => {
                setSelectedTable({ id: 'takeaway', tableNumber: 'TAKEAWAY' });
                fetchMenuItems();
                setOrderDialogOpen(true);
              }}
            >
              New Takeaway
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mb: 2 }}>Tables</Typography>
          <Grid container spacing={3}>
            {tables.filter(t => t.status !== 'reserved').map((table) => {
              const tableId = String(table.id || table._id);
              const tableOrder = getTableOrders(tableId);
              return (
                <Grid item xs={12} sm={6} md={4} key={tableId}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      bgcolor: table.status === 'available' ? '#e8f5e9' : table.status === 'reserved' ? '#fff3e0' : '#ffebee'
                    }}
                    onClick={() => handleTableClick(table)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">Table {table.tableNumber}</Typography>
                        <Chip 
                          label={table.status} 
                          color={statusColors[table.status] || 'default'}
                          size="small"
                        />
                      </Box>
                      {table.status !== 'available' && tableOrder && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">Order #{tableOrder.orderNumber || tableOrder._id?.slice(-6)}</Typography>
                          <Typography variant="body2">Total: ₹{tableOrder.total}</Typography>
                          <Typography variant="body2" color="text.secondary">{tableOrder.items?.length || 0} items</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button size="small" variant="contained" color="success" startIcon={<Receipt />} onClick={(e) => { e.stopPropagation(); const order = getTableOrders(String(table.id || table._id)); if (order) handleOpenBillDialog(order); }}>Bill</Button>
                            <Button size="small" variant="outlined" startIcon={<Print />} onClick={(e) => { e.stopPropagation(); const order = getTableOrders(String(table.id || table._id)); if (order) printOrderBill(order); }}>Print</Button>
                          </Box>
                        </Box>
                      )}
                      {table.status === 'available' && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Click to add items</Typography>}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {takeawayOrders.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShipping color="primary" />
                Active Takeaway Orders
              </Typography>
              <Grid container spacing={2}>
                {takeawayOrders.map((order) => {
                  const orderId = order._id || order.id;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={orderId}>
                      <Card 
                        sx={{ bgcolor: '#fff3e0', cursor: 'pointer' }}
                        onClick={() => {
                          setEditingOrder(order);
                          setEditingOrderItems(order.items.map(item => ({
                            id: item.menuItem || item.menuItemId || item._id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity
                          })));
                          setEditOrderDialogOpen(true);
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">Order #{order.orderNumber || orderId?.slice(-6)}</Typography>
                            <Chip label={order.status || 'Active'} color={order.status === 'active' ? 'success' : 'default'} size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">{order.customerName || 'Takeaway'}</Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>{order.items?.length || 0} items</Typography>
                          <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>₹{order.total}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button size="small" variant="contained" color="success" startIcon={<Receipt />} onClick={(e) => { e.stopPropagation(); handleOpenBillDialog(order); }}>Bill</Button>
                            <Button size="small" variant="outlined" startIcon={<Print />} onClick={(e) => { e.stopPropagation(); printOrderBill(order); }}>Print</Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {currentTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalShipping color="primary" />
              Order View
            </Typography>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Table</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Object.values(orders), ...takeawayOrders].map(order => (
                  <TableRow key={order._id || order.id}>
                    <TableCell>{order.orderNumber || order._id?.slice(-6)}</TableCell>
                    <TableCell>
                      <Chip label={order.isTakeaway || order.tableId === null || order.customerName === 'Takeaway' ? 'Takeaway' : 'Dine-in'} color={order.isTakeaway || order.tableId === null ? 'warning' : 'primary'} size="small" />
                    </TableCell>
                    <TableCell>{order.table ? `Table ${order.table.tableNumber || 'Unknown'}` : (order.tableId ? (order.tableId === 'takeaway' ? 'Takeaway' : `Table ${tables.find(t => String(t.id || t._id) === String(order.tableId))?.tableNumber}`) : 'Takeaway')}</TableCell>
                    <TableCell>{order.items?.length || 0}</TableCell>
                    <TableCell>₹{order.total}</TableCell>
                    <TableCell><Chip label={order.status} color={order.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" color="primary" onClick={() => handleEditOrder(order)}><Edit /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteOrderClick(order)}><Delete /></IconButton>
                        <IconButton size="small" color="success" onClick={() => handleOpenBillDialog(order)} title="Quick Bill"><Receipt /></IconButton>
                        <IconButton size="small" onClick={() => printOrderBill(order)} title="Print"><Print /></IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog open={orderDialogOpen} onClose={() => { setOrderDialogOpen(false); setOrderItems([]); setTakeawayName(''); setMenuSearchQuery(''); }} maxWidth="md" fullWidth>
        <DialogTitle>{selectedTable?.id === 'takeaway' ? 'Takeaway Order' : `Order - Table ${selectedTable?.tableNumber}`}</DialogTitle>
        <DialogContent sx={{ overflow: 'hidden' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7} sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Menu Items</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
                <input type="text" placeholder="Search or add favorites..." value={menuSearchQuery} onChange={(e) => setMenuSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }} />
              </Box>
              
              {!menuSearchQuery && favoriteItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>⭐ Favorites:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {favoriteItems.slice(0, 10).map((item, index) => (
                      <Chip 
                        key={index} 
                        label={item.name} 
                        onClick={() => handleAddItem(item)} 
                        onDelete={() => toggleFavorite(item)}
                        deleteIcon={<Favorite />}
                        sx={{ cursor: 'pointer', bgcolor: '#fff3e0', '&:hover': { bgcolor: '#ffe0b2' } }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {!menuSearchQuery && popularItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Top Selling Last Five Days:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {popularItems.slice(0, 10).map((item, index) => (
                      <Chip key={index} label={`${item.name} (${item.quantity})`} onClick={() => { const menuItem = menuItems.find(m => m.name && item.name && m.name.toLowerCase() === item.name.toLowerCase()); if (menuItem) handleAddItem(menuItem); else { const found = menuItems.find(m => m.name && item.name && m.name.toLowerCase().includes(item.name.toLowerCase())); if (found) handleAddItem(found); } }} sx={{ cursor: 'pointer', bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }} />
                    ))}
                  </Box>
                </Box>
              )}

              {menuSearchQuery ? (
                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const allMatchingItems = menuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()));
                    return allMatchingItems.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Search Results ({allMatchingItems.length})</Typography>
                        <Grid container spacing={1}>
                          {allMatchingItems.map(item => (
                            <Grid item xs={6} key={item._id}>
                              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => handleAddItem(item)}>
                                <CardContent sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1 } }}>
                                  <Box>
                                    <Typography variant="body2">{item.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
                    ) : <Typography color="text.secondary">No items found</Typography>;
                  })()}
                </Box>
              ) : (
                categories.map(category => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>{category}</Typography>
                    <Grid container spacing={1}>
                      {menuItems.filter(item => {
                        if (typeof item.category === 'string') return item.category === category;
                        if (item.category && typeof item.category === 'object') return item.category.name === category;
                        // Handle null/unassigned categories - show them in all categories
                        if (!item.category) return true;
                        return false;
                      }).map(item => (
                        <Grid item xs={6} key={item._id}>
                          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => handleAddItem(item)}>
                            <CardContent sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1 } }}>
                              <Box>
                                <Typography variant="body2">{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
                ))
              )}
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
                {orderItems.length === 0 ? (
                  <Typography color="text.secondary">No items added</Typography>
                ) : (
                  <Box>
                  {orderItems.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">₹{item.price} each</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleRemoveItem(item.id)}>-</IconButton>
                        <Typography>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => handleAddItem({ _id: item.id, name: item.name, price: item.price })}>+</IconButton>
                        <Typography>₹{item.price * item.quantity}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Total: ₹{calculateTotal()}</Typography>
                </Box>
              )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOrderDialogOpen(false); setOrderItems([]); setTakeawayName(''); }}>Cancel</Button>
          {selectedTable?.id === 'takeaway' ? (
            <Button variant="contained" onClick={() => handlePlaceOrder(true)} disabled={orderItems.length === 0}>Place Takeaway Order</Button>
          ) : (
            <Button variant="contained" onClick={() => handlePlaceOrder(false)} disabled={orderItems.length === 0}>Place Order</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={editOrderDialogOpen} onClose={() => { setEditOrderDialogOpen(false); setEditingOrder(null); }} maxWidth="md" fullWidth>
        <DialogTitle>Edit Order - {editingOrder?.orderNumber || editingOrder?._id?.slice(-6)}</DialogTitle>
        <DialogContent sx={{ overflow: 'hidden' }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={12} md={7} sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Menu Items</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
                <input type="text" placeholder="Search or add favorites..." value={editMenuSearchQuery} onChange={(e) => setEditMenuSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }} />
              </Box>
              {!editMenuSearchQuery && favoriteItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>⭐ Favorites:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {favoriteItems.slice(0, 10).map((item, index) => (
                      <Chip 
                        key={index} 
                        label={item.name} 
                        onClick={() => handleEditAddItem(item)} 
                        onDelete={() => toggleFavorite(item)}
                        deleteIcon={<Favorite />}
                        sx={{ cursor: 'pointer', bgcolor: '#fff3e0', '&:hover': { bgcolor: '#ffe0b2' } }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {!editMenuSearchQuery && popularItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Top Selling Last Five Days:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {popularItems.slice(0, 10).map((item, index) => (
                      <Chip key={index} label={`${item.name} (${item.quantity})`} onClick={() => { const menuItem = menuItems.find(m => m.name && item.name && m.name.toLowerCase() === item.name.toLowerCase()); if (menuItem) handleEditAddItem(menuItem); else { const found = menuItems.find(m => m.name && item.name && m.name.toLowerCase().includes(item.name.toLowerCase())); if (found) handleEditAddItem(found); } }} sx={{ cursor: 'pointer', bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }} />
                    ))}
                  </Box>
                </Box>
              )}
              {editMenuSearchQuery ? (
                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const allMatchingItems = menuItems.filter(item => item.name.toLowerCase().includes(editMenuSearchQuery.toLowerCase()));
                    return allMatchingItems.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Search Results ({allMatchingItems.length})</Typography>
                        <Grid container spacing={1}>
                          {allMatchingItems.map(item => (
                            <Grid item xs={6} key={item._id}>
                              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => handleEditAddItem(item)}>
                                <CardContent sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1 } }}>
                                  <Box>
                                    <Typography variant="body2">{item.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
                    ) : <Typography color="text.secondary">No items found</Typography>;
                  })()}
                </Box>
              ) : (
                categories.map(category => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>{category}</Typography>
                    <Grid container spacing={1}>
                      {menuItems.filter(item => {
                        if (typeof item.category === 'string') return item.category === category;
                        if (item.category && typeof item.category === 'object') return item.category.name === category;
                        // Handle null/unassigned categories - show them in all categories
                        if (!item.category) return true;
                        return false;
                      }).map(item => (
                        <Grid item xs={6} key={item._id}>
                          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => handleEditAddItem(item)}>
                            <CardContent sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:last-child': { pb: 1 }}}>
                              <Box>
                                <Typography variant="body2">{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
                ))
              )}
            </Grid>
            <Grid item xs={12} md={5}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
                {editingOrderItems.length === 0 ? (
                  <Typography color="text.secondary">No items added</Typography>
                ) : (
                  <Box>
                  {editingOrderItems.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">₹{item.price} each</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleEditRemoveItem(item.id)}>-</IconButton>
                        <Typography>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => handleEditAddItem({ _id: item.id, name: item.name, price: item.price })}>+</IconButton>
                        <Typography>₹{item.price * item.quantity}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Total: ₹{calculateEditTotal()}</Typography>
                </Box>
              )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOrderDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateOrder} disabled={editingOrderItems.length === 0}>Update Order</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOrderDialogOpen} onClose={() => { setDeleteOrderDialogOpen(false); setDeletingOrder(null); }}>
        <DialogTitle>Confirm Delete Order</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this order? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOrderDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteOrder}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billDialogOpen} onClose={() => { setBillDialogOpen(false); setBillingOrder(null); setShowBillPrinted(false); setPaymentMethod('cash'); }} maxWidth="sm" fullWidth>
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          {billingOrder && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Order #{billingOrder.orderNumber || billingOrder._id?.slice(-6)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{billingOrder.table ? `Table ${billingOrder.table.tableNumber}` : 'Takeaway'}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Items:</Typography>
              {billingOrder.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{item.name} x{item.quantity}</Typography>
                  <Typography variant="body2">₹{item.price * item.quantity}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>Total: ₹{billingOrder.total}</Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} label="Payment Method" disabled={showBillPrinted}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                </Select>
              </FormControl>
              {showBillPrinted && <Alert severity="success" sx={{ mt: 1 }}>Payment successful! Click "Print Bill" to print the receipt.</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBillDialogOpen(false); setShowBillPrinted(false); }}>{showBillPrinted ? 'Close' : 'Cancel'}</Button>
          {showBillPrinted ? (
            <Button variant="contained" color="primary" startIcon={<Print />} onClick={handlePrintBill}>Print Bill</Button>
          ) : (
            <Button variant="contained" color="success" onClick={handleQuickBill} disabled={billLoading}>{billLoading ? 'Processing...' : 'Complete Payment'}</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
