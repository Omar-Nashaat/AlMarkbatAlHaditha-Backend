const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// login
router.post('/login', userController.loginUser);

// register
router.post('/register', userController.registerUser);

// contact
router.post('/contact', userController.contact);


module.exports = router;
