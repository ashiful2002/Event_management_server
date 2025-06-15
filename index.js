const express = require("express");
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
app.use(express.json());
app.use(cors());

const varifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorizes" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().varifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
  }
};

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
    // Send a ping to confirm a successful connection

    const eventsCollection = client.db("eventApp").collection("events");
    const joinedCollection = client.db("eventApp").collection("joinedEvents");
    const galleryCollection = client.db("eventApp").collection("eventGallery");

    // get events
    // app.get("/events", async (req, res) => {
    //   // const userEmail = req.user.email;
    //   const result = await eventsCollection.find().toArray();
    //   // console.log("user Email from middleware", userEmail);
    //   res.send(result);
    // });
    //
    // get events
    app.get("/events", async (req, res) => {
      const { type, search } = req.query;
      const todayISOString = new Date().toISOString();
      const filter = {
        date: { $gt: todayISOString },
      };
      // const filter = {};
      if (type) {
        filter.eventType = type;
      }
      if (search) {
        filter.title = {
          $regex: search,
          $options: "i",
        };
      }
      const result = await eventsCollection
        .find(filter)
        .sort({ date: 1 })
        .toArray();
      res.send(result);
    });

    // get single event
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    //patch to update event
    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updatedData.title,
          location: updatedData.location,
          eventType: updatedData.eventType,
          date: updatedData.date,
          thumbnail: updatedData.thumbnail,
          description: updatedData.description,
        },
      };
      const result = await eventsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete event
    app.use("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    // join an event
    app.patch("/joined-events", async (req, res) => {
      const joinData = req.body;

      const alreadyJoined = await joinedCollection.findOne({
        eventId: joinData.eventId,
        userEmail: joinData.userEmail,
      });
      if (alreadyJoined) {
        return res.send({ success: false, message: "Already joined" });
      }
      const result = await joinedCollection.insertOne(joinData);
      if (result.insertedId) {
        res.send({ success: true, insertedId: result.insertedId });
      } else {
        res
          .status(500)
          .send({ success: false, message: "Failed to join the event" });
      }
    });
    // user jouned events=
    app.get("/joined-events/:email", async (req, res) => {
      const email = req.params.email;
      const result = await joinedCollection
        .find({ userEmail: email })
        .sort({ date: 1 })
        .toArray();
      res.send(result);
    });
    //       /joined-events
    app.get("/joined-events/:eventId", async (req, res) => {
      const { eventId } = req.params;
      const { email } = req.query;

      const joined = await joinedCollection.findOne({
        eventId: new ObjectId(eventId),
        userEmail: email,
      });
      res.send({ joined: !!joined });
    });

    // post events
    app.post("/events", async (req, res) => {
      const eventData = req.body;
      console.log(eventData);
      const result = await eventsCollection.insertOne(eventData);
      res.send(result);
    });

    // update events

    app.patch("/update-event/:id", async (req, res) => {
      const id = req.body.id;
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

// Root route
app.get("/", (req, res) => {
  res.send("Event management server is running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
