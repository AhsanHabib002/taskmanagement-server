const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9fdmi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const taskCollection = client.db("taskDB").collection("task");
    const usersCollection = client.db("taskDB").collection("users");

    // JWT API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorization" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // task API

    app.get("/task", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const result = await await taskCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.post("/task", async (req, res) => {
      const task = req.body;
      const result = await taskCollection.insertOne(task);
      res.send(result);
    });

    app.put("/task/:id", async (req, res) => {
      const { id } = req.params;
      const update = req.body;
      const result = await taskCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.send(result);
    });

    app.delete("/task/:id", async (req, res) => {
      try {
        const { id } = req.params;
        
        const result = await taskCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Task deleted successfully" });
        } else {
          res.status(404).send({ success: false, message: "Task not found" });
        }
      } catch (error) {
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // users API
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // stream
    const taskChangeStream = taskCollection.watch();

    taskChangeStream.on("change", (change) => {
      console.log("Task Collection Changed:", change);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Daily Task is Active");
});

app.listen(port, () => {
  console.log(`Daily Task is Active  on port${port}`);
});
