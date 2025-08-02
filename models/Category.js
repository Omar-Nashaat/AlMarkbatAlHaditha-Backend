const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], // Self-referential relationship
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Middleware to update 'updatedAt' before saving
categorySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
