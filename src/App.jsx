import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Home from "./pages/Home";
import BusRoutes from "./pages/BusRoutes";
import BusTracking from "./pages/BusTracking";


function App() {

  const [darkMode, setDarkMode] = useState(false);


  return (

    <div className={darkMode ? "dark" : "light"}>

      <BrowserRouter>

        <Routes>

          <Route
            path="/"
            element={
              <Home
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            }
          />


          <Route
            path="/routes"
            element={
              <BusRoutes
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            }
          />


          <Route
            path="/track/:routeId"
            element={
              <BusTracking
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            }
          />

        </Routes>

      </BrowserRouter>

    </div>

  );
}


export default App;