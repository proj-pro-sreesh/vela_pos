require('dotenv').config();
const mongoose = require('mongoose');

// Import Mongoose models
const User = require('../models/User');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

let isConnected = false;
let useInMemory = false;

// In-memory storage
const inMemoryStorage = {
  users: [],
  categories: [],
  menuItems: [],
  tables: [],
  orders: []
};

// Counter for generating IDs
let idCounter = {
  users: 1,
  categories: 1,
  menuItems: 1,
  tables: 1,
  orders: 1
};

const connectDB = async () => {
  if (isConnected) {
    return;
  }
  
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    isConnected = db.connections[0].readyState;
    console.log(`MongoDB Connected: ${db.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Fall back to in-memory if MongoDB is not available
    console.log('Falling back to in-memory storage...');
    useInMemory = true;
  }
};

const initDB = async () => {
  await connectDB();
  console.log(useInMemory ? 'Database initialized (in-memory)' : 'Database initialized with MongoDB');
};

// Helper to convert mongoose document to plain object with id
const toObject = (doc) => {
  if (!doc) return null;
  if (typeof doc === 'object' && !doc.toObject) {
    // Already a plain object (in-memory storage)
    return { ...doc };
  }
  const obj = doc.toObject();
  obj._id = doc._id;
  obj.id = doc._id.toString();
  return obj;
};

// Generate a new ID for in-memory storage
const generateId = (collection) => {
  const id = idCounter[collection]++;
  return id.toString();
};

// User functions
const findUserByUsername = async (username) => {
  if (useInMemory) {
    const user = inMemoryStorage.users.find(u => u.username === username.toLowerCase());
    return user ? { ...user } : null;
  }
  const user = await User.findOne({ username: username.toLowerCase() });
  return user ? toObject(user) : null;
};

const findUserByEmail = async (email) => {
  if (useInMemory) {
    const user = inMemoryStorage.users.find(u => u.email === email.toLowerCase());
    return user ? { ...user } : null;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  return user ? toObject(user) : null;
};

const findUserById = async (id) => {
  if (useInMemory) {
    const user = inMemoryStorage.users.find(u => u.id === id);
    return user ? { ...user } : null;
  }
  try {
    const user = await User.findById(id);
    return user ? toObject(user) : null;
  } catch (e) {
    return null;
  }
};

const createUser = async (data) => {
  if (useInMemory) {
    const user = {
      id: generateId('users'),
      username: data.username,
      password: data.password,
      name: data.name,
      role: data.role || 'waiter',
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryStorage.users.push(user);
    return { ...user };
  }
  const user = await User.create(data);
  return toObject(user);
};

const getAllUsers = async () => {
  if (useInMemory) {
    return inMemoryStorage.users.map(u => {
      const { password, ...user } = u;
      return user;
    });
  }
  const users = await User.find().select('-password');
  return users.map(toObject);
};

const updateUser = async (id, data) => {
  if (useInMemory) {
    const index = inMemoryStorage.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    // Prevent modifying admin user
    if (inMemoryStorage.users[index].username === 'admin') {
      return null;
    }
    inMemoryStorage.users[index] = { ...inMemoryStorage.users[index], ...data, updatedAt: new Date() };
    const { password, ...user } = inMemoryStorage.users[index];
    return user;
  }
  // Prevent modifying admin user in MongoDB
  const existingUser = await User.findById(id);
  if (existingUser && existingUser.username === 'admin') {
    return null;
  }
  const user = await User.findByIdAndUpdate(id, data, { new: true });
  return user ? toObject(user) : null;
};

const deactivateUser = async (id) => {
  if (useInMemory) {
    const index = inMemoryStorage.users.findIndex(u => u.id === id);
    // Prevent deactivating admin user
    if (index !== -1 && inMemoryStorage.users[index].username === 'admin') {
      return;
    }
    if (index !== -1) {
      inMemoryStorage.users[index].isActive = false;
    }
    return;
  }
  // Prevent deactivating admin user in MongoDB
  const existingUser = await User.findById(id);
  if (existingUser && existingUser.username === 'admin') {
    return;
  }
  await User.findByIdAndUpdate(id, { isActive: false });
};

// Categories
const getAllCategories = async (activeOnly = false) => {
  if (useInMemory) {
    let categories = inMemoryStorage.categories;
    if (activeOnly) {
      categories = categories.filter(c => c.isActive);
    }
    return categories.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  const query = activeOnly ? { isActive: true } : {};
  const categories = await Category.find(query).sort({ displayOrder: 1 });
  return categories.map(toObject);
};

const createCategory = async (data) => {
  if (useInMemory) {
    const category = {
      id: generateId('categories'),
      name: data.name,
      displayOrder: data.displayOrder || 1,
      isActive: data.isActive !== false,
      createdAt: new Date()
    };
    inMemoryStorage.categories.push(category);
    return { ...category };
  }
  const category = await Category.create(data);
  return toObject(category);
};

const updateCategory = async (id, data) => {
  if (useInMemory) {
    const index = inMemoryStorage.categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    inMemoryStorage.categories[index] = { ...inMemoryStorage.categories[index], ...data };
    return { ...inMemoryStorage.categories[index] };
  }
  const category = await Category.findByIdAndUpdate(id, data, { new: true });
  return category ? toObject(category) : null;
};

const deleteCategory = async (id) => {
  if (useInMemory) {
    const index = inMemoryStorage.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      inMemoryStorage.categories.splice(index, 1);
    }
    return;
  }
  await Category.findByIdAndDelete(id);
};

// Menu Items
const getAllMenuItems = async (params = {}) => {
  if (useInMemory) {
    let items = inMemoryStorage.menuItems;
    if (params.isAvailable === 'true' || params.isAvailable === true) {
      items = items.filter(i => i.isAvailable);
    }
    if (params.category) {
      items = items.filter(i => i.category && i.category.toString() === params.category);
    }
    return items.map(item => {
      const cat = inMemoryStorage.categories.find(c => c.id === (item.category?.id || item.category));
      return { ...item, category: cat || null };
    });
  }
  let query = {};
  if (params.isAvailable === 'true' || params.isAvailable === true) {
    query.isAvailable = true;
  }
  if (params.category) {
    query.category = params.category;
  }
  
  const items = await MenuItem.find(query).populate('category');
  return items.map(item => {
    const obj = toObject(item);
    obj.category = item.category ? toObject(item.category) : null;
    return obj;
  });
};

const getMenuItemsGrouped = async () => {
  if (useInMemory) {
    const items = inMemoryStorage.menuItems.filter(i => i.isAvailable);
    const grouped = {};
    items.forEach(item => {
      const catName = item.category?.name || 'Uncategorized';
      const catId = item.category?.id || 'uncategorized';
      
      if (!grouped[catName]) {
        grouped[catName] = {
          id: catId,
          name: catName,
          items: []
        };
      }
      
      grouped[catName].items.push({ ...item });
    });
    
    return Object.values(grouped);
  }
  
  const items = await MenuItem.find({ isAvailable: true }).populate('category');
  
  const grouped = {};
  items.forEach(item => {
    const catName = item.category?.name || 'Uncategorized';
    const catId = item.category?._id?.toString() || 'uncategorized';
    
    if (!grouped[catName]) {
      grouped[catName] = {
        _id: catId,
        name: catName,
        items: []
      };
    }
    
    const obj = toObject(item);
    obj.category = item.category ? toObject(item.category) : null;
    obj.isAvailable = item.isAvailable;
    grouped[catName].items.push(obj);
  });
  
  return Object.values(grouped);
};

const createMenuItem = async (data) => {
  if (useInMemory) {
    const item = {
      id: generateId('menuItems'),
      name: data.name,
      category: data.category,
      price: data.price,
      description: data.description || '',
      isAvailable: data.isAvailable !== false,
      createdAt: new Date()
    };
    inMemoryStorage.menuItems.push(item);
    const cat = inMemoryStorage.categories.find(c => c.id === data.category);
    return { ...item, category: cat || null };
  }
  const item = await MenuItem.create(data);
  const populated = await MenuItem.findById(item._id).populate('category');
  return toObject(populated);
};

const updateMenuItem = async (id, data) => {
  if (useInMemory) {
    const index = inMemoryStorage.menuItems.findIndex(i => i.id === id);
    if (index === -1) return null;
    inMemoryStorage.menuItems[index] = { ...inMemoryStorage.menuItems[index], ...data };
    const cat = inMemoryStorage.categories.find(c => c.id === inMemoryStorage.menuItems[index].category);
    return { ...inMemoryStorage.menuItems[index], category: cat || null };
  }
  const item = await MenuItem.findByIdAndUpdate(id, data, { new: true }).populate('category');
  return item ? toObject(item) : null;
};

const toggleMenuItemAvailability = async (id) => {
  if (useInMemory) {
    const index = inMemoryStorage.menuItems.findIndex(i => i.id === id);
    if (index === -1) return null;
    inMemoryStorage.menuItems[index].isAvailable = !inMemoryStorage.menuItems[index].isAvailable;
    return { ...inMemoryStorage.menuItems[index] };
  }
  const item = await MenuItem.findById(id);
  if (item) {
    item.isAvailable = !item.isAvailable;
    await item.save();
    return toObject(item);
  }
  return null;
};

const deleteMenuItem = async (id) => {
  if (useInMemory) {
    const index = inMemoryStorage.menuItems.findIndex(i => i.id === id);
    if (index !== -1) {
      inMemoryStorage.menuItems.splice(index, 1);
    }
    return;
  }
  await MenuItem.findByIdAndDelete(id);
};

// Tables
const getAllTables = async () => {
  if (useInMemory) {
    return inMemoryStorage.tables.map(t => ({ ...t })).sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
  }
  const tables = await Table.find().sort({ tableNumber: 1 });
  return tables.map(toObject);
};

const getTablesWithOrders = async () => {
  if (useInMemory) {
    return inMemoryStorage.tables.map(table => {
      const order = inMemoryStorage.orders.find(o => 
        o.tableId === table.id && o.status === 'active'
      );
      return {
        ...table,
        order_id: order?.id,
        order_number: order?.orderNumber,
        total: order?.total,
        order_status: order?.status
      };
    });
  }
  const tables = await Table.find().populate({
    path: 'currentOrder',
    match: { status: 'active' }
  });
  
  return tables.map(table => {
    const obj = toObject(table);
    obj.order_id = table.currentOrder?._id?.toString();
    obj.order_number = table.currentOrder?.orderNumber;
    obj.total = table.currentOrder?.total;
    obj.order_status = table.currentOrder?.status;
    return obj;
  });
};

const createTable = async (data) => {
  if (useInMemory) {
    const table = {
      id: generateId('tables'),
      tableNumber: data.tableNumber,
      capacity: data.capacity,
      status: 'available',
      createdAt: new Date()
    };
    inMemoryStorage.tables.push(table);
    return { ...table };
  }
  const table = await Table.create({ ...data, status: 'available' });
  return toObject(table);
};

const updateTable = async (id, data) => {
  if (useInMemory) {
    const index = inMemoryStorage.tables.findIndex(t => t.id === id);
    if (index === -1) return null;
    inMemoryStorage.tables[index] = { ...inMemoryStorage.tables[index], ...data };
    return { ...inMemoryStorage.tables[index] };
  }
  const table = await Table.findByIdAndUpdate(id, data, { new: true });
  return table ? toObject(table) : null;
};

const updateTableStatus = async (id, status) => {
  if (useInMemory) {
    // Handle both id and _id formats
    const index = inMemoryStorage.tables.findIndex(t => 
      t.id === id || t._id === id || String(t.id) === String(id) || String(t._id) === String(id)
    );
    if (index === -1) return null;
    inMemoryStorage.tables[index].status = status;
    if (status === 'available') {
      inMemoryStorage.tables[index].currentOrder = null;
    }
    return { ...inMemoryStorage.tables[index] };
  }
  const update = { status };
  if (status === 'available') {
    update.currentOrder = null;
  }
  // Handle both id and _id for MongoDB
  const table = await Table.findOneAndUpdate(
    { $or: [{ _id: id }, { id: parseInt(id) }] },
    update, 
    { new: true }
  );
  return table ? toObject(table) : null;
};

const deleteTable = async (id) => {
  if (useInMemory) {
    const index = inMemoryStorage.tables.findIndex(t => t.id === id);
    if (index !== -1) {
      inMemoryStorage.tables.splice(index, 1);
    }
    return;
  }
  await Table.findByIdAndDelete(id);
};

// Orders
const getAllOrders = async (params = {}) => {
  console.log('getAllOrders called with params:', params);
  if (useInMemory) {
    let orders = [...inMemoryStorage.orders];
    console.log('In-memory - total orders:', orders.length);
    console.log('Sample order paymentStatus:', orders[0]?.paymentStatus);
    if (params.status) {
      orders = orders.filter(o => o.status === params.status);
    }
    if (params.paymentStatus) {
      console.log('Filtering by paymentStatus:', params.paymentStatus);
      orders = orders.filter(o => o.paymentStatus === params.paymentStatus);
      console.log('After paymentStatus filter:', orders.length);
    }
    // Filter by date range
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      orders = orders.filter(o => new Date(o.createdAt) >= startDate);
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      orders = orders.filter(o => new Date(o.createdAt) <= endDate);
    }
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
      const table = inMemoryStorage.tables.find(t => t.id === order.tableId);
      const waiter = inMemoryStorage.users.find(u => u.id === order.waiterId);
      return { ...order, table: table || null, waiter: waiter ? { id: waiter.id, username: waiter.username, name: waiter.name } : null };
    });
  }
  let query = {};
  if (params.status) query.status = params.status;
  if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
  
  // Filter by date range
  if (params.startDate || params.endDate) {
    query.createdAt = {};
    if (params.startDate) {
      query.createdAt.$gte = new Date(params.startDate);
    }
    if (params.endDate) {
      query.createdAt.$lte = new Date(params.endDate);
    }
  }
  
  const orders = await Order.find(query)
    .populate('table')
    .populate('waiter')
    .sort({ createdAt: -1 });
  
  return orders.map(order => {
    const obj = toObject(order);
    obj.table = order.table ? toObject(order.table) : null;
    obj.waiter = order.waiter ? toObject(order.waiter) : null;
    return obj;
  });
};

const getActiveOrders = async () => {
  if (useInMemory) {
    const orders = inMemoryStorage.orders.filter(o => o.status === 'active');
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
      const table = inMemoryStorage.tables.find(t => t.id === order.tableId);
      const waiter = inMemoryStorage.users.find(u => u.id === order.waiterId);
      return { ...order, table: table || null, waiter: waiter ? { id: waiter.id, username: waiter.username, name: waiter.name } : null };
    });
  }
  const orders = await Order.find({ status: 'active' })
    .populate('table')
    .populate('waiter')
    .sort({ createdAt: -1 });
  
  return orders.map(order => {
    const obj = toObject(order);
    obj.table = order.table ? toObject(order.table) : null;
    obj.waiter = order.waiter ? toObject(order.waiter) : null;
    return obj;
  });
};

const getOrderById = async (id) => {
  if (useInMemory) {
    const order = inMemoryStorage.orders.find(o => o.id === id);
    return order ? { ...order } : null;
  }
  const order = await Order.findById(id);
  return order ? toObject(order) : null;
};

const createOrder = async (data) => {
  // Generate order number with format ORD-DD-MM-YYYY-XXXX
  let orderNumber;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}-${month}-${year}`;
  
  if (useInMemory) {
    // For in-memory, count orders from today
    const todayOrders = inMemoryStorage.orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate.toDateString() === now.toDateString();
    });
    const count = todayOrders.length + 1;
    orderNumber = `ORD-${dateStr}-${String(count).padStart(4, '0')}`;
  } else {
    // Find the highest order number for today in MongoDB
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const lastOrderToday = await Order.findOne({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    }).sort({ orderNumber: -1 });
    
    if (lastOrderToday && lastOrderToday.orderNumber) {
      // Extract the sequence number from the last order
      const parts = lastOrderToday.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1]);
      orderNumber = `ORD-${dateStr}-${String(lastSeq + 1).padStart(4, '0')}`;
    } else {
      orderNumber = `ORD-${dateStr}-0001`;
    }
  }
  
  const isTakeaway = data.tableId === '0' || data.tableId === 0 || data.isTakeaway;
  
  // Get table info if not takeaway
  let tableNumber = 'TAKEAWAY';
  let tableId = null;
  
  if (!isTakeaway && data.tableId) {
    if (useInMemory) {
      const table = inMemoryStorage.tables.find(t => 
        t.id === data.tableId || t._id === data.tableId || String(t.id) === String(data.tableId) || String(t._id) === String(data.tableId)
      );
      if (table) {
        tableNumber = table.tableNumber;
        tableId = table.id;
        table.status = 'occupied';
      }
    } else {
      // Handle both id and _id for MongoDB
      const table = await Table.findOne(
        { $or: [{ _id: data.tableId }, { id: parseInt(data.tableId) }] }
      );
      if (table) {
        tableNumber = table.tableNumber;
        tableId = table._id;
        table.status = 'occupied';
        table.currentOrder = null;
        await table.save();
      }
    }
  }
  
  // Map items to match schema
  const items = data.items.map(item => {
    // For MongoDB, we need to convert menuItemId to a valid ObjectId if possible
    let menuItemValue = item.menuItemId || item.menuItem;
    // If it's a numeric string, try to convert to ObjectId
    if (menuItemValue && !isNaN(menuItemValue)) {
      // For numeric IDs, we'll keep them as-is for now
      // The schema will handle validation
    }
    return {
      menuItem: menuItemValue,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || '',
      status: 'pending'
    };
  });
  
  const orderData = {
    orderNumber,
    table: tableId,
    tableNumber,
    isTakeaway,
    waiter: data.waiterId,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    items,
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    taxRate: data.taxRate || 0,
    discount: data.discount || 0,
    discountType: data.discountType || 'percentage',
    total: data.total || 0,
    paymentStatus: 'pending',
    status: 'active',
    notes: data.notes || ''
  };
  
  let order;
  if (useInMemory) {
    order = {
      id: generateId('orders'),
      ...orderData,
      createdAt: new Date()
    };
    inMemoryStorage.orders.push(order);
    
    // Update table with current order reference
    if (!isTakeaway && data.tableId) {
      // Handle both id and _id formats
      const tableIndex = inMemoryStorage.tables.findIndex(t => 
        t.id === data.tableId || t._id === data.tableId || String(t.id) === String(data.tableId) || String(t._id) === String(data.tableId)
      );
      if (tableIndex !== -1) {
        inMemoryStorage.tables[tableIndex].status = 'occupied';
        inMemoryStorage.tables[tableIndex].currentOrder = order.id;
      }
    }
  } else {
    order = await Order.create(orderData);
    
    // Update table with current order reference
    if (!isTakeaway && data.tableId) {
      // Try to convert tableId to ObjectId for MongoDB
      let tableQuery = data.tableId;
      try {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(data.tableId)) {
          tableQuery = new mongoose.Types.ObjectId(data.tableId);
        }
      } catch (e) {
        // Use the id as-is
      }
      await Table.findOneAndUpdate(
        { $or: [{ _id: tableQuery }, { id: parseInt(data.tableId) }] },
        { 
          status: 'occupied', 
          currentOrder: order._id 
        }
      );
    }
  }
  
  return useInMemory ? { ...order } : toObject(order);
};

