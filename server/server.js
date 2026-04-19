require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in .env file');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { initDB, connectDB, findUserByUsername, findUserById, createUser, getAllUsers, updateUser, deactivateUser, reactivateUser, deleteUser, getAllCategories, createCategory, updateCategory, deleteCategory, getAllMenuItems, getMenuItemsGrouped, createMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem, getAllTables, getTablesWithOrders, createTable, updateTable, updateTableStatus, deleteTable, getAllOrders, getActiveOrders, getOrderById, createOrder, updateOrder, processPayment, deleteOrder, mongoose } = require('./config/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid user' });
    
    req.user = user;
    next();
  } catch (error) {
    // Return specific message for token validation errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(401).json({ message: 'Token invalid' });
  }
};

// RBAC middleware
const rbac = (...perms) => (req, res, next) => {
  const rolePerms = { admin: ['*'], waiter: ['orders:create', 'tables:read'], biller: ['orders:*', 'tables:read'] };
  if (rolePerms[req.user.role]?.includes('*')) return next();
  if (!perms.some(p => rolePerms[req.user.role]?.includes(p))) return res.status(403).json({ message: 'Forbidden' });
  next();
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login error' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, name: req.user.name, role: req.user.role });
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getAllCategories(req.query.active === 'true');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});
app.get('/api/categories/all', auth, rbac('*'), async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});
app.post('/api/categories', auth, rbac('*'), async (req, res) => {
  try {
    const cat = await createCategory(req.body);
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category' });
  }
});
app.put('/api/categories/:id', auth, rbac('*'), async (req, res) => {
  try {
    const cat = await updateCategory(req.params.id, req.body);
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category' });
  }
});
app.delete('/api/categories/:id', auth, rbac('*'), async (req, res) => {
  try {
    await deleteCategory(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Menu
app.get('/api/menu', async (req, res) => {
  try {
    const items = await getAllMenuItems({ isAvailable: req.query.available === 'true', category: req.query.category });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu' });
  }
});
app.get('/api/menu/grouped', async (req, res) => {
  try {
    const items = await getMenuItemsGrouped();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu' });
  }
});
app.get('/api/menu/all', auth, rbac('*'), async (req, res) => {
  try {
    const items = await getAllMenuItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu' });
  }
});
app.post('/api/menu', auth, rbac('*'), async (req, res) => {
  try {
    const item = await createMenuItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error creating menu item' });
  }
});
app.put('/api/menu/:id', auth, rbac('*'), async (req, res) => {
  try {
    const item = await updateMenuItem(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating menu item' });
  }
});
app.put('/api/menu/:id/availability', auth, rbac('*'), async (req, res) => {
  try {
    const item = await toggleMenuItemAvailability(req.params.id);
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling availability' });
  }
});
app.delete('/api/menu/:id', auth, rbac('*'), async (req, res) => {
  try {
    await deleteMenuItem(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu item' });
  }
});

// Tables
app.get('/api/tables', auth, async (req, res) => {
  try {
    const tables = await getAllTables();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tables' });
  }
});
app.get('/api/tables/with-orders', auth, async (req, res) => {
  try {
    const tables = await getTablesWithOrders();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tables' });
  }
});
app.post('/api/tables', auth, rbac('*'), async (req, res) => {
  try {
    const t = await createTable(req.body);
    res.status(201).json(t);
  } catch (error) {
    res.status(500).json({ message: 'Error creating table' });
  }
});
app.put('/api/tables/:id', auth, rbac('*'), async (req, res) => {
  try {
    const t = await updateTable(req.params.id, req.body);
    res.json(t);
  } catch (error) {
    res.status(500).json({ message: 'Error updating table' });
  }
});
app.put('/api/tables/:id/status', auth, async (req, res) => {
  try {
    const t = await updateTableStatus(req.params.id, req.body.status);
    io.emit('table:update', t);
    res.json(t);
  } catch (error) {
    res.status(500).json({ message: 'Error updating table status' });
  }
});
app.delete('/api/tables/:id', auth, rbac('*'), async (req, res) => {
  try {
    await deleteTable(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting table' });
  }
});

// Orders
app.get('/api/orders', auth, async (req, res) => {
  try {
    const orders = await getAllOrders({ status: req.query.status, paymentStatus: req.query.paymentStatus });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});
app.get('/api/orders/active', auth, async (req, res) => {
  try {
    const orders = await getActiveOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});
app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const o = await getOrderById(req.params.id);
    if (!o) return res.status(404).json({ message: 'Not found' });
    res.json(o);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order' });
  }
});
app.post('/api/orders', auth, async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, items, notes, discount, discountType, taxRate } = req.body;

    
    let table = null;
    if (tableId) {
      const tables = await getAllTables();

      // First try to find by ID, then try by tableNumber as fallback
      table = tables.find(t => 
        String(t._id) === String(tableId) || 
        String(t.id) === String(tableId) ||
        t.id === parseInt(tableId) ||
        t.tableNumber === req.body.tableNumber  // Fallback by tableNumber
      );
      
    }
    const isTakeaway = parseInt(tableId) === 0 || req.body.isTakeaway;
    if (!table && !isTakeaway) return res.status(404).json({ message: 'Table not found' });
    
    let subtotal = 0;
    const orderItems = items.map(item => { subtotal += (item.price || 0) * item.quantity; return { ...item, name: item.name || 'Item', price: item.price || 0 }; });
    
    let discountAmount = discount ? (discountType === 'percentage' ? subtotal * discount / 100 : discount) : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxRateNum = taxRate || 0;
    const taxAmount = taxableAmount * taxRateNum / 100;
    const total = taxableAmount + taxAmount;
    

    const order = await createOrder({ 
      tableId: tableId, 
      tableNumber: isTakeaway ? 'TAKEAWAY' : table?.tableNumber, 
      waiterId: req.user.id, 
      customerName: customerName || '', 
      customerPhone: customerPhone || '', 
      items: orderItems, 
      subtotal, 
      discount: discount || 0, 
      discountType: discountType || 'percentage',
      taxRate: taxRateNum,
      taxAmount,
      total, 
      notes, 
      isTakeaway 
    });

    
    res.status(201).json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Error creating order: ' + error.message });
  }
});

// Update order
app.put('/api/orders/:id', auth, async (req, res) => {
  try {
    const { items, subtotal, total, taxAmount, notes } = req.body;
    const order = await updateOrder(req.params.id, { items, subtotal, total, taxAmount, notes });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Emit socket event
    io.emit('order:updated', order);
    
    res.json(order);
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ message: 'Error updating order: ' + error.message });
  }
});

// Update order status (PATCH)
app.patch('/api/orders/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await updateOrder(req.params.id, { status });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Emit socket event
    io.emit('order:updated', order);
    
    res.json(order);
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Error updating order status: ' + error.message });
  }
});

