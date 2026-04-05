import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Avatar,
  Menu,
  ButtonGroup
} from '@mui/material';
import { 
  Add,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  TrendingDown,
  Store,
  SwapHoriz,
  Close,
  Download,
  FileDownload
} from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = '/api';

const VendorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  
  // Form states
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  
  const [transactionForm, setTransactionForm] = useState({
    type: 'debit',
    amount: '',
    description: '',
    reference: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchTransactions(selectedVendor.id);
    }
  }, [selectedVendor]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showSnackbar('Error fetching vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (vendorId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/vendors/${vendorId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showSnackbar('Error fetching transactions', 'error');
    }
  };

  const handleSaveVendor = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (editingVendor) {
        await axios.put(`${API_URL}/vendors/${editingVendor.id}`, vendorForm, config);
        showSnackbar('Vendor updated successfully');
      } else {
        await axios.post(`${API_URL}/vendors`, vendorForm, config);
        showSnackbar('Vendor created successfully');
      }
      
      setVendorDialogOpen(false);
      setEditingVendor(null);
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      showSnackbar('Error saving vendor', 'error');
    }
  };

  const handleDeleteVendor = async (vendor) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/vendors/${vendor.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Vendor deleted successfully');
      fetchVendors();
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(null);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      showSnackbar('Error deleting vendor', 'error');
    }
  };

  const handleSaveTransaction = async () => {
    if (!selectedVendor) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/vendors/${selectedVendor.id}/transactions`, transactionForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Transaction recorded successfully');
      setTransactionDialogOpen(false);
      setTransactionForm({ type: 'debit', amount: '', description: '', reference: '' });
      fetchTransactions(selectedVendor.id);
      fetchVendors(); // Refresh to get updated balance
      // Refresh selected vendor
      const updatedVendor = vendors.find(v => v.id === selectedVendor.id);
      if (updatedVendor) {
        setSelectedVendor(updatedVendor);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      showSnackbar('Error creating transaction', 'error');
    }
  };

  const openVendorDialog = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorForm({
        name: vendor.name || '',
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || ''
      });
    } else {
      setEditingVendor(null);
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    }
    setVendorDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!selectedVendor || transactions.length === 0) {
      showSnackbar('No transactions to export', 'warning');
      return;
    }

    const exportData = transactions.map(t => ({
      Date: formatDate(t.createdAt),
      Type: t.type.toUpperCase(),
      Amount: t.amount,
      Description: t.description || '',
      Reference: t.reference || '',
      'Balance After': t.balanceAfter
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `${selectedVendor.name}_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Exported to Excel successfully');
    setExportAnchorEl(null);
  };

  // Export vendors list
  const exportVendorsToExcel = () => {
    if (vendors.length === 0) {
      showSnackbar('No vendors to export', 'warning');
      return;
    }

    const exportData = vendors.map(v => ({
      Name: v.name,
      'Contact Person': v.contactPerson || '',
      Phone: v.phone || '',
      Email: v.email || '',
      Address: v.address || '',
      Balance: v.balance || 0,
      'Created At': formatDate(v.createdAt)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
    XLSX.writeFile(wb, `vendors_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Exported vendors to Excel successfully');
    setExportAnchorEl(null);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'success';
    if (balance < 0) return 'error';
    return 'default';
  };

  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Vendor Transactions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<FileDownload />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={() => setExportAnchorEl(null)}
          >
            <MenuItem onClick={exportVendorsToExcel}>
              <Download sx={{ mr: 1 }} />
              Export Vendors List
            </MenuItem>
            <MenuItem onClick={exportToExcel} disabled={!selectedVendor}>
              <Download sx={{ mr: 1 }} />
              Export Transactions
            </MenuItem>
          </Menu>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => openVendorDialog()}
          >
            Add Vendor
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Vendor List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vendors ({vendors.length})
              </Typography>
              
              {loading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : vendors.length === 0 ? (
                <Typography color="text.secondary">No vendors yet. Add one to get started.</Typography>
              ) : (
                <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {vendors.map((vendor) => (
                    <Paper 
                      key={vendor.id} 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        cursor: 'pointer',
                        bgcolor: selectedVendor?.id === vendor.id ? 'primary.light' : 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {vendor.name}
                          </Typography>
                          {vendor.contactPerson && (
                            <Typography variant="body2" color="text.secondary">
                              {vendor.contactPerson}
                            </Typography>
                          )}
                          {vendor.phone && (
                            <Typography variant="body2" color="text.secondary">
                              {vendor.phone}
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openVendorDialog(vendor); }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteVendor(vendor); }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={`Balance: ₹${formatCurrency(vendor.balance || 0)}`}
                          color={getBalanceColor(vendor.balance)}
                          size="small"
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Transaction Details */}
        <Grid item xs={12} md={8}>
          {selectedVendor ? (
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">
                      {selectedVendor.name}
                    </Typography>
                    <Chip 
                      label={`Current Balance: ₹${formatCurrency(selectedVendor.balance || 0)}`}
                      color={getBalanceColor(selectedVendor.balance)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Button 
                    variant="contained" 
                    color="success"
                    startIcon={<Add />}
                    onClick={() => setTransactionDialogOpen(true)}
                  >
                    Add Transaction
                  </Button>
                </Box>

                <Tabs 
                  value={currentTab} 
                  onChange={(e, v) => setCurrentTab(v)}
                  sx={{ mb: 2 }}
                >
                  <Tab label="All Transactions" />
                  <Tab label="Debit" />
                  <Tab label="Credit" />
                </Tabs>

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingDown color="error" />
                        <Typography variant="subtitle2">Total Debit</Typography>
                      </Box>
                      <Typography variant="h6" color="error">
                        ₹{formatCurrency(totalDebit)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp color="success" />
                        <Typography variant="subtitle2">Total Credit</Typography>
                      </Box>
                      <Typography variant="h6" color="success">
                        ₹{formatCurrency(totalCredit)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Transaction Table */}
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Amount</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell><strong>Reference</strong></TableCell>
                        <TableCell><strong>Balance After</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions
                          .filter(t => currentTab === 0 || (currentTab === 1 && t.type === 'debit') || (currentTab === 2 && t.type === 'credit'))
                          .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={transaction.type.toUpperCase()}
                                color={transaction.type === 'debit' ? 'error' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              ₹{formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>{transaction.description || '-'}</TableCell>
                            <TableCell>{transaction.reference || '-'}</TableCell>
                            <TableCell>₹{formatCurrency(transaction.balanceAfter)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pb: 8 }}>
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Store sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Vendor Transactions - Select a vendor to view transactions
                </Typography>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Vendor Dialog */}
      <Dialog open={vendorDialogOpen} onClose={() => setVendorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            <IconButton onClick={() => setVendorDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Vendor Name"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contact Person"
              value={vendorForm.contactPerson}
              onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={2}
              value={vendorForm.address}
              onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveVendor}
            disabled={!vendorForm.name}
          >
            {editingVendor ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onClose={() => setTransactionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Record Transaction
            <IconButton onClick={() => setTransactionDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={transactionForm.type}
                label="Transaction Type"
                onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
              >
                <MenuItem value="debit">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown color="error" />
                    Debit (Payment to Vendor)
                  </Box>
                </MenuItem>
                <MenuItem value="credit">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp color="success" />
                    Credit (Receive from Vendor)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={transactionForm.amount}
              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
              required
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              value={transactionForm.description}
              onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Reference (Invoice No., etc.)"
              value={transactionForm.reference}
              onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveTransaction}
            disabled={!transactionForm.amount || parseFloat(transactionForm.amount) <= 0}
          >
            Record Transaction
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorDashboard;