require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Parcel is coming");
  });
  app.listen(port, () => {
    console.log(`Parcel is delivered in port : ${port}`);
  });
  