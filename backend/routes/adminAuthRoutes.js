const express = require('express');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
} = require('../controllers/adminAuthController');
const { verifyAdminToken } = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile', verifyAdminToken, getAdminProfile);

module.exports = router;
