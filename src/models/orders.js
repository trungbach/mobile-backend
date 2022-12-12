const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Orders = new Schema(
  {
    user_id: { type: Schema.Types.Mixed, required: true },
    order_products: {
      type: [
        {
          order_product_item: { type: Schema.Types.Mixed },
          quantity: { type: Number, default: 1 },
          size: { type: Number, required: true },
          color: { type: String, required: true },
        },
      ],
    },
    shipping_infomation: {
      type: Schema.Types.Mixed,
      required: true,
      ref: "Shipping_Infomation",
    },
    orderDate: { type: Date, default: +new Date() },
    shippedDate: { type: Date, default: +new Date() + 3 * 24 * 60 * 60 * 1000 },
    status: {
      type: String,
      enum: ["Packing", "Shipping", "Arriving", "Susscess", "cancelled"],
      default: "Packing",
    },
    quantity_items: { type: Number, required: true },
    total_price: { type: Number, required: true },
    payment_status: {
      type: String,
      enum: ["Waiting", "Success", "Failed", "Overtime"],
      default: "Waiting",
    },
    order_momo_id: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("order", Orders);
