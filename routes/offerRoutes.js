const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

router.post('/create-offer', offerController.createOffer);
router.get('/get-all-offers', offerController.getOffers);
router.get('/get-one-offer/:offerId',offerController.getOfferById);
router.put('/update-offer/:offerId',offerController.updateOffer);
router.delete('/delete-offer/:offerId',offerController.deleteOffer);


module.exports = router;