const updateOrder = async (id, data) => {
  let order;
  
  // Parse the ID to handle different formats
  const parsedId = isNaN(id) ? id : parseInt(id);
  const idStr = String(id);
  
  if (useInMemory) {
    const index = inMemoryStorage.orders.findIndex(o => 
      o.id === parsedId || o.id === idStr || 
      o._id === parsedId || o._id === idStr ||
      String(o.id) === idStr || String(o._id) === idStr
    );
    if (index === -1) return null;
    
    // Update fields
    if (data.items) inMemoryStorage.orders[index].items = data.items;
    if (data.subtotal !== undefined) inMemoryStorage.orders[index].subtotal = data.subtotal;
    if (data.total !== undefined) inMemoryStorage.orders[index].total = data.total;
    if (data.taxAmount !== undefined) inMemoryStorage.orders[index].taxAmount = data.taxAmount;
    if (data.notes !== undefined) inMemoryStorage.orders[index].notes = data.notes;
    
    order = inMemoryStorage.orders[index];
    return { ...order };
  }
  
  // MongoDB mode - try different ID formats
  const update = {};
  if (data.items) update.items = data.items;
  if (data.subtotal !== undefined) update.subtotal = data.subtotal;
  if (data.total !== undefined) update.total = data.total;
  if (data.taxAmount !== undefined) update.taxAmount = data.taxAmount;
  if (data.notes !== undefined) update.notes = data.notes;
  
  // Try to find by MongoDB _id
  try {
    order = await Order.findByIdAndUpdate(id, update, { new: true });
  } catch (e) {
    console.error('Error finding order by _id:', e);
    // Try by numeric id field
    order = await Order.findOneAndUpdate(
      { id: parsedId },
      update, 
      { new: true }
    );
  }
  return order ? toObject(order) : null;
};

