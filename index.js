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
    //users data

    app.post("/users", async (req, res) => {
      const { email, name, type, isSocialLogin } = req.body;
    
      const existingUser = await userCollection.findOne({ email });
    
      if (existingUser) {
        return res.send({ message: "User exists" });
      }
    
      const newUser = {
        email,
        name,
        type: type || "user", 
        isSocialLogin: isSocialLogin || false, 
      };
    
      const result = await userCollection.insertOne(newUser);
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
        if (user.role === "admin" && !user.isSocialLogin) {
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
        deliveryMan = user?.role === "deliveryMan";
      }
      res.send({ deliveryMan });
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
   
    app.patch(
      "/users/admin/:id",

      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
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
            role: "deliveryMan",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    //parcel data
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

    await client.db("admin").command({ ping: 1 });
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
