import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputAdornment,
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
  Payment,
  Receipt,
  CheckCircle,
  Print,
  Delete,
  History,
  Replay
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { orderAPI } from '../services/api';

const Biller = () => {
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [reprintOrder, setReprintOrder] = useState(null);
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchOrders();
    fetchBillingHistory();
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

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getAll({ status: 'active' });
      setOrders(response.data);
      
      // Auto-select order if orderId is provided in URL
      if (orderIdFromUrl) {
        const order = response.data.find(o => o.id === orderIdFromUrl || o._id === orderIdFromUrl);
        if (order && order.paymentStatus !== 'paid') {
          setSelectedOrder(order);
          setAmountPaid(order.total.toString());
          setPaymentDialogOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      // Fetch recent completed/paid orders
      const response = await orderAPI.getAll({ status: 'completed', limit: 15 });
      if (response.data && response.data.length > 0) {
        // Transform and add to billing history
        const historyOrders = response.data.map(order => ({
          ...order,
          paidAt: order.updatedAt || order.completedAt || order.createdAt
        }));
        setBillingHistory(historyOrders.slice(0, 15));
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    }
  };

  const handlePayment = (order) => {
    setSelectedOrder(order);
    setAmountPaid(order.total.toString());
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    const paidAmount = parseFloat(amountPaid);
    if (isNaN(paidAmount) || paidAmount < selectedOrder.total) {
      alert('Amount received must be at least Rs. ' + selectedOrder.total.toFixed(2));
      return;
    }
    try {
      const orderId = selectedOrder.id || selectedOrder._id;
      await orderAPI.processPayment(orderId, {
        paymentMethod,
        amountPaid: paidAmount
      });
      
      // Store paid order and open print dialog
      const paidOrderData = { ...selectedOrder, paymentMethod, amountPaid: paidAmount, paidAt: new Date() };
      setPaidOrder(paidOrderData);
      setPrintDialogOpen(true);
      
      // Add to billing history (keep last 15)
      setBillingHistory(prev => {
        const newHistory = [paidOrderData, ...prev];
        return newHistory.slice(0, 15);
      });
      
      setPaymentDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    console.log('Delete order called with ID:', orderId);
    if (!orderId) {
      alert('Order ID is undefined. Cannot delete.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }
    try {
      console.log('Deleting order with ID:', orderId);
      const response = await orderAPI.delete(orderId);
      console.log('Delete response:', response);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order: ' + (error.message || 'Unknown error'));
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      default: return 'error';
    }
  };

  const handleReprint = (order) => {
    setReprintOrder(order);
    setReprintDialogOpen(true);
  };

  const printBill = (order) => {
    const itemsList = order.items?.map((item, idx) => {
      const sn = String(idx + 1).padEnd(2);
      const name = (item.name + '       ').substring(0, 15).padEnd(15);
      const qty = String('' + item.quantity).padEnd(4);
      const price = ('   ' + item.price.toFixed(2)).slice(-7).padEnd(7);
      const amt = ('      ' + (item.price * item.quantity).toFixed(2)).slice(-8);
      return sn + name + '    ' + qty + '' + price + '' + amt;
    }).join('\n');
    
    const restaurantName = settings.restaurantName || 'VELA RESTAURANT';
    const billHeader = settings.billHeaderEnglish || '';
    const billHeaderTamil = settings.billHeaderTamil || '';
    const billFooter = settings.billFooter || 'Thank you for visiting us!';
    const billFooterTamil = settings.billFooterTamil || '';
    
    // Format total line to align with item amounts (right-aligned)
    const totalStr = ('      ' + order.total.toFixed(2)).slice(-8);
    
    const billContent = 
      "========================================\n" +
      "          " + restaurantName + "\n" +
      "========================================\n" +
      (billHeader || billHeaderTamil ? 
        ((billHeader || '') + (billHeaderTamil ? "\n" + billHeaderTamil : "") + "\n----------------------------------------\n") : "") +
      "Bill No: " + order.orderNumber + "\n" +
      "Table: " + (order.tableNumber || 'Takeaway') + "\n" +
      "Date: " + (order.paidAt ? new Date(order.paidAt).toLocaleString() : new Date().toLocaleString()) + "\n" +
      "----------------------------------------\n" +
      "#  ITEM             QTY  PRICE    AMOUNT  \n" +
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
    // Convert mm to cm for CSS (1mm = 0.1cm)
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
    return <Typography>Loading orders...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Billing Dashboard</Typography>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Active Orders" />
        <Tab label={`Billing History (${billingHistory.length})`} />
      </Tabs>

      {currentTab === 0 && (
      <Grid container spacing={2}>
        {/* Pending Payments */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>Active Orders - Pending Payment</Typography>
          {orders.filter(o => o.paymentStatus !== 'paid').length === 0 ? (
            <Typography color="text.secondary">No pending payments</Typography>
          ) : (
            orders.filter(o => o.paymentStatus !== 'paid').map(order => (
              <Card key={order.id || order._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                      <Typography variant="h6">Table {order.tableNumber}</Typography>
                      <Typography variant="caption">{order.orderNumber}</Typography>
                    </Box>
                    <Chip 
                      label={order.paymentStatus} 
                      color={getPaymentStatusColor(order.paymentStatus)} 
                      size="small" 
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <List dense>
                    {order.items?.map((item, i) => (
                      <ListItem key={i} sx={{ px: 0 }}>
                        <ListItemText 
                          primary={`${item.quantity}x ${item.name}`}
                          secondary={item.status}
                        />
                        <Typography variant="body2">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      ₹{order.total?.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<Payment />}
                      onClick={() => handlePayment(order)}
                    >
                      Process Payment
                    </Button>
                    <IconButton 
                      color="error" 
                      onClick={() => {
                        console.log('Order object:', order);
                        console.log('Order ID:', order.id);
                        console.log('Order _id:', order._id);
                        handleDeleteOrder(order.id || order._id);
                      }}
                      title="Delete Order"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Grid>

        {/* Today's Summary */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>Today's Summary</Typography>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Pending Payment Orders</Typography>
              <Typography variant="h4">{orders.filter(o => o.paymentStatus !== 'paid').length}</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Pending Amount</Typography>
              <Typography variant="h4" color="warning.main">
                ₹{orders.reduce((sum, o) => sum + (o.paymentStatus !== 'paid' ? o.total : 0), 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {currentTab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Billing History - Last 15 Orders</Typography>
            {billingHistory.length === 0 ? (
              <Typography color="text.secondary">No billing history available</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order No</TableCell>
                      <TableCell>Table</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billingHistory.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{order.tableNumber}</TableCell>
                        <TableCell>₹{order.total?.toFixed(2)}</TableCell>
                        <TableCell textTransform="capitalize">{order.paymentMethod}</TableCell>
                        <TableCell>{order.paidAt ? new Date(order.paidAt).toLocaleString() : '-'}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Print />}
                            onClick={() => handleReprint(order)}
                          >
                            Reprint
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Payment - {selectedOrder?.orderNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="h4" align="center" color="primary" gutterBottom>
              ₹{selectedOrder?.total?.toFixed(2)}
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary">
              Table {selectedOrder?.tableNumber}
            </Typography>
          </Box>

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Payment Method</Typography>
            <RadioGroup
              row
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <FormControlLabel value="cash" control={<Radio />} label="Cash" />
              <FormControlLabel value="card" control={<Radio />} label="Card" />
              <FormControlLabel value="upi" control={<Radio />} label="UPI" />
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            label="Amount Received"
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>
            }}
          />

          {parseFloat(amountPaid) >= selectedOrder?.total && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" color="success.contrastText">
                Change: ₹{(parseFloat(amountPaid) - selectedOrder?.total).toFixed(2)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={processPayment}
            startIcon={<CheckCircle />}
          >
            Complete Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Bill Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Successful - Bill</DialogTitle>
        <DialogContent>
          {paidOrder && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>VELA RESTAURANT</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>Order No: {paidOrder.orderNumber}</Typography>
              <Typography>Table: {paidOrder.tableNumber}</Typography>
              <Typography>Date: {new Date().toLocaleString()}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Items:</Typography>
              {paidOrder.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{item.name} x{item.quantity}</Typography>
                  <Typography>₹{item.price * item.quantity}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">₹{paidOrder.total}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">Payment Method:</Typography>
                <Typography variant="body2" textTransform="capitalize">{paidOrder.paymentMethod}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Amount Paid:</Typography>
                <Typography variant="body2">₹{paidOrder.amountPaid}</Typography>
              </Box>
              {paidOrder.amountPaid > paidOrder.total && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Change:</Typography>
                  <Typography variant="body2">₹{(paidOrder.amountPaid - paidOrder.total).toFixed(2)}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<Print />}
            onClick={() => printBill(paidOrder)}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reprint Bill Dialog */}
      <Dialog open={reprintDialogOpen} onClose={() => setReprintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reprint Bill - {reprintOrder?.orderNumber}</DialogTitle>
        <DialogContent>
          {reprintOrder && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>VELA RESTAURANT</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>Order No: {reprintOrder.orderNumber}</Typography>
              <Typography>Table: {reprintOrder.tableNumber}</Typography>
              <Typography>Date: {reprintOrder.paidAt ? new Date(reprintOrder.paidAt).toLocaleString() : '-'}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Items:</Typography>
              {reprintOrder.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{item.name} x{item.quantity}</Typography>
                  <Typography>₹{item.price * item.quantity}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">₹{reprintOrder.total}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">Payment Method:</Typography>
                <Typography variant="body2" textTransform="capitalize">{reprintOrder.paymentMethod}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReprintDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<Print />}
            onClick={() => {
              printBill(reprintOrder);
              setReprintDialogOpen(false);
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Biller;
