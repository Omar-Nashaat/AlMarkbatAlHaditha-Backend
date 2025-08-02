const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Create a Category
router.post('/add-category', categoryController.createCategory);

// Get All Categories (including subcategories)
router.get('/get-all-categories', categoryController.getAllCategories);

// Get Single Category by ID
router.get('/get-one-category/:categoryId', categoryController.getCategory);

// Update Category by ID
router.put('/edit-category/:categoryId', categoryController.updateCategory);

// Delete Category by ID
router.delete('/delete-category/:categoryId', categoryController.deleteCategory);

module.exports = router;
