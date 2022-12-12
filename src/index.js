const express = require("express");
const path = require("path");
const app = express();
var cors = require("cors");
const route = require("./routes");
const db = require("./config/db");
var bodyParser = require("body-parser");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

db.connect();

app.use(cors());
app.use(express.static(path.join(__dirname, "./public")));

const PORT = process.env.PORT || 4000;
route(app);
app.listen(PORT, () => console.log(`app chay cong ${PORT}`));
