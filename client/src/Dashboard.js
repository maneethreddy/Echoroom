import React from 'react';

function Dashboard() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth";
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>👑 Welcome to EchoRoom Dashboard</h1>
      <p>You are logged in!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default Dashboard;
