const Product = require('../models/Product')
const upload = require('../middleware/multer')
const DeletedProduct = require('../models/DeletedProduct')
const xlsx = require('xlsx')
const multer = require('multer')
const path = require('path')
const Category = require('../models/Category')

// create a product
exports.createProduct = [
  upload.array('images', 5), // Allow up to 5 images per product
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        categoryId,
        itemNumber,
        customDetails,
        imageUrls
      } = req.body

      // Validate required fields
      if (!name || !description || !price || !categoryId) {
        return res.status(400).send({ message: 'Missing required fields.' })
      }

      // Check if product with the same name exists
      const existingProduct = await Product.findOne({ name })
      if (existingProduct) {
        return res
          .status(400)
          .send({ message: 'A product with this name already exists.' })
      }

      // Get the uploaded image file paths
      const imagePaths = req.files
        ? req.files.map(file => `/uploads/${file.filename}`)
        : []

      // Handle URLs for images
      let parsedImageUrls = []
      if (imageUrls) {
        try {
          parsedImageUrls = JSON.parse(imageUrls) // Parse imageUrls if it's sent as a JSON string
          if (!Array.isArray(parsedImageUrls)) {
            return res
              .status(400)
              .send({ message: 'imageUrls must be an array.' })
          }
        } catch (error) {
          return res.status(400).send({
            message: 'Invalid imageUrls format. Must be a JSON array.'
          })
        }
      }

      // Combine file paths and URLs into a single images array
      const images = [...imagePaths, ...parsedImageUrls]

      // Parse customDetails if provided
      let parsedDetails = []
      if (customDetails) {
        try {
          parsedDetails = JSON.parse(customDetails) // Assuming `customDetails` is sent as a JSON string
        } catch (error) {
          return res.status(400).send({
            message: 'Invalid customDetails format. Must be a JSON object.'
          })
        }
      }

      // Create the new product
      const newProduct = new Product({
        name,
        description,
        price,
        category: categoryId,
        images,
        itemNumber,
        customDetails: parsedDetails
      })

      // Save the product to the database
      await newProduct.save()
      res
        .status(201)
        .send({ message: 'Product created successfully', product: newProduct })
    } catch (err) {
      console.error(err)
      res
        .status(500)
        .send({ message: 'Error creating product', error: err.message })
    }
  }
]

// Configure multer for file upload
const bulkUploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) // Append file extension
  }
})

const bulkUpload = multer({ storage: bulkUploadStorage })

exports.bulkUploadProducts = [
  bulkUpload.single('file'), // Use the new bulkUpload middleware
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' })
      }

      // Read the uploaded Excel file
      const workbook = xlsx.readFile(req.file.path)
      const sheetName = workbook.SheetNames[0] // Assuming data is in the first sheet
      const sheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(sheet)

      for (const row of data) {
        const cleanedRow = {}
        Object.keys(row).forEach(key => {
          cleanedRow[key.trim()] = row[key] // Trim spaces from keys
        })

        const itemNumber = cleanedRow['Model Number']
        const description = cleanedRow['اسم المادة']
        const categoryName = cleanedRow['اسم الصنف']
        const price = cleanedRow['السعر المستهلك']

        // Ensure required fields exist
        if (!itemNumber || !description || !price || !categoryName) {
          console.warn(`Skipping row due to missing fields:`, cleanedRow)
          continue
        }

        // Fix floating-point precision issues and keep price as a float
        const formattedPrice = parseFloat(parseFloat(price).toFixed(2))

        // Find or create category
        let category = await Category.findOne({ name: categoryName })
        if (!category) {
          category = new Category({ name: categoryName })
          await category.save()
        }

        // ✅ Extract all image URLs dynamically
        const parsedImageUrls = []
        let foundImageColumn = false

        Object.keys(row).forEach((column, index) => {
          // Find "Image URLs" column
          if (column.includes('Image URLs')) {
            foundImageColumn = true
          }

          // After finding "Image URLs", collect all URLs from this column & next ones
          if (foundImageColumn && row[column]) {
            const urls = row[column]
              .split(/\s+/)
              .filter(url => url.startsWith('http'))
            parsedImageUrls.push(...urls)
          }
        })

        // Check if the product already exists
        const existingProduct = await Product.findOne({ itemNumber })
        if (existingProduct) {
          console.warn(`Skipping existing product: ${itemNumber}`)
          continue
        }

        // Create a new product
        const newProduct = new Product({
          name: description,
          itemNumber,
          description,
          price: formattedPrice,
          category: category._id,
          images: parsedImageUrls, // ✅ Now stores multiple images dynamically
          customDetails: []
        })

        // Save the product
        await newProduct.save()
      }

      res.status(201).send({ message: 'Products uploaded successfully.' })
    } catch (err) {
      console.error(err)
      res
        .status(500)
        .send({ message: 'Error uploading products', error: err.message })
    }
  }
]

// Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('category')
    res.status(200).send({ products })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error fetching products', error: err.message })
  }
}

// Get All Products with Search and Filter
exports.getAllProductsOptimized = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query

    // Build a query object
    const query = {}

    // Search by product name, description, or itemNumber (case-insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }, // Case-insensitive regex for name
        { description: { $regex: search, $options: 'i' } }, // Case-insensitive regex for description
        { itemNumber: { $regex: `^${search}$`, $options: 'i' } } // Exact match for itemNumber, case-insensitive
      ]
    }

    // Filter by category
    if (category) {
      query.category = category
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    // Execute the query
    const products = await Product.find(query).populate('category')

    // If no products found, return 404
    if (!products.length) {
      return res.status(404).send({
        message: 'No products found matching your search and filter criteria.'
      })
    }

    res.status(200).send({ products })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error fetching products', error: err.message })
  }
}

// Get Single Product
exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params
    const product = await Product.findById(productId).populate('category')
    if (!product) {
      return res.status(404).send({ message: 'Product not found' })
    }

    // Filter customDetails based on display flag
    const filteredCustomDetails = product.customDetails.filter(
      detail => detail.display
    )

    res.status(200).send({
      product: {
        ...product.toObject(),
        customDetails: filteredCustomDetails
      }
    })
  } catch (err) {
    console.error(err)
    res
      .status(500)
      .send({ message: 'Error fetching product', error: err.message })
  }
}

exports.updateProduct = [
  upload.array('images', 5),
  async (req, res) => {
    try {
      const { productId } = req.params
      const {
        name,
        description,
        price,
        categoryId,
        customDetails,
        imageUrls, // New image URLs to add
        imagesToRemove // Existing image URLs to remove
      } = req.body

      // Find the existing product
      const existingProduct = await Product.findById(productId)
      if (!existingProduct) {
        return res.status(404).send({ message: 'Product not found' })
      }

      // Prepare updated fields
      const updatedFields = {}
      if (name) updatedFields.name = name
      if (description) updatedFields.description = description
      if (price) updatedFields.price = price
      if (categoryId) updatedFields.category = categoryId

      // Handle new image files
      const newImagePaths = req.files
        ? req.files.map(file => `/uploads/${file.filename}`)
        : []

      // Handle new image URLs
      let parsedImageUrls = []
      if (imageUrls) {
        if (typeof imageUrls === 'string') {
          // If imageUrls is a string, parse it as JSON
          try {
            parsedImageUrls = JSON.parse(imageUrls)
          } catch (error) {
            return res.status(400).send({
              message: 'Invalid imageUrls format. Must be a JSON array.'
            })
          }
        } else if (Array.isArray(imageUrls)) {
          // If imageUrls is already an array, use it directly
          parsedImageUrls = imageUrls
        } else {
          return res.status(400).send({
            message: 'imageUrls must be an array.'
          })
        }
      }

      // Combine new image files and URLs
      const newImages = [...newImagePaths, ...parsedImageUrls]

      // Handle images to remove
      let updatedImages = existingProduct.images || []
      if (imagesToRemove) {
        let imagesToRemoveArray = []
        if (typeof imagesToRemove === 'string') {
          // If imagesToRemove is a string, parse it as JSON
          try {
            imagesToRemoveArray = JSON.parse(imagesToRemove)
          } catch (error) {
            return res.status(400).send({
              message: 'Invalid imagesToRemove format. Must be a JSON array.'
            })
          }
        } else if (Array.isArray(imagesToRemove)) {
          // If imagesToRemove is already an array, use it directly
          imagesToRemoveArray = imagesToRemove
        } else {
          return res.status(400).send({
            message: 'imagesToRemove must be an array.'
          })
        }
        // Filter out the images to remove
        updatedImages = updatedImages.filter(
          image => !imagesToRemoveArray.includes(image)
        )
      }

      // Add new images to the updated images array
      updatedFields.images = [...updatedImages, ...newImages]

      // Handle customDetails
      if (customDetails) {
        try {
          updatedFields.customDetails = JSON.parse(customDetails)
        } catch (error) {
          return res.status(400).send({
            message: 'Invalid customDetails format. Must be a JSON object.'
          })
        }
      }

      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updatedFields,
        { new: true }
      )

      res.status(200).send({
        message: 'Product updated successfully',
        product: updatedProduct
      })
    } catch (err) {
      console.error(err)
      res
        .status(500)
        .send({ message: 'Error updating product', error: err.message })
    }
  }
]

// delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params

    // Find the product in the Product collection
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).send({ message: 'Product not found' })
    }

    // Move the product to the DeletedProduct collection
    const deletedProduct = new DeletedProduct({
      originalId: product._id,
      name: product.name,
      itemNumber: product.itemNumber,
      description: product.description,
      price: product.price,
      category: product.category,
      images: product.images,
      ratings: product.ratings,
      customDetails: product.customDetails
    })

    await deletedProduct.save()

    // Delete the product from the Product collection
    await Product.deleteOne({ _id: product._id }) // Replace product.remove with deleteOne

    res.status(200).send({
      message: 'Product moved to Recently Deleted',
      product: deletedProduct
    })
  } catch (err) {
    console.error('Error deleting product:', err)
    res
      .status(500)
      .send({ message: 'Error deleting product', error: err.message })
  }
}

// resotore deleted Product
exports.restoreProduct = async (req, res) => {
  try {
    const { deletedProductId } = req.params

    // Find the product in the DeletedProduct collection
    const deletedProduct = await DeletedProduct.findById(deletedProductId)
    if (!deletedProduct) {
      return res.status(404).send({ message: 'Deleted product not found' })
    }

    // Restore the product to the Product collection
    const restoredProduct = new Product({
      _id: deletedProduct.originalId, // Use the original ID
      name: deletedProduct.name,
      itemNumber: deletedProduct.itemNumber,
      description: deletedProduct.description,
      price: deletedProduct.price,
      category: deletedProduct.category,
      images: deletedProduct.images,
      ratings: deletedProduct.ratings,
      customDetails: deletedProduct.customDetails
    })

    await restoredProduct.save()

    // Remove the product from the DeletedProduct collection
    await DeletedProduct.deleteOne({ _id: deletedProductId }) // Replace deletedProduct.remove with deleteOne

    res.status(200).send({
      message: 'Product restored successfully',
      product: restoredProduct
    })
  } catch (err) {
    console.error('Error restoring product:', err)
    res
      .status(500)
      .send({ message: 'Error restoring product', error: err.message })
  }
}

// get all deleted Products
exports.getAllDeletedProducts = async (req, res) => {
  try {
    // Fetch all products in the DeletedProduct collection
    const deletedProducts = await DeletedProduct.find()

    if (!deletedProducts.length) {
      return res.status(404).send({ message: 'No deleted products found' })
    }

    res.status(200).send({
      message: 'Deleted products retrieved successfully',
      products: deletedProducts
    })
  } catch (err) {
    console.error('Error fetching deleted products:', err)
    res
      .status(500)
      .send({ message: 'Error fetching deleted products', error: err.message })
  }
}

// clear all deleted Products
exports.clearAllDeletedProducts = async (req, res) => {
  try {
    // Delete all documents in the DeletedProduct collection
    const result = await DeletedProduct.deleteMany()

    res.status(200).send({
      message: 'All deleted products have been permanently deleted.',
      deletedCount: result.deletedCount
    })
  } catch (err) {
    console.error('Error clearing deleted products:', err)
    res
      .status(500)
      .send({ message: 'Error clearing deleted products', error: err.message })
  }
}

// Permanently delete a product from DeletedProducts
exports.permanentlyDeleteProduct = async (req, res) => {
  try {
    const { deletedProductId } = req.params

    // Find the product in the DeletedProduct collection
    const deletedProduct = await DeletedProduct.findById(deletedProductId)
    if (!deletedProduct) {
      return res.status(404).send({ message: 'Deleted product not found' })
    }

    // Permanently delete the product from the DeletedProduct collection
    await DeletedProduct.deleteOne({ _id: deletedProductId })

    res.status(200).send({
      message: 'Product permanently deleted from DeletedProducts',
      deletedProductId: deletedProductId
    })
  } catch (err) {
    console.error('Error permanently deleting product:', err)
    res.status(500).send({
      message: 'Error permanently deleting product',
      error: err.message
    })
  }
}
