"use client";  // 👈 must be the first line!

import React, { useState, useEffect } from "react";

const FetchUserPage = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchUser();
  }, []);

  return (
    <div>
      <h1>User Info</h1>
      {user ? (
        <div>
          <p>Welcome, {user.name}</p>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}>
            Toggle Menu
          </button>
          {dropdownOpen && <div>Dropdown Content</div>}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default FetchUserPage;
