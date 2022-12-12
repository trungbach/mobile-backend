const express = require("express");
const filterProduct = require("../app/middleware/filterProduct");
const router = express.Router();
const siteController = require("../app/controllers/SiteControllers");

router.get("/", filterProduct, siteController.searchProductByName);

module.exports = router;
