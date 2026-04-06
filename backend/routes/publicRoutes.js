const express = require('express');
const { verifyCertificate } = require('../controllers/publicController');

const router = express.Router();

router.get('/verify/:id', verifyCertificate);

module.exports = router;