app.put('/api/orders/:id/payment', auth, async (req, res) => {
  try {
    const { paymentMethod, amountPaid } = req.body;
    const order = await processPayment(req.params.id, { paymentMethod, amountPaid: parseFloat(amountPaid) });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Emit table update event
    if (order.tableId) {
      io.emit('table:update', { _id: order.tableId, status: 'available', current_order_id: null });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Payment processing error' });
  }
});

// Delete order
app.delete('/api/orders/:id', auth, async (req, res) => {
  try {
    const result = await deleteOrder(req.params.id);
    if (!result) return res.status(404).json({ message: 'Order not found' });
    
    // Emit socket event for order deletion
    io.emit('order-deleted', { orderId: req.params.id });
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Users
app.get('/api/users', auth, rbac('*'), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});
app.post('/api/users', auth, rbac('*'), async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ username, password: hashedPassword, role: role || 'waiter', name });
    res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, isActive: true });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});
app.put('/api/users/:id', auth, rbac('*'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await updateUser(req.params.id, data);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});
app.delete('/api/users/:id', auth, rbac('*'), async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Reactivate user
app.put('/api/users/:id/reactivate', auth, rbac('*'), async (req, res) => {
  try {
    const user = await reactivateUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User reactivated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error reactivating user' });
  }
});

// Reports & Analytics
// Helper function to calculate date range
const getDateRange = (range) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate = null;
  let endDate = null;
  
  switch (range) {
    case 'today':
      startDate = today;
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      startDate = yesterday;
      endDate = new Date(today.getTime() - 1);
      break;
    case 'week':
      // Start from beginning of current week (Sunday)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      startDate = weekStart;
      // End of today
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      endDate = weekEnd;
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      // End of current month
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      endDate = monthEnd;
      break;
    case 'all':
    default:
      startDate = null;
      endDate = null;
      break;
  }
  
  return { startDate, endDate };
};

