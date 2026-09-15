import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";


// =====================================================
// BUS ICON
// =====================================================

const busIcon = new L.Icon({

  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",

  iconSize: [40, 40],

  iconAnchor: [20, 40]

});


// =====================================================
// ROUTE DATA
// =====================================================

const routes = {

  // ===================================================
  // ROUTE R1
  // ===================================================

  R1: {

    name: "Route R1",

    stops: [
      "Campus",
      "Terminal",
      "Meril",
      "Gachpara",
      "Shohor",
      "Court",
      "Ononto",
      "Mujahid Club",
      "Terminal",
      "Campus"
    ],

    currentStop: "Shohor",

    nextStop: "Court",

    // Demo coordinate
    position: [24.3745, 88.6042],

    status: "Live",

    updated: "20 seconds ago"

  },


  // ===================================================
  // ROUTE R2
  // ===================================================

  R2: {

    name: "Route R2",

    stops: [
      "Campus",
      "Terminal",
      "Mujahid Club",
      "Ononto",
      "Court",
      "Shohor",
      "Gachpara",
      "Meril",
      "Terminal",
      "Campus"
    ],

    currentStop: "Ononto",

    nextStop: "Court",

    // Demo coordinate
    position: [24.3685, 88.6025],

    status: "Live",

    updated: "35 seconds ago"

  },


  // ===================================================
  // ROUTE R3
  // ===================================================

  R3: {

    name: "Route R3",

    stops: [
      "Campus",
      "Terminal",
      "Meril",
      "Gachpara",
      "Tebunia",
      "Ishwardi",
      "Tebunia",
      "Gachpara",
      "Meril",
      "Terminal",
      "Campus"
    ],

    currentStop: "Tebunia",

    nextStop: "Ishwardi",

    // Demo coordinate
    position: [24.3740, 88.6100],

    status: "Estimated",

    updated: "4 minutes ago"

  }

};


// =====================================================
// MAP AUTO FOLLOW COMPONENT
// =====================================================

function MapUpdater({ position }) {

  const map = useMap();


  useEffect(() => {

    if (!position) {
      return;
    }


    map.setView(

      position,

      map.getZoom(),

      {
        animate: true
      }

    );

  }, [position, map]);


  return null;

}


// =====================================================
// MAIN COMPONENT
// =====================================================

