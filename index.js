require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://parcel-management-2333e.web.app",
    ],
    credentials: true,
  })
);
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
      const isAdmin = user?.type === "admin";
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

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
    app.patch("/users", async (req, res) => {
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

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/notification", async (req, res) => {
      const result = await userCollection.find({ type: "pending" }).toArray();
      res.send(result);
    });
    app.get("/find/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", async (req, res) => {
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
    app.get("/parcels/deliveryMan/:id", async (req, res) => {
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

    app.post("/parcel", async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });
    app.get("/parcel/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await parcelCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/parcel", verifyToken, verifyAdmin, async (req, res) => {
      const result = await parcelCollection.find().toArray();
      res.send(result);
    });

    app.get("/parcels/all", async (req, res) => {
      const { fromDate, toDate } = req.query;
    
      if (fromDate && toDate) {
        const parsedFromDate = new Date(fromDate);
        const parsedToDate = new Date(toDate);

        const parcels = await parcelCollection
          .find({
            requestedDeliveryDate: {
              $gte: parsedFromDate,
              $lte: parsedToDate,
            },
          })
          .toArray();

        return res.send(parcels);
      }
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
    // app.put("/parcel/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const { status, deliveryManId, approximateDeliveryDate } = req.body;

    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       status: status,
    //       deliveryManId: deliveryManId,
    //       approximateDeliveryDate: approximateDeliveryDate,
    //     },
    //   };

    //   const result = await parcelCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // });

    app.put("/managing/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const { status, deliveryManId, approximateDeliveryDate } = req.body;
        const deliver = await userCollection.findOne({
          _id: new ObjectId(deliveryManId),
        });

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: status,
            deliveryManId: deliveryManId,
            approximateDeliveryDate: approximateDeliveryDate,
            deliveryManDetails: deliver?.email,
          },
        };

        const result = await parcelCollection.updateOne(filter, updateDoc);

        res.send(result);
      } catch (error) {
        console.error("Error updating parcel:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    app.get("/deli-parcels/:email", async (req, res) => {
      const email = req.params.email;

      const result = await parcelCollection
        .find({
          deliveryManDetails: {
            $exists: true,
            $in: [email],
          },
        })
        .toArray();

      res.send(result);
    });

    // app.patch("/parcel/delivery/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const { deliveryManId } = req.body;
    //   const { status } = req.body;
    //   const filter = { _id: new ObjectId(id) };
    //   const updatedStatus = {
    //     $set: {
    //       status: status,
    //     },
    //   };
    //   const deliveryMan = await userCollection.findOne({ _id: deliveryManId });
    //   if (deliveryMan) {
    //     const updatedDeliveryMan = {
    //       $inc: { deliveryCount: 1 }, // Increment deliveryCount by 1
    //     };
    //     await userCollection.updateOne(
    //       { _id: deliveryMan._id },
    //       updatedDeliveryMan
    //     );
    //   }
    //   const result = await parcelCollection.updateOne(filter, updatedStatus);
    //   res.send(result);
    // });

    app.patch("/parcel/delivery/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { deliveryManId, status } = req.body;

        const filter = { _id: new ObjectId(id) };
        const updatedStatus = {
          $set: {
            status: status,
          },
        };

        if (deliveryManId) {
          const deliveryMan = await userCollection.findOne({
            _id: new ObjectId(deliveryManId),
          });

          if (deliveryMan) {
            const updatedDeliveryMan = {
              $inc: { deliveryCount: 1 },
            };
            await userCollection.updateOne(
              { _id: deliveryMan._id },
              updatedDeliveryMan
            );
          }
        }
        const result = await parcelCollection.updateOne(filter, updatedStatus);
        res.send(result);
      } catch (error) {
        console.error("Error updating parcel and delivery man:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.delete("/parcel/cancel/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const updatedStatus = req.body.status;

      const result = await parcelCollection.deleteOne(query);

      res.send(result);
    });
    app.get("/top-deliveryMan", async (req, res) => {
      const topUsers = await userCollection
        .find()
        .sort({ deliveryCount: -1 })
        .limit(3)
        .toArray();

      res.send(topUsers);
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
    app.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
      const paymentResult = await paymentCollection.find().toArray();

      res.send(paymentResult);
    });
    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email };

      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const reviewData = req.body;
      const result = await reviewCollection.insertOne(reviewData);

      if (reviewData.deliveryManId) {
        const deliveryMan = await userCollection.findOne({
          _id: new ObjectId(reviewData.deliveryManId),
        });

        if (deliveryMan) {
          const updatedDeliveryMan = {
            $inc: { reviewCount: 1 },
          };
          await userCollection.updateOne(
            { _id: deliveryMan._id },
            updatedDeliveryMan
          );
        }
      }
      res.send(result);
    });
    app.get("/reviews", verifyToken, verifyAdmin, async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;

      const result = await reviewCollection
        .find({
          deliveryManEmail: {
            $exists: true,
            $in: [email],
          },
        })
        .toArray();

      res.send(result);
    });
    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    app.get("/stat", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const parcels = await parcelCollection.estimatedDocumentCount();

      const delivered = await parcelCollection.countDocuments({
        status: "Delivered",
      });
      res.send({ users, parcels, delivered });
    });

    // await client.db("admin").command({ ping: 1 });
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