const processPayment = async (id, data) => {
  let order;
  if (useInMemory) {
    order = inMemoryStorage.orders.find(o => o.id === id);
    if (!order) return null;
    
    order.paymentMethod = data.paymentMethod;
    order.amountPaid = parseFloat(data.amountPaid);
    order.paymentStatus = parseFloat(data.amountPaid) >= order.total ? 'paid' : 'partial';
    
    // If fully paid, complete the order
    if (order.paymentStatus === 'paid') {
      order.status = 'completed';
      
      // Update table status
      if (order.tableId) {
        const tableIndex = inMemoryStorage.tables.findIndex(t => 
          t.id === order.tableId || t._id === order.tableId || String(t.id) === String(order.tableId) || String(t._id) === String(order.tableId)
        );
        if (tableIndex !== -1) {
          inMemoryStorage.tables[tableIndex].status = 'available';
          inMemoryStorage.tables[tableIndex].currentOrder = null;
        }
      }
      
      return { ...order };
    }
  }
  
  order = await Order.findById(id);
  if (!order) return null;
  
  order.paymentMethod = data.paymentMethod;
  order.amountPaid = parseFloat(data.amountPaid);
  order.paymentStatus = parseFloat(data.amountPaid) >= order.total ? 'paid' : 'partial';
  
  // If fully paid, complete the order
  if (order.paymentStatus === 'paid') {
    order.status = 'completed';
    
    // Update table status
    if (order.table) {
      await Table.findOneAndUpdate(
        { $or: [{ _id: order.table }, { id: parseInt(order.table) }] },
        {
          status: 'available',
          currentOrder: null
        }
      );
    }
  }
  
  await order.save();
  
  const populatedOrder = await Order.findById(id)
    .populate('table')
    .populate('waiter');
  
  return toObject(populatedOrder);
};