function BusTracking({
  darkMode,
  setDarkMode
}) {


  // ===================================================
  // GET ROUTE ID FROM URL
  // ===================================================

  const { routeId } = useParams();


  // Get route

  const route =
    routes[routeId] || routes.R1;


  // ===================================================
  // LOCAL GPS STATE
  // ===================================================

  const [location, setLocation] =
    useState(null);


  // ===================================================
  // GPS STATUS
  // ===================================================

  const [gpsStatus, setGpsStatus] =
    useState("Not sharing");


  // ===================================================
  // SERVER BUS LOCATION
  // ===================================================

  const [busLocation, setBusLocation] =
    useState(null);


  // ===================================================
  // SOCKET.IO
  // ===================================================

  useEffect(() => {


    console.log(
      "Connecting to Socket.IO server..."
    );


    // Connect to backend

    const socket =
      io("http://localhost:5000");


    // =================================================
    // SOCKET CONNECTED
    // =================================================

    socket.on("connect", () => {

      console.log(
        "Socket connected:",
        socket.id
      );

    });


    // =================================================
    // INITIAL LOCATIONS
    // =================================================

    socket.on(
      "initial-bus-locations",
      (locations) => {

        console.log(
          "Initial locations:",
          locations
        );


        if (locations[routeId]) {

          setBusLocation(
            locations[routeId]
          );

        }

      }
    );


    // =================================================
    // LIVE LOCATION UPDATE
    // =================================================

    socket.on(
      "bus-location-update",
      (locationData) => {

        console.log(
          "Live bus update:",
          locationData
        );


        // Only update selected route

        if (
          locationData.routeId === routeId
        ) {

          setBusLocation(
            locationData
          );

        }

      }
    );


    // =================================================
    // SOCKET ERROR
    // =================================================

    socket.on(
      "connect_error",
      (error) => {

        console.log(
          "Socket connection error:",
          error
        );

      }
    );


    // =================================================
    // CLEANUP
    // =================================================

    return () => {

      socket.disconnect();

    };


  }, [routeId]);


  // =====================================================
  // SEND GPS TO NODE.JS
  // =====================================================

  const sendLocationToServer = async (
    latitude,
    longitude,
    accuracy
  ) => {

    try {


      const response = await fetch(

        "http://localhost:5000/api/location",

        {

          method: "POST",


          headers: {

            "Content-Type":
              "application/json"

          },


          body: JSON.stringify({

            routeId:

              routeId,


            latitude:

              latitude,


            longitude:

              longitude,


            accuracy:

              accuracy

          })

        }

      );


      const data =
        await response.json();


      // =================================================
      // SERVER RESPONSE
      // =================================================

      if (response.ok) {

        console.log(
          "Location sent successfully:",
          data
        );

      }

      else {

        console.log(
          "Server error:",
          data
        );

      }


    }

    catch (error) {


      console.log(
        "Backend connection failed:",
        error
      );


      setGpsStatus(
        "GPS active, server unavailable"
      );

    }

  };


  // =====================================================
  // START GPS
  // =====================================================

  const startGPS = () => {


    // =================================================
    // CHECK GPS SUPPORT
    // =================================================

    if (!navigator.geolocation) {

      setGpsStatus(
        "GPS is not supported by this browser"
      );

      return;

    }


    // =================================================
    // STATUS
    // =================================================

    setGpsStatus(
      "Getting your location..."
    );


    // =================================================
    // WATCH GPS
    // =================================================

    navigator.geolocation.watchPosition(


      // =================================================
      // SUCCESS
      // =================================================

      (position) => {


        const latitude =
          position.coords.latitude;


        const longitude =
          position.coords.longitude;


        const accuracy =
          position.coords.accuracy;


        // =============================================
        // SAVE LOCAL GPS
        // =============================================

        setLocation({

          latitude,

          longitude,

          accuracy

        });


        // =============================================
        // GPS STATUS
        // =============================================

        setGpsStatus(
          "GPS sharing active"
        );


        // =============================================
        // SEND TO SERVER
        // =============================================

        sendLocationToServer(

          latitude,

          longitude,

          accuracy

        );

      },


      // =================================================
      // ERROR
      // =================================================

      (error) => {


        console.log(
          "GPS Error:",
          error
        );


        setGpsStatus(
          "Unable to get GPS location"
        );

      },


      // =================================================
      // GPS OPTIONS
      // =================================================

      {

        enableHighAccuracy: true,

        maximumAge: 5000,

        timeout: 10000

      }

    );

  };


  // =====================================================
  // BUS MAP POSITION
  // =====================================================

  const busPosition =

    busLocation

      ? [

          busLocation.latitude,

          busLocation.longitude

        ]

      : route.position;


  // =====================================================
  // ROUTE POLYLINE
  // =====================================================

  // These are currently demo coordinates.
  // We will replace them with actual route coordinates.

  const routeCoordinates = [

    [24.3750, 88.5980],

    [24.3745, 88.6042],

    [24.3700, 88.6070],

    [24.3680, 88.6100],

    [24.3650, 88.6150]

  ];


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="tracking-page">


      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="navbar">


        {/* LOGO */}

        <Link
          to="/"
          className="logo"
        >

          🚌 PUST Bus Tracker

        </Link>


        {/* NAVIGATION */}

        <div className="nav-links">


          <Link to="/">
            Home
          </Link>


          <Link to="/routes">
            Routes
          </Link>


        </div>


        {/* RIGHT SIDE */}

        <div className="nav-right">


          {/* THEME */}

          <button

            className="theme-button"

            onClick={() =>
              setDarkMode(!darkMode)
            }

          >

            {darkMode
              ? "☀️"
              : "🌙"}

          </button>


          {/* LOGIN */}

          <button className="login-button">

            Student Login

          </button>


        </div>

      </nav>



      {/* =================================================
          TRACKING HEADER
      ================================================= */}

      <section className="tracking-header">


        <div>


          {/* BACK */}

          <Link
            to="/routes"
            className="back-link"
          >

            ← All Routes

          </Link>


          {/* ROUTE NAME */}

          <h1>

            {route.name}

          </h1>


          {/* ROUTE */}

          <p>

            Campus →{" "}

            {route.stops
              .slice(1, 5)
              .join(" → ")}

            ...

          </p>

        </div>


        {/* =================================================
            LIVE STATUS
        ================================================= */}

        <div

          className={

            route.status === "Live"

              ? "tracking-status live"

              : "tracking-status estimated"

          }

        >

          {route.status === "Live"

            ? "● Live"

            : "○ Estimated"}

        </div>

      </section>



      {/* =================================================
          TRACKING CONTAINER
      ================================================= */}

      <section className="tracking-container">


        {/* =================================================
            MAP
        ================================================= */}

        <div className="map-box">


          <MapContainer

            center={busPosition}

            zoom={14}

            scrollWheelZoom={true}

            style={{

              height: "100%",

              width: "100%"

            }}

          >


            {/* =============================================
                AUTO FOLLOW MAP
            ============================================= */}

            <MapUpdater
              position={busPosition}
            />


            {/* =============================================
                OPEN STREET MAP
            ============================================= */}

            <TileLayer

              attribution=
                "&copy; OpenStreetMap contributors"

              url=
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

            />


            {/* =============================================
                BUS MARKER
            ============================================= */}

            <Marker

              position={busPosition}

              icon={busIcon}

            >

              <Popup>


                <strong>

                  🚌 {route.name}

                </strong>


                <br />


                Current location:


                <br />


                {busLocation

                  ? "Live GPS Location"

                  : route.currentStop}


              </Popup>

            </Marker>


            {/* =============================================
                ROUTE LINE
            ============================================= */}

            <Polyline

              positions={
                routeCoordinates
              }

            />


          </MapContainer>

        </div>



        {/* =================================================
            INFORMATION PANEL
        ================================================= */}

        <div className="tracking-info">


          {/* =================================================
              CURRENT LOCATION
          ================================================= */}

          <div className="info-card">


            <div className="info-label">

              CURRENT LOCATION

            </div>


            <h2>

              📍{" "}

              {busLocation

                ? "Live GPS Location"

                : route.currentStop}

            </h2>


            <p>

              {busLocation

                ? "Location received from server"

                : `Last updated ${route.updated}`}

            </p>


            {/* SERVER COORDINATES */}

            {busLocation && (

              <div className="gps-data">


                <p>

                  Latitude:{" "}

                  {busLocation.latitude
                    .toFixed(6)}

                </p>


                <p>

                  Longitude:{" "}

                  {busLocation.longitude
                    .toFixed(6)}

                </p>


                <p>

                  Accuracy:{" "}

                  {busLocation.accuracy
                    ? busLocation.accuracy
                        .toFixed(1)
                    : "N/A"}

                  {" "}meters

                </p>

              </div>

            )}

          </div>



          {/* =================================================
              NEXT STOP
          ================================================= */}

          <div className="info-card">


            <div className="info-label">

              NEXT STOP

            </div>


            <h2>

              ➡️ {route.nextStop}

            </h2>


            <p>

              Bus is moving along
              the route.

            </p>

          </div>



          {/* =================================================
              ROUTE STOPS
          ================================================= */}

          <div className="stops-card">


            <h2>

              Route Stops

            </h2>


            <div className="stops-list">


              {route.stops.map(

                (stop, index) => (

                  <div

                    className={

                      stop ===
                      route.currentStop

                        ? "stop current-stop"

                        : "stop"

                    }

                    key={index}

                  >


                    <span className="stop-dot">


                      {stop ===
                      route.currentStop

                        ? "🚌"

                        : "●"}


                    </span>


                    <span>

                      {stop}

                    </span>


                  </div>

                )

              )}


            </div>

          </div>



          {/* =================================================
              GPS STATUS
          ================================================= */}

          <div className="gps-status-card">


            <h3>

              GPS Contribution

            </h3>


            <p>

              Status:{" "}

              <strong>

                {gpsStatus}

              </strong>

            </p>


            {/* LOCAL GPS DATA */}

            {location && (

              <div className="gps-data">


                <p>

                  Latitude:{" "}

                  {location.latitude
                    .toFixed(6)}

                </p>


                <p>

                  Longitude:{" "}

                  {location.longitude
                    .toFixed(6)}

                </p>


                <p>

                  Accuracy:{" "}

                  {location.accuracy
                    .toFixed(1)}

                  {" "}meters

                </p>


              </div>

            )}


            {/* SERVER STATUS */}

            {busLocation && (

              <div className="gps-data">


                <p>

                  🟢 Server receiving GPS

                </p>


                <p>

                  Route:{" "}

                  {busLocation.routeId}

                </p>


              </div>

            )}

          </div>



          {/* =================================================
              GPS BUTTON
          ================================================= */}

          <button

            className="gps-button"

            onClick={startGPS}

          >

            📍 I'm on this bus

          </button>


        </div>

      </section>

    </div>

  );

}


// =====================================================
// EXPORT
// =====================================================

export default BusTracking;