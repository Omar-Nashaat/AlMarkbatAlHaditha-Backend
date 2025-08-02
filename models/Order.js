const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userDetails: {
    name: { type: String, required: true },
    number: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String },
    notes: { type: String }
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      images: [{ type: String, required: true }]
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  adminComment: { type: String },
  createdAt: { type: Date, default: Date.now }
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order
