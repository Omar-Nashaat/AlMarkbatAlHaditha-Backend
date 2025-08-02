const Category = require('../models/Category')
const Product = require('../models/Product')

// Create a new Category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, subCategories } = req.body

    if (!name || !description) {
      return res
        .status(400)
        .send({ message: 'Name and Description are required' })
    }

    // Prepare the category object
    const newCategory = new Category({
      name,
      description,
      subCategories: subCategories || [] // Can be an array of category IDs
    })

    await newCategory.save()
    res
      .status(201)
      .send({ message: 'Category created successfully', category: newCategory })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error creating category', error: err.message })
  }
}

// Get All Categories (Including Subcategories)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate('subCategories') // Populate subcategories
    res.status(200).send({ categories })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error fetching categories', error: err.message })
  }
}

// Get Category
exports.getCategory = async (req, res) => {
  try {
    const { categoryId } = req.params

    // Find the category by ID and populate subcategories
    const category = await Category.findById(categoryId).populate(
      'subCategories'
    )

    if (!category) {
      return res.status(404).send({ message: 'Category not found' })
    }

    // Find products associated with this category
    const products = await Product.find({ category: categoryId })

    res.status(200).send({ category, products })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error fetching category', error: err.message })
  }
}

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params
    const { name, description, subCategories } = req.body

    // Prepare updated fields
    const updatedFields = {}
    if (name) updatedFields.name = name
    if (description) updatedFields.description = description
    if (subCategories) updatedFields.subCategories = subCategories

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updatedFields,
      { new: true }
    )

    if (!updatedCategory) {
      return res.status(404).send({ message: 'Category not found' })
    }

    res.status(200).send({
      message: 'Category updated successfully',
      category: updatedCategory
    })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error updating category', error: err.message })
  }
}

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params

    // Check if there are any products linked to the category
    const isCategoryLinked = await Product.exists({ category: categoryId })

    if (isCategoryLinked) {
      return res.status(400).send({
        message:
          'Cannot delete category as it is linked to one or more products'
      })
    }

    // Proceed with deletion if no products are linked
    const deletedCategory = await Category.findByIdAndDelete(categoryId)

    if (!deletedCategory) {
      return res.status(404).send({ message: 'Category not found' })
    }

    res.status(200).send({
      message: 'Category deleted successfully',
      category: deletedCategory
    })
  } catch (err) {
    console.error(err)
    res.status(500).send({
      message: 'Error deleting category',
      error: err.message
    })
  }
}
