const express = require("express");
const filterProduct = require("../app/middleware/filterProduct");
const router = express.Router();
const searchController = require("../app/controllers/SearchController");

router.get("/", filterProduct, searchController.searchProductByName);

module.exports = router;
