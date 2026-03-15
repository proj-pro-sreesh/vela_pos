import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider
} from '@mui/material';
import { 
  Add,
  Refresh,
  Send
} from '@mui/icons-material';
import { tableAPI, orderAPI, menuAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const Waiter = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('table:update', () => fetchTables());
      socket.on('order:updated', () => fetchActiveOrders());
      return () => {
        socket.off('table:update');
        socket.off('order:updated');
      };
    }
  }, [socket]);

  const fetchData = async () => {
    try {
      await Promise.all([fetchTables(), fetchActiveOrders(), fetchMenu()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    const res = await tableAPI.getAll();
    setTables(res.data);
  };

  const fetchActiveOrders = async () => {
    const res = await orderAPI.getActive();
    setActiveOrders(res.data);
  };

  const fetchMenu = async () => {
    const res = await menuAPI.getGrouped();
    setMenuData(res.data);
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

  const placeOrder = async () => {
    if (!selectedTable || cart.length === 0) return;

    try {
      // Calculate subtotal
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await orderAPI.create({
        tableId: selectedTable,
        items: cart.map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: subtotal,
        total: subtotal
      });
      setCart([]);
      setSelectedTable(null);
      fetchData();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order: ' + (error.response?.data?.message || error.message));
    }
  };

  // Sort tables numerically by table number
  const sortTables = (tableList) => {
    return [...tableList].sort((a, b) => {
      // Extract numeric part from table number (e.g., "T10" -> 10)
      const getTableNum = (table) => {
        const match = table.tableNumber.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getTableNum(a) - getTableNum(b);
    });
  };

  const availableTables = sortTables(tables.filter(t => t.status === 'available'));
  const occupiedTables = sortTables(tables.filter(t => t.status === 'occupied'));

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ pb: 7 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} variant="fullWidth">
          <Tab label={`Tables (${tables.length})`} />
          <Tab label={`Active Orders (${activeOrders.length})`} />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Available Tables</Typography>
          <Grid container spacing={1}>
            {availableTables.map(table => (
              <Grid item xs={4} key={table._id}>
                <Card 
                  sx={{ 
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: selectedTable === table._id ? 'primary.light' : 'background.paper'
                  }}
                  onClick={() => setSelectedTable(selectedTable === table._id ? null : table._id)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="h5">{table.tableNumber}</Typography>
                    <Typography variant="caption">{table.capacity} seats</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mt: 3 }}>Occupied Tables</Typography>
          <List>
            {occupiedTables.map(table => (
              <ListItem key={table._id}>
                <ListItemText
                  primary={`Table ${table.tableNumber}`}
                  secondary={`${table.capacity} seats`}
                />
                <Chip label="Occupied" color="warning" size="small" />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={{ p: 2 }}>
          {activeOrders.length === 0 ? (
            <Typography align="center" color="text.secondary">No active orders</Typography>
          ) : (
            activeOrders.map(order => (
              <Card key={order._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Table {order.tableNumber}</Typography>
                    <Chip label={order.status} color="primary" size="small" />
                  </Box>
                  <Typography variant="caption">{order.orderNumber}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <List dense>
                    {order.items?.slice(0, 3).map((item, i) => (
                      <ListItem key={i} sx={{ px: 0 }}>
                        <ListItemText 
                          primary={`${item.quantity}x ${item.name}`}
                          secondary={item.status}
                        />
                      </ListItem>
                    ))}
                    {order.items?.length > 3 && (
                      <Typography variant="caption">+{order.items.length - 3} more items</Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default Waiter;
