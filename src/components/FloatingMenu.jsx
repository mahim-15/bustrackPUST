import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import "./FloatingMenu.css";

export default function FloatingMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="floating-btn"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="app-navigation-drawer"
      >
        <span className="dash" />
        <span className="dash" />
        <span className="dash" />
      </button>
      {open && (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <div
        id="app-navigation-drawer"
        className={`side-drawer${open ? " open" : ""}`}
        aria-hidden={!open}
      >
        <Sidebar drawer onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
