import { useEffect, useState } from "react";
import "./Stats.css"; // optional styling

const Stats = () => {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Replace with your actual backend endpoint
    fetch("/api/registrations/count")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setCount(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading statistics…</p>;
  if (error) return <p>Error loading statistics: {error}</p>;

  return (
    <div className="stats-page">
      <h2>Registered Users</h2>
      <p>Total people registered: <strong>{count}</strong></p>
    </div>
  );
};

export default Stats;