// Helper to filter by date range
const filterByDateRange = (items, range, startDate, endDate) => {
  // If custom dates provided, use them
  let customStart = startDate ? new Date(startDate + 'T00:00:00.000') : null;
  let customEnd = endDate ? new Date(endDate + 'T23:59:59.999') : null;
  

  
  // Otherwise use range parameter
  if (!customStart && !customEnd) {
    const dateRange = getDateRange(range);
    customStart = dateRange.startDate;
    customEnd = dateRange.endDate;
  }
  
  if (!customStart && !customEnd) return items;
  
  return items.filter(item => {
    const itemDate = new Date(item.updatedAt || item.createdAt);
    if (customStart && itemDate < customStart) return false;
    if (customEnd && itemDate > customEnd) return false;
    return true;
  });
};

app.get('/api/reports/sales', auth, rbac('*'), async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const orders = await getAllOrders();
    const filteredOrders = filterByDateRange(orders, range || 'all', startDate, endDate);
    // Filter for paid orders only
    const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = paidOrders.length;
    const totalTax = paidOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
    const totalDiscount = paidOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    res.json({
      totalSales,
      totalOrders,
      totalTax,
      totalDiscount,
      avgOrderValue,
      orders: filteredOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating sales report' });
  }
});

app.get('/api/reports/popular-items', auth, rbac('*'), async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const orders = await getAllOrders();
    const filteredOrders = filterByDateRange(orders, range || 'all', startDate, endDate);
    
    // Filter for paid orders only
    const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
    
    const itemCount = {};
    
    paidOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (itemCount[item.name]) {
            itemCount[item.name].quantity += item.quantity;
            itemCount[item.name].total += (item.price * item.quantity);
          } else {
            itemCount[item.name] = {
              name: item.name,
              quantity: item.quantity,
              total: item.price * item.quantity
            };
          }
        });
      }
    });
    
    const sorted = Object.values(itemCount).sort((a, b) => b.quantity - a.quantity);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: 'Error generating popular items report' });
  }
});

app.get('/api/reports/daily', auth, rbac('*'), async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    let orders = (await getAllOrders()).filter(o => o.paymentStatus === 'paid');
    orders = filterByDateRange(orders, range || 'all', startDate, endDate);
    
    const dailyData = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, orders: 0, sales: 0, tax: 0, discount: 0 };
      }
      dailyData[date].orders += 1;
      dailyData[date].sales += order.total || 0;
      dailyData[date].tax += order.taxAmount || 0;
      dailyData[date].discount += order.discount || 0;
    });
    
    res.json(Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    res.status(500).json({ message: 'Error generating daily report' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Try to connect to MongoDB
    await connectDB();
    res.json({ status: 'ok', db: 'MongoDB', timestamp: new Date().toISOString() });
  } catch (error) {
    res.json({ status: 'ok', db: 'fallback', timestamp: new Date().toISOString() });
  }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  const db = require('./config/database');
  const bcrypt = require('bcryptjs');
  db.initDB();
  const user = db.findUserByUsername('admin');
  const match = user ? bcrypt.compareSync('admin123', user.password) : false;
  res.json({ user: user ? { username: user.username, password: user.password, isActive: user.isActive } : null, match });
});

// Test login endpoint (same logic as auth)
app.post('/api/test-login', (req, res) => {
  const db = require('./config/database');
  const bcrypt = require('bcryptjs');
  const { username, password } = req.body;
  
  console.error('TEST LOGIN - username:', username, 'password:', password);
  
  const user = db.findUserByUsername(username);
  console.error('TEST LOGIN - user found:', user ? user.username : 'null');
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  if (!user.isActive) {
    return res.status(401).json({ message: 'Account is deactivated' });
  }
  
  const isMatch = bcrypt.compareSync(password, user.password);
  console.error('TEST LOGIN - match:', isMatch);
  
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  res.json({ success: true, user: { username: user.username, role: user.role } });
});

