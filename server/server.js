const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const PORT = 5000;


// =========================
// HTTP SERVER
// =========================

const server = http.createServer(app);


// =========================
// SOCKET.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});


// =========================
// MIDDLEWARE
// =========================

app.use(cors());

app.use(express.json());


// =========================
// STORE BUS LOCATIONS
// =========================

let busLocations = {};


// =========================
// HOME
// =========================

app.get("/", (req, res) => {

  res.json({
    message: "PUST Bus Tracker Server is running!"
  });

});


// =========================
// RECEIVE GPS
// =========================

app.post("/api/location", (req, res) => {

  const {
    routeId,
    latitude,
    longitude,
    accuracy
  } = req.body;


  // Validate data

  if (
    !routeId ||
    latitude === undefined ||
    longitude === undefined
  ) {

    return res.status(400).json({
      message: "Invalid GPS data"
    });

  }


  // Create location object

  const location = {

    routeId,

    latitude,

    longitude,

    accuracy,

    updatedAt: new Date()

  };


  // Save location

  busLocations[routeId] = location;


  console.log(
    `Route ${routeId}:`,
    latitude,
    longitude
  );


  // =========================
  // SEND LOCATION TO ALL USERS
  // =========================

  io.emit(
    "bus-location-update",
    location
  );


  // Response

  res.json({

    message: "Location received",

    location

  });

});


// =========================
// GET BUS LOCATION
// =========================

app.get(
  "/api/location/:routeId",
  (req, res) => {

    const routeId =
      req.params.routeId;


    const location =
      busLocations[routeId];


    if (!location) {

      return res.status(404).json({
        message: "No location available"
      });

    }


    res.json(location);

  }
);


// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {

  console.log(
    "User connected:",
    socket.id
  );


  // Send existing locations
  // to newly connected user

  socket.emit(
    "initial-bus-locations",
    busLocations
  );


  // User disconnected

  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});


// =========================
// START SERVER
// =========================

server.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});