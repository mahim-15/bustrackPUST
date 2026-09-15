import { Link } from "react-router-dom";

function BusRoutes({ darkMode, setDarkMode }) {
  return (
    <div className="routes-page">

      {/* Navbar */}
      <nav className="navbar">

        <Link to="/" className="logo">
          🚌 PUST Bus Tracker
        </Link>

        <div className="nav-right">

          <button
            className="theme-button"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button className="login-button">
            Student Login
          </button>

        </div>

      </nav>


      {/* Heading */}
      <section className="routes-header">

        <h1>PUST Bus Routes</h1>

        <p>
          Select a route to see available buses
          and track their location.
        </p>

      </section>


      {/* Routes */}
      <section className="route-container">

        <div className="route-card">

          <div className="route-number">
            R1
          </div>

          <h2>Route R1</h2>

          <p>
            Campus → Terminal → Meril → Gachpara →
            Shohor → Court → Ononto → Mujahid Club →
            Terminal → Campus
          </p>

          <Link to="/track/R1">
            <button className="route-button">
              Track R1
            </button>
          </Link>

        </div>


        <div className="route-card">

          <div className="route-number">
            R2
          </div>

          <h2>Route R2</h2>

          <p>
            Campus → Terminal → Mujahid Club →
            Ononto → Court → Shohor → Gachpara →
            Meril → Terminal → Campus
          </p>

          <Link to="/track/R2">
            <button className="route-button">
              Track R2
            </button>
          </Link>

        </div>


        <div className="route-card">

          <div className="route-number">
            R3
          </div>

          <h2>Route R3</h2>

          <p>
            Campus → Terminal → Meril → Gachpara →
            Tebunia → Ishwardi → Tebunia → Gachpara →
            Meril → Terminal → Campus
          </p>

          <Link to="/track/R3">
            <button className="route-button">
              Track R3
            </button>
          </Link>

        </div>

      </section>

    </div>
  );
}

export default BusRoutes;