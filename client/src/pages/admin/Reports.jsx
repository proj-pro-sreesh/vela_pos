import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Button,
  TextField,
  MenuItem,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AttachMoney, 
  Receipt, 
  LocalDining,
  Refresh,
  Download,
  TableChart,
  PictureAsPdf,
  Visibility,
  Payment,
  Print,
  TakeoutDining
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportAPI, orderAPI } from '../../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState({ upi: 0, cash: 0, card: 0, upiCount: 0, cashCount: 0, cardCount: 0 });
  const [popularItems, setPopularItems] = useState([]);
  const [orderTypeBreakdown, setOrderTypeBreakdown] = useState({ tableOrders: 0, tableRevenue: 0, takeawayOrders: 0, takeawayRevenue: 0 });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('restaurantSettings');
    return saved ? JSON.parse(saved) : {};
  });

  // Helper function to format currency with commas
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    fetchReports();
    fetchBillingHistory();
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch billing history and reports when tab changes
  useEffect(() => {
    if (currentTab === 1) {
      fetchReports();
    } else if (currentTab === 3) {
      fetchBillingHistory();
    }
  }, [currentTab, dateRange, customStartDate, customEndDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { range: dateRange };
      // Add custom date range if selected
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const [sales, popular] = await Promise.all([
        reportAPI.getSales(params),
        reportAPI.getPopularItems(params)
      ]);
      setSalesData(sales.data);
      setPopularItems(popular.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const response = await orderAPI.getAll({});
      let allOrders = response.data || [];
      
      console.log('Total orders from API:', allOrders.length);
      console.log('Sample order:', allOrders[0]);
      
      // Filter for paid orders
      const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
      console.log('Paid orders:', paidOrders.length);
      
      // Filter by date range on client side
      const now = new Date();
      let startDate, endDate;
      
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (dateRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      } else if (dateRange === 'week') {
        // Start from beginning of current week (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        // End of today
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // End of current month
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        endDate = monthEnd;
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate + 'T23:59:59.999');
      } else {
        // Default to today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
      
      const filteredOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.updatedAt || o.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      console.log('Filtered orders:', filteredOrders.length, 'startDate:', startDate, 'endDate:', endDate);
      
      setBillingHistory(filteredOrders);
      
      // Calculate payment breakdown
      const breakdown = { upi: 0, cash: 0, card: 0, upiCount: 0, cashCount: 0, cardCount: 0 };
      filteredOrders.forEach(order => {
        const method = (order.paymentMethod || '').toLowerCase();
        if (method === 'upi') {
          breakdown.upi += order.total || 0;
          breakdown.upiCount++;
        } else if (method === 'cash') {
          breakdown.cash += order.total || 0;
          breakdown.cashCount++;
        } else if (method === 'card') {
          breakdown.card += order.total || 0;
          breakdown.cardCount++;
        }
      });
      setPaymentBreakdown(breakdown);

      // Calculate order type breakdown (table orders vs takeaway)
      const orderType = { tableOrders: 0, tableRevenue: 0, takeawayOrders: 0, takeawayRevenue: 0 };
      filteredOrders.forEach(order => {
        if (order.isTakeaway || order.tableNumber === 'TAKEAWAY') {
          orderType.takeawayOrders++;
          orderType.takeawayRevenue += order.total || 0;
        } else {
          orderType.tableOrders++;
          orderType.tableRevenue += order.total || 0;
        }
      });
      setOrderTypeBreakdown(orderType);
    } catch (error) {
      console.error('Error fetching billing history:', error);
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setViewBillDialogOpen(true);
  };

  // Export to Excel
  const exportToExcel = () => {
    setExportAnchorEl(null);
    
    // Prepare summary data
    const summaryData = [
      { Metric: 'Total Sales', Value: salesData?.totalSales?.toFixed(2) || 0 },
      { Metric: 'Total Orders', Value: salesData?.totalOrders || 0 },
      { Metric: 'Average Order Value', Value: salesData?.avgOrderValue?.toFixed(2) || 0 },
      { Metric: 'Tax Collected', Value: salesData?.totalTax?.toFixed(2) || 0 }
    ];

    // Prepare payment summary data
    const totalPayment = ((paymentBreakdown.upi || 0) + (paymentBreakdown.cash || 0) + (paymentBreakdown.card || 0));
    const paymentData = [
      { 'Payment Method': 'UPI', 'Amount': paymentBreakdown.upi?.toFixed(2) || 0, 'Transactions': paymentBreakdown.upiCount || 0, '% of Total': ((paymentBreakdown.upi / (salesData?.totalSales || 1)) * 100).toFixed(1) + '%' },
      { 'Payment Method': 'Cash', 'Amount': paymentBreakdown.cash?.toFixed(2) || 0, 'Transactions': paymentBreakdown.cashCount || 0, '% of Total': ((paymentBreakdown.cash / (salesData?.totalSales || 1)) * 100).toFixed(1) + '%' },
      { 'Payment Method': 'Card', 'Amount': paymentBreakdown.card?.toFixed(2) || 0, 'Transactions': paymentBreakdown.cardCount || 0, '% of Total': ((paymentBreakdown.card / (salesData?.totalSales || 1)) * 100).toFixed(1) + '%' },
      { 'Payment Method': 'Total', 'Amount': totalPayment.toFixed(2), 'Transactions': (paymentBreakdown.upiCount || 0) + (paymentBreakdown.cashCount || 0) + (paymentBreakdown.cardCount || 0), '% of Total': '100%' }
    ];

    // Prepare billing history data
    const billingData = billingHistory.map((order) => ({
      'Order Number': order.orderNumber,
      'Table': order.tableNumber || 'Takeaway',
      'Items': order.items?.length || 0,
      'Total': order.total?.toFixed(2) || 0,
      'Payment Method': order.paymentMethod || 'N/A',
      'Date': order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Add payment summary sheet
    const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, paymentSheet, 'Payment Summary');

    // Add billing history sheet
    if (billingData.length > 0) {
      const billingSheet = XLSX.utils.json_to_sheet(billingData);
      XLSX.utils.book_append_sheet(wb, billingSheet, 'Billing History');
    }

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Reports_${dateStr}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    setExportAnchorEl(null);
    
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Title
      doc.setFontSize(18);
      doc.text('VELA RESTAURANT - Reports', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated on: ${dateStr}`, 14, 30);

      // Summary Section
      doc.setFontSize(14);
      doc.text('Summary', 14, 45);
      
      doc.setFontSize(10);
      const summaryData = [
        ['Total Sales', `₹${salesData?.totalSales?.toFixed(2) || 0}`],
        ['Total Orders', `${salesData?.totalOrders || 0}`],
        ['Average Order Value', `₹${salesData?.avgOrderValue?.toFixed(2) || 0}`]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Payment Summary Section
      doc.setFontSize(14);
      doc.text('Payment Summary', 14, doc.lastAutoTable.finalY + 15);
      
      const totalPayment = ((paymentBreakdown.upi || 0) + (paymentBreakdown.cash || 0) + (paymentBreakdown.card || 0));
      const paymentData = [
        ['UPI', `₹${paymentBreakdown.upi?.toFixed(2) || 0}`, `${paymentBreakdown.upiCount || 0}`, `${((paymentBreakdown.upi / (salesData?.totalSales || 1)) * 100).toFixed(1)}%`],
        ['Cash', `₹${paymentBreakdown.cash?.toFixed(2) || 0}`, `${paymentBreakdown.cashCount || 0}`, `${((paymentBreakdown.cash / (salesData?.totalSales || 1)) * 100).toFixed(1)}%`],
        ['Card', `₹${paymentBreakdown.card?.toFixed(2) || 0}`, `${paymentBreakdown.cardCount || 0}`, `${((paymentBreakdown.card / (salesData?.totalSales || 1)) * 100).toFixed(1)}%`],
        ['Total', `₹${totalPayment.toFixed(2)}`, `${(paymentBreakdown.upiCount || 0) + (paymentBreakdown.cashCount || 0) + (paymentBreakdown.cardCount || 0)}`, '100%']
      ];

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Payment Method', 'Amount', 'Transactions', '% of Total']],
        body: paymentData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Billing History Section
      doc.setFontSize(14);
      doc.text('Billing History', 14, doc.lastAutoTable.finalY + 15);
      
      const billingData = billingHistory.slice(0, 30).map((order) => [
        order.orderNumber,
        order.tableNumber || 'Takeaway',
        order.items?.length || 0,
        `₹${order.total?.toFixed(2)}`,
        order.paymentMethod || 'N/A',
        order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : '-'
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Order No', 'Table', 'Items', 'Total', 'Payment', 'Date']],
        body: billingData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        fontSize: 8
      });

      doc.save(`Reports_${dateStr}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  // Print Report
  const printReport = () => {
    setExportAnchorEl(null);
    
    const dateStr = new Date().toLocaleDateString();
    const rangeLabel = dateRange === 'today' ? 'Today' : 
                       dateRange === 'yesterday' ? 'Yesterday' : 
                       dateRange === 'week' ? 'This Week' : 
                       dateRange === 'month' ? 'This Month' : 
                       `${customStartDate} to ${customEndDate}`;
    
    // Build payment summary rows
    const totalPayment = ((paymentBreakdown.upi || 0) + (paymentBreakdown.cash || 0) + (paymentBreakdown.card || 0));
    
    // Build billing history table rows
    const billingRows = billingHistory.map(order => `
      <tr>
        <td>${order.orderNumber}</td>
        <td>${order.tableNumber || 'Takeaway'}</td>
        <td>${order.items?.length || 0}</td>
        <td>₹${order.total?.toFixed(2)}</td>
        <td>${order.paymentMethod || 'N/A'}</td>
        <td>${order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}</td>
      </tr>
    `).join('');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Restaurant Report - ${dateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          h2 { color: #555; border-bottom: 2px solid #333; padding-bottom: 5px; }
          .header-info { text-align: center; margin-bottom: 20px; }
          .summary-grid { display: flex; justify-content: space-around; margin: 20px 0; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
          .summary-card h3 { margin: 0; color: #666; }
          .summary-card .amount { font-size: 24px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #333; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .payment-upi { color: #7c3aed; }
          .payment-cash { color: #059669; }
          .payment-card { color: #dc2626; }
          .total-row { font-weight: bold; background-color: #eee !important; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>VELA RESTAURANT</h1>
        <div class="header-info">
          <p><strong>Report Date:</strong> ${dateStr}</p>
          <p><strong>Date Range:</strong> ${rangeLabel}</p>
        </div>
        
        <h2>Sales Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Sales</h3>
            <div class="amount">₹${salesData?.totalSales?.toFixed(2) || 0}</div>
          </div>
          <div class="summary-card">
            <h3>Total Orders</h3>
            <div class="amount">${salesData?.totalOrders || 0}</div>
          </div>
          <div class="summary-card">
            <h3>Average Order</h3>
            <div class="amount">₹${salesData?.avgOrderValue?.toFixed(2) || 0}</div>
          </div>
        </div>
        
        <h2>Payment Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Amount</th>
              <th>Transactions</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="payment-upi"><strong>UPI</strong></td>
              <td>₹${paymentBreakdown.upi?.toFixed(2) || 0}</td>
              <td>${paymentBreakdown.upiCount || 0}</td>
              <td>${((paymentBreakdown.upi / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td class="payment-cash"><strong>Cash</strong></td>
              <td>₹${paymentBreakdown.cash?.toFixed(2) || 0}</td>
              <td>${paymentBreakdown.cashCount || 0}</td>
              <td>${((paymentBreakdown.cash / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td class="payment-card"><strong>Card</strong></td>
              <td>₹${paymentBreakdown.card?.toFixed(2) || 0}</td>
              <td>${paymentBreakdown.cardCount || 0}</td>
              <td>${((paymentBreakdown.card / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>₹${totalPayment.toFixed(2)}</strong></td>
              <td><strong>${(paymentBreakdown.upiCount || 0) + (paymentBreakdown.cashCount || 0) + (paymentBreakdown.cardCount || 0)}</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
        
        <h2>Billing History (${billingHistory.length} orders)</h2>
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Table</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment Method</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${billingRows}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return <Box sx={{ p: 3 }}><LinearProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Reports & Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>
          {dateRange === 'custom' && (
            <>
              <TextField
                type="date"
                size="small"
                label="From"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
              <TextField
                type="date"
                size="small"
                label="To"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 150 }}
              />
            </>
          )}
          <Button 
            startIcon={<Refresh />} 
            variant="outlined"
            onClick={() => {
              fetchReports();
              fetchBillingHistory();
            }}
          >
            Refresh
          </Button>
          <Button 
            startIcon={<Download />} 
            variant="contained"
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
          >
            <MenuItem onClick={exportToExcel}>
              <TableChart sx={{ mr: 1 }} /> Export to Excel
            </MenuItem>
            <MenuItem onClick={exportToPDF}>
              <PictureAsPdf sx={{ mr: 1 }} /> Export to PDF
            </MenuItem>
            <MenuItem onClick={printReport}>
              <Print sx={{ mr: 1 }} /> Print Report
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Summary" />
        <Tab label="Selling Items" />
        <Tab label="Payment Report" />
        <Tab label={`Billing History (${billingHistory.length})`} />
      </Tabs>

      {currentTab === 0 && (
      <>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white', minHeight: 120 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Sales</Typography>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>₹{formatCurrency(salesData?.totalSales)}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <AttachMoney />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'success.main', color: 'white', minHeight: 120 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Orders</Typography>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>{salesData?.totalOrders || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <Receipt />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white', minHeight: 120 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Items Sold</Typography>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>{popularItems.reduce((sum, item) => sum + item.quantity, 0) || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <LocalDining />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'info.main', color: 'white', minHeight: 120 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Table Orders</Typography>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>{orderTypeBreakdown.tableOrders || 0}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>₹{formatCurrency(orderTypeBreakdown.tableRevenue)}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <TableChart />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white', minHeight: 120 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Takeaway Orders</Typography>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>{orderTypeBreakdown.takeawayOrders || 0}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>₹{formatCurrency(orderTypeBreakdown.takeawayRevenue)}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <TakeoutDining />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>)}

      {/* Selling Items Tab */}
      {currentTab === 1 && (
        <>
        <Typography variant="h6" sx={{ mb: 3 }}>Selling Items Report</Typography>
        {popularItems.length > 0 ? (
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Quantity Sold</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popularItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.name || 'Unknown Item'}</TableCell>
                        <TableCell align="right">{item.quantity || 0}</TableCell>
                        <TableCell align="right">₹{formatCurrency(item.total || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                No selling items data available for the selected period.
              </Typography>
            </CardContent>
          </Card>
        )}
        </>)}

      {/* Payment Report Tab */}
      {currentTab === 2 && (
        <>
        <Typography variant="h6" sx={{ mb: 3 }}>Payment Method Report</Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#7c3aed', color: 'white', minHeight: 120 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>UPI</Typography>
                    <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>₹{formatCurrency(paymentBreakdown.upi)}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{paymentBreakdown.upiCount || 0} transactions</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    <Payment />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#059669', color: 'white', minHeight: 120 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Cash</Typography>
                    <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>₹{formatCurrency(paymentBreakdown.cash)}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{paymentBreakdown.cashCount || 0} transactions</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    <AttachMoney />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#dc2626', color: 'white', minHeight: 120 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Card</Typography>
                    <Typography variant="h5" sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}>₹{formatCurrency(paymentBreakdown.card)}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{paymentBreakdown.cardCount || 0} transactions</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    <Receipt />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Payment Method Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Payment Details</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>UPI</TableCell>
                    <TableCell align="right">₹{formatCurrency(paymentBreakdown.upi)}</TableCell>
                    <TableCell align="right">{paymentBreakdown.upiCount || 0}</TableCell>
                    <TableCell align="right">{((paymentBreakdown.upi / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Cash</TableCell>
                    <TableCell align="right">₹{formatCurrency(paymentBreakdown.cash)}</TableCell>
                    <TableCell align="right">{paymentBreakdown.cashCount || 0}</TableCell>
                    <TableCell align="right">{((paymentBreakdown.cash / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Card</TableCell>
                    <TableCell align="right">₹{formatCurrency(paymentBreakdown.card)}</TableCell>
                    <TableCell align="right">{paymentBreakdown.cardCount || 0}</TableCell>
                    <TableCell align="right">{((paymentBreakdown.card / (salesData?.totalSales || 1)) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{formatCurrency((paymentBreakdown.upi || 0) + (paymentBreakdown.cash || 0) + (paymentBreakdown.card || 0))}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{(paymentBreakdown.upiCount || 0) + (paymentBreakdown.cashCount || 0) + (paymentBreakdown.cardCount || 0)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        </>
      )}

      {/* Billing History Tab */}
      {currentTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>Billing History</Typography>
            {billingHistory.length === 0 ? (
              <Typography color="text.secondary">No billing history available</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order No</TableCell>
                      <TableCell>Table</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billingHistory.map((bill, index) => (
                      <TableRow key={index}>
                        <TableCell>{bill.orderNumber}</TableCell>
                        <TableCell>{bill.tableNumber || 'Takeaway'}</TableCell>
                        <TableCell>{bill.items?.length || 0} items</TableCell>
                        <TableCell align="right">₹{bill.total?.toFixed(2)}</TableCell>
                        <TableCell textTransform="capitalize">{bill.paymentMethod || 'N/A'}</TableCell>
                        <TableCell>{bill.updatedAt ? new Date(bill.updatedAt).toLocaleString() : '-'}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewBill(bill)}
                          >
                            View Bill
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

      {/* View Bill Dialog */}
      <Dialog open={viewBillDialogOpen} onClose={() => setViewBillDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bill - {selectedBill?.orderNumber}</DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" align="center" gutterBottom>{settings.restaurantName || 'VELA RESTAURANT'}</Typography>
              {settings.address && (
                <Typography variant="body2" align="center" gutterBottom>{settings.address}</Typography>
              )}
              {settings.phone && (
                <Typography variant="body2" align="center" gutterBottom>Ph: {settings.phone}</Typography>
              )}
              {settings.billHeaderEnglish && (
                <Typography variant="body2" align="center" gutterBottom>{settings.billHeaderEnglish}</Typography>
              )}
              {settings.billHeaderTamil && (
                <Typography variant="body2" align="center" gutterBottom sx={{ fontFamily: 'Noto Sans Tamil, sans-serif' }}>{settings.billHeaderTamil}</Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography>Order No: {selectedBill.orderNumber}</Typography>
              <Typography>Table: {selectedBill.tableNumber || 'Takeaway'}</Typography>
              <Typography>Date: {selectedBill.updatedAt ? new Date(selectedBill.updatedAt).toLocaleString() : '-'}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Items:</Typography>
              {selectedBill.items?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{item.name} x{item.quantity}</Typography>
                  <Typography>₹{item.price * item.quantity}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">₹{selectedBill.total}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">Payment Method:</Typography>
                <Typography variant="body2" textTransform="capitalize">{selectedBill.paymentMethod || 'N/A'}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              {settings.billFooter && (
                <Typography variant="body2" align="center" gutterBottom>{settings.billFooter}</Typography>
              )}
              {settings.billFooterTamil && (
                <Typography variant="body2" align="center" gutterBottom sx={{ fontFamily: 'Noto Sans Tamil, sans-serif' }}>{settings.billFooterTamil}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewBillDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
