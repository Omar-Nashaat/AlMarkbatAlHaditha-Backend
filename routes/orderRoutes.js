const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Place a new order
router.post('/place-order', orderController.placeOrder);

// Route to get all orders
router.get('/get-all-orders', orderController.getAllOrders);

// Route to update the status of an order
router.put('/update-order-status/:orderId', orderController.updateOrderStatus);

// Route for generating and downloading the order report
router.get('/generate-order-report', orderController.generateOrderReport);

// Route for generating a report for a specific day
router.get('/generate-report-for-date', orderController.generateReportForDate);

// Route for delete order
router.delete('/delete-order/:orderId', orderController.deleteOrder);

// Route for filtering orders by a specific date
router.get('/filter-by-date', orderController.filterOrdersByDate);

// Route for verifyOTP
router.post('/verify-OTP', orderController.verifyOrder);

module.exports = router;
