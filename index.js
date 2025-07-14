const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const exerciseSchema = new mongoose.Schema({
  _id: String,
  username: String,
  description: String,
  duration: Number,
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
});

const logsSchema = new mongoose.Schema({
  _id: String,
  username: String,
  count: Number,
  logs: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});
const user = mongoose.model("Users", userSchema);

const logs = mongoose.model("Logs", logsSchema);

mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log("connected successfully");
  })
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//adding new user
app.post("/api/users", async function (req, res) {
  const newUser = new user({
    username: req.body.username,
  });
  await newUser.save();
  console.log(req.body.username);
  res.send(newUser);
});
//finding all users
app.get("/api/users", async function (req, res) {
  const allUser = await user.find();
  res.json(allUser);
});

//adding new exercises
app.post("/api/users/:_id/exercises", async function (req, res) {
  const usr = await user.findById(req.params._id);

  let old = await logs.findById(req.params._id);
  console.log(old);
  let newExecise = {
    description: req.body.description,
    duration: Number(req.body.duration),
    date: req.body.date
      ? req.body.date
      : new Date().toISOString().split("T")[0],
  };

  if (!old) {
    const log = new logs({
      _id: req.params._id,
      username: usr.username,
      count: 1,
      logs: [
        {
          description: req.body.description,
          duration: Number(req.body.duration),
          date: req.body.date ? req.body.date : new Date(),
        },
      ],
    });
    await log.save();
    res.json({
      _id: req.params._id,
      username: usr.username,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date
        ? req.body.date
        : new Date().toISOString().split("T")[0],
    });
  } else {
    oldLog = old.logs.push(newExecise);
    old.count = old.logs.length;
    const log = await logs.findByIdAndUpdate(req.params._id, { ...old });
    res.json({
      _id: req.params._id,
      username: usr.username,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date
        ? req.body.date
        : new Date().toISOString().split("T")[0],
    });
  }
});

app.get("/api/logs/:_id", async function (req, res) {
  const log = await logs.findById(req.params._id);
  res.json(log);
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const userId = req.params._id;

    const user = await logs.findById(userId).lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    let newLogs = user.logs;

    // Convert string dates to actual Date objects
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    // Filter by date range
    if (fromDate || toDate) {
      newLogs = newLogs.filter((log) => {
        const logDate = new Date(log.date);
        if (fromDate && logDate < fromDate) return false;
        if (toDate && logDate > toDate) return false;
        return true;
      });
    }

    // Apply limit
    if (limit) {
      newLogs = newLogs.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: newLogs.length,
      logs: newLogs.map((log) => ({
        description: log.description,
        duration: log.duration,
        date: new Date(log.date).toDateString(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
