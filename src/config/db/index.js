const mongoose = require("mongoose");
const URI = "mongodb://localhost:27017/mobile";
async function connect() {
  try {
    await mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("connect succsessfully!!");
  } catch (error) {
    console.log("connect loi");
  }
}
module.exports = { connect };
