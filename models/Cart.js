const mongoose = require('mongoose')
const cartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'items.type'
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      type: { type: String, required: true, enum: ['Product', 'Offer'] }
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

cartSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Cart', cartSchema);