// Delete order
const deleteOrder = async (id) => {
  // Parse the ID to handle different formats
  const parsedId = isNaN(id) ? id : parseInt(id);
  const idStr = String(id);
  
  console.log('deleteOrder called with id:', id, 'parsedId:', parsedId, 'idStr:', idStr);
  console.log('useInMemory:', useInMemory);
  
  if (useInMemory) {
    console.log('Available Order IDs:', inMemoryStorage.orders.map(o => ({ id: o.id, _id: o._id })));
    const index = inMemoryStorage.orders.findIndex(o => 
      o.id === parsedId || o.id === idStr || 
      o._id === parsedId || o._id === idStr ||
      String(o.id) === idStr || String(o._id) === idStr ||
      o.id === id || o._id === id
    );
    console.log('Found index:', index);
    if (index === -1) return null;
    
    const order = inMemoryStorage.orders[index];
    
    // Update table status to available if order was active
    if (order.tableId && order.status === 'active') {
      const tableIndex = inMemoryStorage.tables.findIndex(t => 
        t.id === order.tableId || t._id === order.tableId || 
        String(t.id) === String(order.tableId) || String(t._id) === String(order.tableId)
      );
      if (tableIndex !== -1) {
        inMemoryStorage.tables[tableIndex].status = 'available';
        inMemoryStorage.tables[tableIndex].currentOrder = null;
      }
    }
    
    // Delete the order
    inMemoryStorage.orders.splice(index, 1);
    
    return { success: true, id: idStr };
  }
  
  // MongoDB mode
  try {
    console.log('Trying MongoDB delete with id:', id);
    // First get the order to check its status
    const order = await Order.findById(id);
    if (!order) return null;
    
    // Update table status to available if order was active
    if (order.table && order.status === 'active') {
      await Table.findOneAndUpdate(
        { $or: [{ _id: order.table }, { id: parseInt(order.table) }] },
        { status: 'available', currentOrder: null }
      );
    }
    
    // Delete the order
    await Order.findByIdAndDelete(id);
    
    return { success: true, id: idStr };
  } catch (e) {
    console.error('Error deleting order:', e);
    return null;
  }
};

// Export sync-compatible versions that work with existing code
module.exports = {
  initDB,
  connectDB,
  findUserByUsername,
  findUserById,
  createUser,
  getAllUsers,
  updateUser,
  deactivateUser,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllMenuItems,
  getMenuItemsGrouped,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  getAllTables,
  getTablesWithOrders,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
  getAllOrders,
  getActiveOrders,
  getOrderById,
  createOrder,
  updateOrder,
  processPayment,
  deleteOrder,
  mongoose
};
