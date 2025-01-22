require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5lka3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const parcelCollection = client.db("parcelDb").collection("Parcel");
    const userCollection = client.db("parcelDb").collection("users");
    const notificationCollection = client
      .db("parcelDb")
      .collection("notifications");
    const paymentCollection = client.db("parcelDb").collection("payments");
    const reviewCollection = client.db("parcelDb").collection("reviews");
    //jwt toke
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorize access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "Unauthorize access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //users data

    app.post("/users", async (req, res) => {
      const { email, name, type, isSocialLogin, photoURL, phoneNumber } =
        req.body;

      const existingUser = await userCollection.findOne({ email });

      if (existingUser) {
        return res.send({ message: "User exists" });
      }

      const newUser = {
        email,
        name,
        photoURL,
        type: type || "user",
        isSocialLogin: isSocialLogin || false,
        phoneNumber,
      };
      // console.log(newUser);

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
    app.patch("/users", verifyToken, async (req, res) => {
      const { email, photoURL } = req.body;

      const filter = { email };
      const updateDoc = {
        $set: {
          photoURL,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // app.post("/users", async (req, res) => {
    //   const user = req.body;
    //   const query = { email: user.email };
    //   const existingUser = await userCollection.findOne(query);
    //   if (existingUser) {
    //     return res.send({ message: "user already exist", insertedId: null });
    //   }
    //   const result = await userCollection.insertOne(user);
    //   res.send(result);
    // });
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        if (user.type === "admin" && !user.isSocialLogin) {
          admin = true;
        }
      }
      res.send({ admin });
    });

    app.get("/users/deliveryMan/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryMan = false;
      if (user) {
        deliveryMan = user?.type === "deliveryMan";
      }
      res.send({ deliveryMan });
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.get(
      "/users/deliveryMan",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const deliveryMen = await userCollection
            .find({ type: "deliveryMan" })
            .toArray();

          res.send(deliveryMen);
        } catch (error) {
          console.error(error);
          res.status(500).send({ error: "Failed to retrieve deliveryMen" });
        }
      }
    );
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            type: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.patch(
      "/users/deliveryMan/:id",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            type: "deliveryMan",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    //parcel data
    app.get("/parcels/deliveryMan/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const query = { deliveryManId: id };
      const parcels = await parcelCollection.find(query).toArray();
      res.send(parcels);
    });

    app.patch("/users/deliveryMan/:id", async (req, res) => {
      const { id } = req.params;
      const { type } = req.body;
      const notification = {
        message: "Your request has been approved. Welcome as a Delivery Man!",
        timestamp: new Date(),
      };

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          type: "deliveryMan",
        },
        $push: { notifications: notification },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      if (result.modifiedCount === 1) {
        res.status(200).send({ message: "User type updated to deliveryMan" });
      } else {
        res.status(400).send({ message: "Failed to update user type" });
      }
    });

    app.get("/delivery/notifications", async (req, res) => {
      try {
        const deliveryNotifications = await userCollection
          .find({ type: "deliveryMan" })
          .project({ notifications: 1, name: 1, email: 1 })
          .toArray();

        res.send(deliveryNotifications);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to retrieve notifications" });
      }
    });

    // app.get("/parcels-delivery", async (req, res) => {
    //   const parcels = await parcelCollection
    //     .aggregate([
    //       {
    //         $unwind: "$deliveryManId",
    //       },
    //       {
    //         $lookup: {
    //           from: "users",
    //           localField: "deliveryManId",
    //           foreignField: "_id",
    //           as: "deliveryManDetails",
    //         },
    //       },

    //       {
    //         $unwind: "$deliveryManDetails",
    //       },

    //       {
    //         $match: {
    //           "deliveryManDetails.type": "deliveryMan",
    //         },
    //       },
    //     ])
    //     .toArray();
    //   res.send(parcels);
    // });
    app.get("/parcels-delivery", async (req, res) => {
      const parcels = await parcelCollection
        .aggregate([
          {
            $lookup: {
              from: "users",
              localField: "deliveryManId",
              foreignField: "_id",
              as: "deliveryManDetails",
            },
          },
          {
            $unwind: "$deliveryManDetails",
          },
          // {
          //   $match: {
          //     "deliveryManDetails.type": "deliveryMan",
          //   },
          // },
          // {
          //   $project: {
          //     addressLatitude: 1,
          //     addressLongitude: 1,
          //     approximateDeliveryDate: 1,
          //     deliveryAddress: 1,
          //     deliveryManDetails: {
          //       email: "$deliveryManDetails.email",
          //       name: "$deliveryManDetails.name",
          //       role: "$deliveryManDetails.role",
          //       type: "$deliveryManDetails.type",
          //       _id: "$deliveryManDetails._id",
          //     },
          //     deliveryManId: 1,
          //     email: 1,
          //     name: 1,
          //     parcelType: 1,
          //     parcelWeight: 1,
          //     phoneNumber: 1,
          //     price: 1,
          //     receiverName: 1,
          //     receiverNumber: 1,
          //     requestedDeliveryDate: 1,
          //     status: 1,
          //     _id: 1,
          //   },
          // },
        ])
        .toArray();
      // console.log(parcels);
      res.send(parcels);
    });

    app.post("/parcel", verifyToken, async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });
    app.get("/parcel/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await parcelCollection.find(query).toArray();
      res.send(result);
    });
    // app.get("/parcel", async (req, res) => {
    //   const { fromDate, toDate } = req.query;
    //   if (fromDate && toDate) {
    //     console.log(typeof(fromDate),toDate);
    //     const parcels = await parcelCollection
    //       .find({
    //         requestedDeliveryDate: {
    //           $gte: new Date(fromDate),
    //           $lte: new Date(toDate),
    //         },
    //       })
    //       .toArray();
    //       console.log(parcels);
    //     return res.send(parcels);
    //   }
    //   const result = await parcelCollection.find().toArray();
    //   res.send(result);
    // });
    app.get("/parcel", verifyToken, verifyAdmin, async (req, res) => {
      const { fromDate, toDate } = req.query;
      if (fromDate && toDate) {
        console.log("From Date Type:", typeof fromDate);
        console.log("To Date Type:", typeof toDate);

        // Parse the dates to make sure they are valid Date objects
        const parsedFromDate = new Date(fromDate);
        const parsedToDate = new Date(toDate);

        console.log("Parsed From Date:", parsedFromDate);
        console.log("Parsed To Date:", parsedToDate);

        // Make sure to pass Date objects for MongoDB query
        const parcels = await parcelCollection
          .find({
            requestedDeliveryDate: {
              $gte: parsedFromDate,
              $lte: parsedToDate,
            },
          })
          .toArray();

        console.log(parcels);
        return res.send(parcels);
      }

      const result = await parcelCollection.find().toArray();
      res.send(result);
    });

    app.get("/parcel/item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.findOne(query);
      res.send(result);
    });
    app.get("/parcel/booked/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.findOne(query);
      res.send(result);
    });
    app.patch("/parcel/item/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          phoneNumber: item.phoneNumber,
          parcelType: item.parcelType,
          parcelWeight: parseFloat(item.parcelWeight),
          receiverName: item.receiverName,
          receiverNumber: item.receiverNumber,
          deliveryAddress: item.deliveryAddress,
          requestedDeliveryDate: item.requestedDeliveryDate,
          addressLatitude: parseFloat(item.addressLatitude),
          addressLongitude: parseFloat(item.addressLongitude),
          price: item.price,
        },
      };

      const result = await parcelCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.put("/parcel/:id", async (req, res) => {
      const { id } = req.params;
      const { status, deliveryManId, approximateDeliveryDate } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
          deliveryManId: deliveryManId,
          approximateDeliveryDate: approximateDeliveryDate,
        },
      };

      const result = await parcelCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/parcel/delivery/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedStatus = {
        $set: {
          status: status,
        },
      };
      const result = await parcelCollection.updateOne(filter, updatedStatus);
      res.send(result);
    });

    app.delete("/parcel/cancel/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const updatedStatus = req.body.status;

      const result = await parcelCollection.deleteOne(query);

      res.send(result);
    });

    //payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      res.send(paymentResult);
    });
    app.get("/payments", verifyToken, async (req, res) => {
      const paymentResult = await paymentCollection.find().toArray();

      res.send(paymentResult);
    });
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };

      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const reviewData = req.body;
      const result = await reviewCollection.insertOne(reviewData);
      res.send(result);
    });
    app.get("/reviews", verifyToken, verifyAdmin, async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews/:deliveryManId", async (req, res) => {
      const { deliveryManId } = req.params;

      const reviews = await reviewCollection.find({ deliveryManId }).toArray();

      res.send(reviews);
    });
    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Parcel is coming");
});
app.listen(port, () => {
  console.log(`Parcel is delivered in port : ${port}`);
});
