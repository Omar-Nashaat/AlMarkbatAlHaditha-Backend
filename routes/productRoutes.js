const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Create Product
router.post('/add-product', productController.createProduct);

// Create Product
router.post('/add-products-from-file', productController.bulkUploadProducts);

// Get All Products
router.get('/get-all-products', productController.getAllProducts);


// Get All Products with Search and Filter
router.get('/get-all-products-optimized', productController.getAllProductsOptimized);

// Get Single Product
router.get('/get-one-product/:productId', productController.getProduct);

// Update Product
router.put('/edit-product/:productId', productController.updateProduct);

// Delete Product
router.delete('/delete-product/:productId', productController.deleteProduct);

// restore product
router.post('/restore-product/:deletedProductId', productController.restoreProduct);


// get all deleted products
router.get('/get-all-deleted-products', productController.getAllDeletedProducts);


// restore product
router.delete('/clear-all-deleted-products', productController.clearAllDeletedProducts);

// finaly delete product
router.delete('/finally-delete-product/:deletedProductId', productController.permanentlyDeleteProduct);


module.exports = router;
