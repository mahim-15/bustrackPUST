import { Link } from "react-router-dom";

function Home({ darkMode, setDarkMode }) {

  const buses = [
    {
      route: "R1",
      status: "Live",
      location: "Shohor",
      updated: "20 sec ago",
      routeText: "Campus → Terminal → Meril → Gachpara → Shohor"
    },
    {
      route: "R2",
      status: "Live",
      location: "Ononto",
      updated: "35 sec ago",
      routeText: "Campus → Terminal → Mujahid Club → Ononto → Court"
    },
    {
      route: "R3",
      status: "Estimated",
      location: "Tebunia",
      updated: "4 min ago",
      routeText: "Campus → Terminal → Meril → Gachpara → Tebunia → Ishwardi"
    }
  ];

  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">

        <Link to="/" className="logo">
          🚌 PUST Bus Tracker
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/routes">Routes</Link>
          <a href="#about">About</a>
        </div>

        <div className="nav-right">

          <button
            className="theme-button"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <button className="login-button">
            Student Login
          </button>

        </div>

      </nav>


      {/* Hero */}
      <section className="hero">

        <div className="hero-content">

          <p className="hero-small">
            🚌 PUST TRANSPORTATION
          </p>

          <h1>
            Track Your Bus
            <br />
            <span>In Real Time</span>
          </h1>

          <p className="hero-description">
            Find your university bus, check its current location,
            and know when it was last updated.
          </p>


          {/* Search */}
          <div className="search-box">

            <span>🔍</span>

            <input
              type="text"
              placeholder="Search bus or route..."
            />

            <button>
              Search
            </button>

          </div>

        </div>

      </section>


      {/* Running Buses */}
      <section className="running-section">

        <div className="section-title">

          <div>
            <h2>🟢 Buses Running Now</h2>

            <p>
              Live and estimated bus locations
            </p>
          </div>

          <Link to="/routes">
            View All Routes →
          </Link>

        </div>


        <div className="bus-list">

          {buses.map((bus) => (

            <Link
              to={`/track/${bus.route}`}
              className="bus-card"
              key={bus.route}
            >

              <div className="bus-icon">
                🚌
              </div>


              <div className="bus-info">

                <div className="bus-top">

                  <h3>
                    Route {bus.route}
                  </h3>

                  <span
                    className={
                      bus.status === "Live"
                        ? "status live"
                        : "status estimated"
                    }
                  >
                    {bus.status === "Live" ? "●" : "○"} {bus.status}
                  </span>

                </div>

                <p className="bus-route">
                  {bus.routeText}
                </p>

                <div className="bus-details">

                  <span>
                    📍 {bus.location}
                  </span>

                  <span>
                    🕐 Updated {bus.updated}
                  </span>

                </div>

              </div>


              <div className="arrow">
                →
              </div>

            </Link>

          ))}

        </div>

      </section>


      {/* Contribution */}
      <section className="contribute-section">

        <div>

          <span className="contribute-icon">
            📍
          </span>

          <h2>
            Are you on the bus?
          </h2>

          <p>
            Share your GPS location and help other students
            track the bus in real time.
          </p>

          <button className="contribute-button">
            Start Contributing
          </button>

        </div>

      </section>


      {/* About */}
      <section id="about" className="about-section">

        <h2>
          How PUST Bus Tracker Works
        </h2>

        <div className="about-cards">

          <div>
            <span>🔍</span>
            <h3>Find Your Bus</h3>
            <p>
              Search for your route and select the bus.
            </p>
          </div>

          <div>
            <span>🗺️</span>
            <h3>Track Location</h3>
            <p>
              See the bus location on the live map.
            </p>
          </div>

          <div>
            <span>⭐</span>
            <h3>Contribute</h3>
            <p>
              Share GPS and earn contribution points.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default Home;