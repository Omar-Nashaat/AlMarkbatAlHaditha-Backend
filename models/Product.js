const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    itemNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
    images: [{ type: String }],
    ratings: [{
        name: { type: String },
        comment: { type: String },
        rating: { type: Number }
    }],
    customDetails: [{
        title: { type: String },
        value: { type: mongoose.Schema.Types.Mixed },
        display: { type: Boolean, default: true }
    }]
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
