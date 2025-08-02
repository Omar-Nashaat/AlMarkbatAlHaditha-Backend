const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Add item to cart
router.post('/add-to-cart', cartController.addToCart);

// Get cart items
router.get('/get-cart', cartController.getCart);

// Remove an item from cart
router.post('/delete-from-cart', cartController.removeFromCart);

// Clear the cart
router.delete('/clear-cart', cartController.clearCart);

// update quantity
router.put('/quantity', cartController.updateCartQuantity);

module.exports = router;
