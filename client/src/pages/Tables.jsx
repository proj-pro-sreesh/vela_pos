import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, Tab, Tabs, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider
} from '@mui/material';
import { 
  Delete, Payment, Print, Person, LocalShipping, ShoppingCart, Edit, Search 
} from '@mui/icons-material';
import { tableAPI, orderAPI, menuAPI } from '../services/api';

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
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchTables();
    fetchActiveOrders();
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

  const fetchActiveOrders = async () => {
    try {
      const response = await orderAPI.getActive();
      const ordersData = response.data;
      
      const ordersByTable = {};
      const takeawayArray = [];
      
      ordersData.forEach(order => {
        // Check for table using 'table' field (populated object) or 'tableId' (for in-memory)
        const tableRef = order.table; // Populated table object
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
      
      const uniqueCategories = [...new Set(response.data.map(item => {
        // Handle category as either string or object
        if (typeof item.category === 'string') return item.category;
        if (item.category && typeof item.category === 'object') return item.category.name;
        return null;
      }).filter(Boolean))];
      setCategories(uniqueCategories);
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
    // Open order dialog for both available and occupied tables
    if (table.status === 'available' || table.status === 'occupied') {
      await fetchMenuItems();
      
      // If occupied, load existing order items
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
        // Update existing order - replace items
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
        
        // Update table status to occupied
        await tableAPI.update(tableId, { status: 'occupied' });
      } else {
        // Create new order
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
        
        const response = await orderAPI.create(orderData);
        const newOrder = response.data;
        const newOrderId = newOrder.id || newOrder._id;
        
        // Update table status to occupied
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
      console.log('Deleting order with ID:', orderId, 'Full order:', deletingOrder);
      
      // Delete the order using the delete API
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
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<LocalShipping />}
            onClick={() => {
              setSelectedTable({ id: 'takeaway', tableNumber: 'TAKEAWAY' });
              fetchMenuItems();
              setOrderDialogOpen(true);
            }}
          >
            Takeaway Order
          </Button>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Floor View" />
        <Tab label="Active Orders" />
        <Tab label="Takeaway Orders" />
      </Tabs>

      {currentTab === 0 && (
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
                        <Typography variant="body2" color="text.secondary">
                          Order #{tableOrder.orderNumber || tableOrder._id?.slice(-6)}
                        </Typography>
                        <Typography variant="body2">
                          Total: ₹{tableOrder.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tableOrder.items?.length || 0} items
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button 
                            size="small" 
                            variant="contained"
                            startIcon={<Payment />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTable(table);
                              handlePayment();
                            }}
                          >
                            Pay
                          </Button>
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const order = getTableOrders(String(table.id || table._id));
                              if (order) {
                                const itemsList = order.items?.map((item, idx) => {
                                  const sn = String(idx + 1).padEnd(4);
                                  const name = item.name.substring(0, 20).padEnd(20);
                                  const qty = String(item.quantity).padEnd(5);
                                  const amt = String(item.price * item.quantity).padEnd(6);
                                  return sn + name + qty + amt;
                                }).join('\n');
                                
                                const billContent = 
                                  "========================================\n" +
                                  "          " + (settings.restaurantName || 'VELA RESTAURANT') + "\n" +
                                  "========================================\n" +
                                  (settings.billHeaderEnglish || settings.billHeaderTamil ? 
                                    ((settings.billHeaderEnglish || '') + (settings.billHeaderTamil ? "\n" + settings.billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
                                  "Bill No: " + order.orderNumber + "\n" +
                                  "Table: " + order.tableNumber + "\n" +
                                  "Date: " + new Date().toLocaleString() + "\n" +
                                  "----------------------------------------\n" +
                                  "SN  ITEM                QTY  AMT   \n" +
                                  "----------------------------------------\n" +
                                  itemsList + "\n" +
                                  "----------------------------------------\n" +
                                  "TOTAL:                 ₹" + order.total + "\n" +
                                  "========================================\n" +
                                  (settings.billFooter || 'Thank you for visiting us!') + (settings.billFooterTamil ? "\n" + settings.billFooterTamil : "");
                                
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                document.body.appendChild(iframe);
                                
                                const iframeDoc = iframe.contentWindow.document;
                                iframeDoc.open();
                                iframeDoc.write(`
                                  <html>
                                    <head><title>Bill - ${order.orderNumber}</title></head>
                                    <body>
                                      <pre style="font-family: monospace; font-size: 12px;">${billContent}</pre>
                                      <script>window.print();</script>
                                    </body>
                                  </html>
                                `);
                                iframeDoc.close();
                              }
                            }}
                            title="Print Bill"
                          >
                            <Print />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                    
                    {table.status === 'available' && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Click to add items
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {currentTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(orders).map(order => (
                <TableRow key={order._id || order.id}>
                  <TableCell>{order.orderNumber || order._id?.slice(-6)}</TableCell>
                  <TableCell>{order.table ? `Table ${order.table.tableNumber || 'Unknown'}` : (order.tableId ? `Table ${tables.find(t => String(t.id || t._id) === String(order.tableId))?.tableNumber}` : 'Takeaway')}</TableCell>
                  <TableCell>{order.items?.length || 0}</TableCell>
                  <TableCell>₹{order.total}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status} 
                      color={order.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small"
                        color="primary"
                        onClick={() => handleEditOrder(order)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small"
                        color="error"
                        onClick={() => handleDeleteOrderClick(order)}
                      >
                        <Delete />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => {
                          const tableRef = order.table;
                          const tableId = tableRef?._id ? String(tableRef._id) : (order.tableId ? String(order.tableId) : null);
                          const table = tableId ? (tables.find(t => String(t.id || t._id) === tableId) || tableRef) : null;
                          if (table) {
                            setSelectedTable(table);
                            handlePayment();
                          } else {
                            // For takeaway orders, navigate directly to biller
                            navigate('/biller', { state: { orderId: order.id || order._id } });
                          }
                        }}
                      >
                        <Payment />
                      </IconButton>
                      <IconButton 
                        size="small"
                        color="secondary"
                        onClick={() => {
                          const itemsList = order.items?.map((item, idx) => {
                            const sn = String(idx + 1).padEnd(4);
                            const name = item.name.substring(0, 20).padEnd(20);
                            const qty = String(item.quantity).padEnd(5);
                            const amt = String(item.price * item.quantity).padEnd(6);
                            return sn + name + qty + amt;
                          }).join('\n');
                          
                          const billContent = 
                            "========================================\n" +
                            "          " + (settings.restaurantName || 'VELA RESTAURANT') + "\n" +
                            "========================================\n" +
                            (settings.billHeaderEnglish || settings.billHeaderTamil ? 
                              ((settings.billHeaderEnglish || '') + (settings.billHeaderTamil ? "\n" + settings.billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
                            "Bill No: " + order.orderNumber + "\n" +
                            "Table: " + order.tableNumber + "\n" +
                            "Date: " + new Date().toLocaleString() + "\n" +
                            "----------------------------------------\n" +
                            "SN  ITEM                QTY  AMT   \n" +
                            "----------------------------------------\n" +
                            itemsList + "\n" +
                            "----------------------------------------\n" +
                            "TOTAL:                 ₹" + order.total + "\n" +
                            "========================================\n" +
                            (settings.billFooter || 'Thank you for visiting us!') + (settings.billFooterTamil ? "\n" + settings.billFooterTamil : "");
                          
                          const iframe = document.createElement('iframe');
                          iframe.style.display = 'none';
                          document.body.appendChild(iframe);
                          
                          const iframeDoc = iframe.contentWindow.document;
                          iframeDoc.open();
                          iframeDoc.write(`
                            <html>
                              <head><title>Bill - ${order.orderNumber}</title></head>
                              <body>
                                <pre style="font-family: monospace; font-size: 12px;">${billContent}</pre>
                                <script>window.print();</script>
                              </body>
                            </html>
                          `);
                          iframeDoc.close();
                        }}
                        title="Print Bill"
                      >
                        <Print />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Takeaway Orders Tab */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalShipping color="primary" />
              Takeaway Orders
            </Typography>
          </Box>

          {takeawayOrders.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <LocalShipping sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No Takeaway Orders
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Click "New Takeaway Order" to create one
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {takeawayOrders.map(order => (
                <Grid item xs={12} sm={6} md={4} key={order._id || order.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      bgcolor: '#fff3e0',
                      '&:hover': { boxShadow: 3 }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {order.orderNumber}
                        </Typography>
                        <Chip 
                          label={order.status === 'active' ? 'Pending' : order.status} 
                          color={order.status === 'active' ? 'warning' : 'success'}
                          size="small"
                        />
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box sx={{ mb: 2 }}>
                        {order.items?.map((item, idx) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2">
                              {item.quantity}x {item.name}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ₹{item.price * item.quantity}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Total</Typography>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary">
                          ₹{order.total}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained" 
                          fullWidth
                          startIcon={<Payment />}
                          onClick={() => navigate('/biller', { state: { orderId: order.id || order._id } })}
                        >
                          Process Payment
                        </Button>
                        <IconButton 
                          color="primary"
                          onClick={() => {
                            const itemsList = order.items?.map((item, idx) => {
                              const sn = String(idx + 1).padEnd(4);
                              const name = item.name.substring(0, 20).padEnd(20);
                              const qty = String(item.quantity).padEnd(5);
                              const amt = String(item.price * item.quantity).padEnd(6);
                              return sn + name + qty + amt;
                            }).join('\n');
                            
                            const billContent = 
                "========================================\n" +
                "          " + (settings.restaurantName || 'VELA RESTAURANT') + "\n" +
                "========================================\n" +
                (settings.billHeaderEnglish || settings.billHeaderTamil ? 
                  ((settings.billHeaderEnglish || '') + (settings.billHeaderTamil ? "\n" + settings.billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
                "Bill No: " + order.orderNumber + "\n" +
                "Table: Takeaway\n" +
                "Date: " + new Date().toLocaleString() + "\n" +
                "----------------------------------------\n" +
                "SN  ITEM                QTY  AMT   \n" +
                "----------------------------------------\n" +
                itemsList + "\n" +
                "----------------------------------------\n" +
                "TOTAL:                 ₹" + order.total + "\n" +
                "========================================\n" +
                (settings.billFooter || 'Thank you for visiting us!') + (settings.billFooterTamil ? "\n" + settings.billFooterTamil : "");
                            
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            document.body.appendChild(iframe);
                            
                            const iframeDoc = iframe.contentWindow.document;
                            iframeDoc.open();
                            iframeDoc.write(`
                              <html>
                                <head><title>Bill - ${order.orderNumber}</title></head>
                                <body>
                                  <pre style="font-family: monospace; font-size: 12px;">${billContent}</pre>
                                  <script>window.print();</script>
                                </body>
                              </html>
                            `);
                            iframeDoc.close();
                          }}
                          title="Print Bill"
                        >
                          <Print />
                        </IconButton>
                        <IconButton 
                          color="secondary"
                          onClick={() => {
                            // Set the editing order for takeaway - match the pattern from handleEditOrder
                            setEditingOrder(order);
                            setEditingOrderItems(order.items?.map(item => ({
                              id: item.menuItem || item.menuItemId || item.id || item._id,
                              name: item.name,
                              price: item.price,
                              quantity: item.quantity
                            })) || []);
                            setEditOrderDialogOpen(true);
                          }}
                          title="Edit Order"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          color="error"
                          onClick={() => handleDeleteOrderClick(order)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTable?.id === 'takeaway' ? 'Takeaway Order' : `Order - Table ${selectedTable?.tableNumber}`}
        </DialogTitle>
        <DialogContent>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ mb: 2 }}>Menu Items</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }}
                />
              </Box>
              {menuSearchQuery ? (
                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const allMatchingItems = menuItems.filter(item => 
                      item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
                      (item.description && item.description.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                    );
                    return allMatchingItems.length > 0 ? (
                      <>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                          Search Results ({allMatchingItems.length})
                        </Typography>
                        <Grid container spacing={1}>
                          {allMatchingItems.map(item => (
                            <Grid item xs={6} key={item._id}>
                              <Card 
                                variant="outlined" 
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                onClick={() => handleAddItem(item)}
                              >
                                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                  <Typography variant="body2">{item.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    ) : (
                      <Typography color="text.secondary">No items found</Typography>
                    );
                  })()}
                </Box>
              ) : (
                categories.map(category => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      {category}
                    </Typography>
                    <Grid container spacing={1}>
                      {menuItems
                        .filter(item => {
                          if (typeof item.category === 'string') return item.category === category;
                          if (item.category && typeof item.category === 'object') return item.category.name === category;
                          return false;
                        })
                        .map(item => (
                          <Grid item xs={6} key={item._id}>
                            <Card 
                              variant="outlined" 
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                              onClick={() => handleAddItem(item)}
                            >
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="body2">{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
              <Typography variant="h6" sx={{ mb: 2 }}>Current Order</Typography>
              {orderItems.length === 0 ? (
                <Typography color="text.secondary">No items added</Typography>
              ) : (
                <Box>
                  {orderItems.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">₹{item.price} each</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleRemoveItem(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          sx={{ width: 60 }}
                          inputProps={{ min: 1 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'right' }}>
                          ₹{item.price * item.quantity}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                    <Typography variant="h6" align="right">
                      Total: ₹{calculateTotal()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOrderDialogOpen(false);
            setOrderItems([]);
            setTakeawayName('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<ShoppingCart />}
            onClick={() => handlePlaceOrder(selectedTable?.id === 'takeaway')}
            disabled={orderItems.length === 0}
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editOrderDialogOpen} onClose={() => setEditOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Order - {editingOrder?.table ? `Table ${editingOrder.table.tableNumber || editingOrder.table.tableNumber}` : (editingOrder?.customerName || 'Takeaway')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ mb: 2 }}>Menu Items</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, bgcolor: 'background.paper' }}>
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={editMenuSearchQuery}
                  onChange={(e) => setEditMenuSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, padding: '8px 0', fontSize: 14 }}
                />
              </Box>
              {editMenuSearchQuery ? (
                <Box sx={{ mb: 3 }}>
                  {(() => {
                    const allMatchingItems = menuItems.filter(item => 
                      item.name.toLowerCase().includes(editMenuSearchQuery.toLowerCase()) ||
                      (item.description && item.description.toLowerCase().includes(editMenuSearchQuery.toLowerCase()))
                    );
                    return allMatchingItems.length > 0 ? (
                      <>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                          Search Results ({allMatchingItems.length})
                        </Typography>
                        <Grid container spacing={1}>
                          {allMatchingItems.map(item => (
                            <Grid item xs={6} key={item._id}>
                              <Card 
                                variant="outlined" 
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                onClick={() => handleEditAddItem(item)}
                              >
                                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                  <Typography variant="body2">{item.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    ) : (
                      <Typography color="text.secondary">No items found</Typography>
                    );
                  })()}
                </Box>
              ) : (
                categories.map(category => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      {category}
                    </Typography>
                    <Grid container spacing={1}>
                      {menuItems
                        .filter(item => {
                          if (typeof item.category === 'string') return item.category === category;
                          if (item.category && typeof item.category === 'object') return item.category.name === category;
                          return false;
                        })
                        .map(item => (
                          <Grid item xs={6} key={item._id}>
                            <Card 
                              variant="outlined" 
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                              onClick={() => handleEditAddItem(item)}
                            >
                              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="body2">{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
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
              <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
              {editingOrderItems.length === 0 ? (
                <Typography color="text.secondary">No items added</Typography>
              ) : (
                <Box>
                  {editingOrderItems.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">₹{item.price} each</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleEditRemoveItem(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleEditQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          sx={{ width: 60 }}
                          inputProps={{ min: 1 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'right' }}>
                          ₹{item.price * item.quantity}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                    <Typography variant="h6" align="right">
                      Total: ₹{calculateEditTotal()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditOrderDialogOpen(false);
            setEditingOrder(null);
            setEditingOrderItems([]);
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<ShoppingCart />}
            onClick={handleUpdateOrder}
            disabled={editingOrderItems.length === 0}
          >
            Update Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <Dialog open={deleteOrderDialogOpen} onClose={() => setDeleteOrderDialogOpen(false)}>
        <DialogTitle>Confirm Delete Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this order? 
            {deletingOrder && (
              <Typography component="span" display="block" sx={{ mt: 1 }}>
                Order #{deletingOrder.orderNumber || deletingOrder._id?.slice(-6)} - ₹{deletingOrder.total}
              </Typography>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOrderDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleConfirmDeleteOrder}
          >
            Delete Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
