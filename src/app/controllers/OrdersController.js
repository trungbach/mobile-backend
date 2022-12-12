const OrdersModel = require("./..//../models/orders");
const { CartModel } = require("./../../models/cart");
const { query } = require("express");
const crypto = require("crypto");
const superagent = require("superagent");

class OrdersController {
  getOrderByIdUser = async (req, res) => {
    const { user_id } = req.query;
    const reqQuery = req.query;
    if (reqQuery.status) {
      query.status = reqQuery.status;
    }
    try {
      const listOrder = await OrdersModel.find({ user_id }).lean().sort({ updatedAt: -1 });
      if (!listOrder) {
        return res.status(400).json({ message: "failed!!!" });
      }

      res.status(200).json(listOrder);
    } catch (error) {
      console.log("getOrderByIdUser error:", error.message);
      res.status(500).json({ message: "server error !!!" });
    }
  };

  updateOrder = async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const { status } = data;
    if (!["Packing", "Shipping", "Arriving", "Susscess", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status is not valid !!!" });
    }
    try {
      const updateOrder = await OrdersModel.findOneAndUpdate({ _id: id }, data, {
        new: true,
      })
        .lean()
        .populate({
          path: "order_products",
          populate: {
            path: "order_product_item",
            model: "product",
            select: { sizes: 0, colors: 0 },
          },
        })
        .populate("shipping_infomation");
      if (!updateOrder) {
        return res.status(400).json({ message: "update failed" });
      }
      res.status(200).json(updateOrder);
    } catch (error) {
      res.status(500).json({ message: "server error !!!" });
    }
  };

  //orders/:id
  getOrderDetailById = async (req, res) => {
    const { id } = req.params;
    try {
      const orderDetail = await OrdersModel.findOne({ _id: id })
        .lean()
        .populate({
          path: "order_products",
          populate: {
            path: "order_product_item",
            model: "product",
            select: { sizes: 0, colors: 0 },
          },
        })
        .populate("shipping_infomation");
      if (!orderDetail) {
        return res.status(400).json("failed");
      }
      res.status(200).json(orderDetail);
    } catch (error) {
      res.status(500).json({ message: "server error !!!" });
    }
  };

  createOrder = async (req, res) => {
    const data = req.body;

    // tạo order trạng thái chưa khởi tạo thanh toán, xóa cart.
    try {
      const orderMomoResponse = await this.createMomo(data.total_price);

      // order thanh cong tra ve object co chua deeplink momo thanh toan. Thi xoa don do khoi Carts.
      if (orderMomoResponse?.deeplink) {
        const listCart = await CartModel.find({ _id: { $in: data.orders_id } })
          .lean()
          .select({ user_id: 0, createdAt: 0, updatedAt: 0, _id: 0 });
        if (!listCart) {
          return res.status(400).json("failed");
        } else {
          const order = { ...data };
          order.order_momo_id = orderMomoResponse.orderId;
          delete order.orders_id;
          order.order_products = listCart.map((item) => {
            item.order_product_item = item.product_id;
            delete item.product_id;
            return { ...item };
          });
          await new OrdersModel(order).save();
          await CartModel.deleteMany({ _id: { $in: data.orders_id } });
        }
        return res.status(200).json(orderMomoResponse);
      }
    } catch (error) {
      console.log("error", error.message);
      return res.status(500).json(error.message);
    }
  };

  // tạo order momo
  async createMomo(amount) {
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const partnerCode = "MOMO";
    const orderInfo = "Payment for Super Shoes";
    const redirectUrl = `exp://${process.env.BASE_URL}:19000`;
    const ipnUrl = `exp://${process.env.BASE_URL}:19000`;
    const requestType = "captureWallet";
    const orderId = `${partnerCode}${new Date().getTime()}`;
    const requestId = orderId;
    const extraData = "";
    const lang = "vi";

    //before sign HMAC SHA256 with format
    const rawSignature =
      "accessKey=" +
      accessKey +
      "&amount=" +
      amount +
      "&extraData=" +
      extraData +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    //signature
    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = JSON.stringify({
      partnerCode,
      requestId,
      amount: Number(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      extraData,
      signature,
    });

    try {
      const apiEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create";
      const res = await superagent
        .post(apiEndpoint)
        .send(requestBody)
        .set("Content-Type", "application/json");
      return res.body;
    } catch (error) {
      console.log("error create Momo order:", error);
    }
  }

  async checkOrderStatus(request, response) {
    const { orderId } = request.body;
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const partnerCode = "MOMO";
    const requestId = orderId;
    const lang = "vi";

    const rawSignature =
      "accessKey=" +
      accessKey +
      "&orderId=" +
      orderId +
      "&partnerCode=" +
      partnerCode +
      "&requestId=" +
      requestId;

    //signature
    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
    const requestBody = JSON.stringify({
      partnerCode,
      requestId,
      orderId,
      lang,
      signature,
    });

    //Create the HTTPS objects
    const https = require("https");
    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/query",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    //Send the request and get the response
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      res.on("data", async (body) => {
        console.log("Check status response: ", body);
        const { resultCode } = JSON.parse(body);
        if (resultCode === 0) {
          // thanh cong cua Momo
          const updateOrder = await OrdersModel.findOneAndUpdate(
            { order_momo_id: orderId },
            { payment_status: "Success" },
            {
              new: true,
            }
          )
            .lean()
            .populate({
              path: "order_products",
              populate: {
                path: "order_product_item",
                model: "product",
                select: { sizes: 0, colors: 0 },
              },
            })
            .populate("shipping_infomation");
          console.log("updateOrder", updateOrder);
          if (!updateOrder) {
            return response.status(400).json({ message: "update failed" });
          }
        }
        response.status(200).json({ ...JSON.parse(body) });
      });
    });

    req.on("error", (e) => {
      console.log(`problem with request: ${e.message}`);
    });
    req.write(requestBody);
    req.end();
  }

  //delete /:id
  deleteOrderById = async (req, res) => {
    const { id } = req.params;
    try {
      const deleteProduct = await OrdersModel.findOneAndDelete({ _id: id });
      if (!deleteProduct) {
        return res.status(400).json("failed");
      }
      res.status(200).json(deleteProduct);
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: "server error !!!" });
    }
  };
}

module.exports = new OrdersController();
