const CartController = require("./../app/controllers/CartController");
const checkLogin = require("./../app/middleware/checkLogin");

const express = require("express");
const router = express.Router();
router.use(checkLogin);
router.post("/", CartController.createCart);
router.get("/", CartController.getListCartByUserId);
router.put("/:id", CartController.updateCart);
router.delete("/:id", CartController.deleteCart);
module.exports = router;
