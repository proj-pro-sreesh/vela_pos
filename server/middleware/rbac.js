// Role-Based Access Control middleware
const permissions = {
  admin: ['*'],
  waiter: [
    'tables:read',
    'tables:update',
    'orders:create',
    'orders:read',
    'orders:update',
    'menu:read'
  ],
  biller: [
    'tables:read',
    'orders:read',
    'orders:update',
    'orders:payment',
    'menu:read'
  ]
};

const rbac = (...allowedPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role;
    const userPermissions = permissions[userRole] || [];

    // Admin has access to everything
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check if user has any of the allowed permissions
    const hasPermission = allowedPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = rbac;
