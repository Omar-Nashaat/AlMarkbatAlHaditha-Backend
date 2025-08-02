const mongoose = require('mongoose');

const deletedProductSchema = new mongoose.Schema({
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to the original Product ID
    name: { type: String, required: true },
    itemNumber: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [{ type: String }],
    ratings: [
        {
            name: { type: String },
            comment: { type: String },
            rating: { type: Number },
        },
    ],
    customDetails: [
        {
            title: { type: String },
            value: { type: mongoose.Schema.Types.Mixed },
            display: { type: Boolean, default: true },
        },
    ],
    deletedAt: { type: Date, default: Date.now }, // Timestamp for when the product was moved to DeletedProduct
});

const DeletedProduct = mongoose.model('DeletedProduct', deletedProductSchema);

module.exports = DeletedProduct;
