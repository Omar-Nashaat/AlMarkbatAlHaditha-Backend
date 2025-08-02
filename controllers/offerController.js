const Offer = require('../models/Offer');
const Product = require('../models/Product');
const upload = require('../middleware/multer');

// Create a new offer
exports.createOffer = [
  upload.single('image'), // Handle one uploaded image
  async (req, res) => {
    try {
      const {
        title,
        products,
        specialPrice,
        description,
        imageUrl // optional image URL instead of upload
      } = req.body;

      // Validate required fields
      if (!title || !products || !specialPrice) {
        return res.status(400).send({ message: 'Missing required fields.' });
      }

      // Parse product IDs array
      let parsedProducts = [];
      try {
        parsedProducts = JSON.parse(products);
        if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
          return res.status(400).send({ message: 'Products must be a non-empty array.' });
        }
      } catch (error) {
        return res.status(400).send({ message: 'Invalid products format. Must be a JSON array.' });
      }

      // Handle image: either uploaded or via URL
      let imagePath = null;

      if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
      } else if (imageUrl && typeof imageUrl === 'string') {
        imagePath = imageUrl;
      }

      // Create and save the offer
      const newOffer = new Offer({
        title,
        products: parsedProducts,
        specialPrice,
        description,
        image: imagePath
      });

      await newOffer.save();
      res.status(201).send({ message: 'Offer created successfully', offer: newOffer });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: 'Error creating offer', error: err.message });
    }
  }
];


// Get all offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().populate('products');
    res.status(200).send({ offers });
  } catch (err) {
    res.status(500).send({ message: 'Error fetching offers', error: err.message });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = await Offer.findById(offerId).populate('products');

    if (!offer) {
      return res.status(404).send({ message: 'Offer not found' });
    }

    res.status(200).send({ offer });
  } catch (err) {
    res.status(500).send({ message: 'Error fetching offer', error: err.message });
  }
};


exports.updateOffer = [
  upload.single('image'),
  async (req, res) => {
    try {
      const { offerId } = req.params;
      const {
        title,
        specialPrice,
        description,
        imageUrl
      } = req.body;

      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).send({ message: 'Offer not found' });
      }

      // Replace all products if provided
      if (req.body.products) {
        try {
          const parsedProducts = JSON.parse(req.body.products);
          if (Array.isArray(parsedProducts)) {
            offer.products = parsedProducts;
          } else {
            return res.status(400).send({ message: 'products must be an array' });
          }
        } catch (error) {
          return res.status(400).send({ message: 'Invalid products format' });
        }
      }

      // Add products to the list
      if (req.body.addProducts) {
        try {
          const addList = JSON.parse(req.body.addProducts);
          if (Array.isArray(addList)) {
            for (const p of addList) {
              if (!offer.products.includes(p)) {
                offer.products.push(p);
              }
            }
          } else {
            return res.status(400).send({ message: 'addProducts must be an array' });
          }
        } catch (error) {
          return res.status(400).send({ message: 'Invalid addProducts format' });
        }
      }

      // Remove products from the list
      if (req.body.removeProducts) {
        try {
          const removeList = JSON.parse(req.body.removeProducts);
          if (Array.isArray(removeList)) {
            offer.products = offer.products.filter(p => !removeList.includes(p.toString()));
          } else {
            return res.status(400).send({ message: 'removeProducts must be an array' });
          }
        } catch (error) {
          return res.status(400).send({ message: 'Invalid removeProducts format' });
        }
      }

      // Handle image
      if (req.file) {
        offer.image = `/uploads/${req.file.filename}`;
      } else if (imageUrl && typeof imageUrl === 'string') {
        offer.image = imageUrl;
      }

      // Update other fields
      if (title) offer.title = title;
      if (specialPrice) offer.specialPrice = specialPrice;
      if (description) offer.description = description;

      await offer.save();
      res.status(200).send({ message: 'Offer updated successfully', offer });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: 'Error updating offer', error: err.message });
    }
  }
];



exports.deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = await Offer.findByIdAndDelete(offerId);

    if (!offer) {
      return res.status(404).send({ message: 'Offer not found' });
    }

    res.status(200).send({ message: 'Offer deleted successfully', offer });
  } catch (err) {
    res.status(500).send({ message: 'Error deleting offer', error: err.message });
  }
};