// Vendor routes
const vendorRoutes = require('./routes/vendors');
app.use('/api', vendorRoutes);

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    await initDB();
    console.log('🗄️  Database initialized');
    // Check if we need to seed demo data (only when MongoDB is available)
    const tables = await getAllTables();
    if (tables.length === 0 && mongoose.connection.readyState === 1) {
      console.log('🌱 Seeding production data...');
      try {
        const seedProduction = require('./seeders/demo');
        await seedProduction(true);
      } catch (seedError) {
        console.log('Seeder skipped (error: ' + seedError.message + ')');
      }
    } else if (tables.length === 0 && mongoose.connection.readyState !== 1) {
      // Seed demo data for in-memory storage
      console.log('🌱 Seeding demo data for in-memory storage...');
      await seedInMemoryDemoData();
    } else {
      console.log('✅ Database already populated - skipping seeding');
    }
    
     server.listen(PORT, () => {
       console.log(`✅ Server running on port ${PORT}`);
       console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
       console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
       console.log(`🗄️  Database: ${process.env.MONGODB_URI ? 'MongoDB' : 'In-Memory'}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close other applications or use a different port.`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Seed demo data for in-memory storage
const seedInMemoryDemoData = async () => {
  // Create demo users
  const adminUser = await createUser({
    username: 'admin',
    password: '$2a$10$Jno92iCMcziATWO6BchIlekB/Pbcqw/o0nl0ohU3b.5EZAZ8ETTdS',
    name: 'Administrator',
    role: 'admin',
    isActive: true
  });
  
  await createUser({
    username: 'waiter',
    password: '$2a$10$7E1EUsP7forfOdc/moxEAeqFNNqw1NzKOkP.WXHpZT877XIzJ6Tm6',
    name: 'John Waiter',
    role: 'waiter',
    isActive: true
  });
  
  await createUser({
    username: 'biller',
    password: '$2a$10$R1a4hGvSfQvGTsI8gtUOy.cE9B1o8sPcbicdFwiegrS.neHrxmmD.',
    name: 'Jane Biller',
    role: 'biller',
    isActive: true
  });
  
  // Create categories
  const vegCat = await createCategory({ name: 'Vegetarian', displayOrder: 1, isActive: true });
  const nonVegCat = await createCategory({ name: 'Non-Vegetarian', displayOrder: 2, isActive: true });
  const bevCat = await createCategory({ name: 'Beverages', displayOrder: 3, isActive: true });
  const dessertCat = await createCategory({ name: 'Desserts', displayOrder: 4, isActive: true });
  
  // Create menu items
  await createMenuItem({ name: 'Paneer Butter Masala', category: vegCat.id, price: 250, isAvailable: true, description: 'Cottage cheese in creamy tomato gravy' });
  await createMenuItem({ name: 'Vegetable Biryani', category: vegCat.id, price: 200, isAvailable: true, description: 'Fragrant rice with mixed vegetables' });
  await createMenuItem({ name: 'Dal Makhani', category: vegCat.id, price: 180, isAvailable: true, description: 'Black lentils in creamy sauce' });
  await createMenuItem({ name: 'Chicken Curry', category: nonVegCat.id, price: 300, isAvailable: true, description: 'Traditional chicken curry' });
  await createMenuItem({ name: 'Mutton Biryani', category: nonVegCat.id, price: 400, isAvailable: true, description: 'Aromatic mutton rice dish' });
  await createMenuItem({ name: 'Fish Fry', category: nonVegCat.id, price: 350, isAvailable: true, description: 'Crispy fried fish' });
  await createMenuItem({ name: 'Masala Chai', category: bevCat.id, price: 30, isAvailable: true, description: 'Spiced Indian tea' });
  await createMenuItem({ name: 'Cold Coffee', category: bevCat.id, price: 80, isAvailable: true, description: 'Chilled coffee with ice cream' });
  await createMenuItem({ name: 'Mango Lassi', category: bevCat.id, price: 60, isAvailable: true, description: 'Sweet yogurt mango drink' });
  await createMenuItem({ name: 'Gulab Jamun', category: dessertCat.id, price: 80, isAvailable: true, description: 'Fried milk balls in sugar syrup' });
  await createMenuItem({ name: 'Ice Cream', category: dessertCat.id, price: 100, isAvailable: true, description: 'Assorted flavor ice cream' });
  
  // Create tables
  await createTable({ tableNumber: 'T1', capacity: 4 });
  await createTable({ tableNumber: 'T2', capacity: 4 });
  await createTable({ tableNumber: 'T3', capacity: 6 });
  await createTable({ tableNumber: 'T4', capacity: 6 });
  await createTable({ tableNumber: 'T5', capacity: 8 });
  await createTable({ tableNumber: 'T6', capacity: 2 });
  await createTable({ tableNumber: 'T7', capacity: 2 });
  await createTable({ tableNumber: 'T8', capacity: 4 });
  await createTable({ tableNumber: 'T9', capacity: 6 });
  await createTable({ tableNumber: 'T10', capacity: 8 });
};

startServer();
