require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

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

    //users data

    app.post("/users", async (req, res) => {
      const { email, name, type, isSocialLogin, photoURL } = req.body;

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
        phoneNumber
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
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
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
    app.get("/users/deliveryMan", async (req, res) => {
      try {
        const deliveryMen = await userCollection
          .find({ type: "deliveryMan" })
          .toArray();

        res.send(deliveryMen);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to retrieve deliveryMen" });
      }
    });
    app.patch(
      "/users/admin/:id",

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

    // app.post("/notifications", async (req, res) => {
    //   const notificationData = req.body;

    //   const result = await notificationCollection.insertOne(notificationData);
    //   res.send(result);
    // });
    // app.get("/notifications", async (req, res) => {
    //   const result = await notificationCollection.find().toArray();
    //   res.send(result);
    // });

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
            .find({ type: "deliveryMan" }) // Filter for delivery men
            .project({ notifications: 1, name: 1, email: 1 }) // Include only notifications and basic details
            .toArray();
   
         res.send(deliveryNotifications);
      } catch (error) {
         console.error(error);
         res.status(500).send({ error: "Failed to retrieve notifications" });
      }
   });

   


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

          {
            $match: {
              "deliveryManDetails.type": "deliveryMan",
            },
          },
        ])
        .toArray();
      res.send(parcels);
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
    app.get("/parcel", async (req, res) => {
      const result = await parcelCollection.find().toArray();
      res.send(result);
    });
    // app.get("/totalParcel/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await parcelCollection.find(query).toArray();
    //   res.send(result);
    // });
    app.get("/parcel/item/:id", async (req, res) => {
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
    app.delete("/parcel/item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.deleteOne(query);
      res.send(result);
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
