function authorizeRoles(...roles) {
  const normalizedAllowed = roles.map((role) => String(role || '').trim().toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      console.error('[AUTH ERROR] Role check failed: missing user', { path: req.originalUrl });
      return res.status(401).json({ success: false, message: 'Unauthorized: Token missing or invalid' });
    }

    const userRole = String(req.user?.role || '').trim().toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      console.error('[AUTH ERROR] Role check failed', {
        path: req.originalUrl,
        userRole,
        allowed: normalizedAllowed,
      });
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return next();
  };
}

module.exports = { authorizeRoles };
