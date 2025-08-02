const Cart = require('../models/Cart')
const Product = require('../models/Product')
const Offer = require('../models/Offer')

// Add item to cart
exports.addToCart = async (req, res) => {
  const { itemId, quantity, type } = req.body
  const sessionId = req.session.userId

  try {
    if (!['Product', 'Offer'].includes(type)) {
      return res.status(400).send({ message: 'Invalid item type' })
    }

    const Model = type === 'Product' ? Product : Offer
    const item = await Model.findById(itemId)
    if (!item) {
      return res.status(404).send({ message: `${type} not found` })
    }

    let cart = await Cart.findOne({ sessionId })
    if (!cart) {
      cart = new Cart({ sessionId, items: [] })
    }

    const existingItem = cart.items.find(
      entry => entry.productId.toString() === itemId && entry.type === type
    )

    if (existingItem) {
      return res.status(400).send({ message: `${type} already in cart` })
    }

    const price = type === 'Product' ? item.price : item.specialPrice

    cart.items.push({
      productId: itemId,
      quantity,
      price,
      type
    })

    await cart.save()
    res
      .status(200)
      .send({ message: `${type} added to cart successfully`, cart })
  } catch (error) {
    console.error('Full error in addToCart:', error)
    res
      .status(500)
      .send({ message: 'Error adding to cart', error: error.message || error })
  }
}

// Get cart
exports.getCart = async (req, res) => {
  const sessionId = req.session.userId

  try {
    const cart = await Cart.findOne({ sessionId }).populate('items.productId')
    if (!cart) {
      return res.status(400).send({ message: 'Cart not found' })
    }

    const totalPrice = cart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    )

    res.status(200).send({ cart, totalPrice })
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving cart', error })
  }
}

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  const { itemId, type } = req.body
  const sessionId = req.session.userId

  try {
    const cart = await Cart.findOne({ sessionId })
    if (!cart) {
      return res.status(404).send({ message: 'Cart not found' })
    }

    const exists = cart.items.find(
      item => item.productId.toString() === itemId && item.type === type
    )

    if (!exists) {
      return res.status(404).send({ message: 'Item not in the cart' })
    }

    cart.items = cart.items.filter(
      item => !(item.productId.toString() === itemId && item.type === type)
    )

    await cart.save()
    res.status(200).send({ message: 'Item removed from cart', cart })
  } catch (error) {
    res.status(500).send({ message: 'Error removing item', error })
  }
}

// Update item quantity
exports.updateCartQuantity = async (req, res) => {
  const { itemId, type, quantity } = req.body
  const sessionId = req.session.userId

  try {
    const cart = await Cart.findOne({ sessionId })
    if (!cart) {
      return res.status(404).send({ message: 'Cart not found' })
    }

    const existingItem = cart.items.find(
      item => item.productId.toString() === itemId && item.type === type
    )

    if (!existingItem) {
      return res.status(404).send({ message: 'Item not in the cart' })
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        item => !(item.productId.toString() === itemId && item.type === type)
      )
    } else {
      existingItem.quantity = quantity
    }

    await cart.save()
    res.status(200).send({ message: 'Cart updated', cart })
  } catch (error) {
    res.status(500).send({ message: 'Error updating quantity', error })
  }
}

// Clear cart
exports.clearCart = async (req, res) => {
  const sessionId = req.session.userId

  try {
    await Cart.deleteOne({ sessionId })
    res.status(200).send({ message: 'Cart cleared' })
  } catch (error) {
    res.status(500).send({ message: 'Error clearing cart', error })
  }
}
