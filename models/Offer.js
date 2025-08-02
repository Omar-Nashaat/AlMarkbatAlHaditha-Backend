const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }],
  specialPrice: { type: Number, required: true },
  image: { type: String }, // Only one image for the offer bundle
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
