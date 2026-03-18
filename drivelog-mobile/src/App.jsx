import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import RideNew from './pages/RideNew';
import RideList from './pages/RideList';
import RiderNew from './pages/RiderNew';
import CustomerNew from './pages/CustomerNew';
import CustomerList from './pages/CustomerList';
import Settings from './pages/Settings';

function Guard({ user, children }) {
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const handleLogout = () => setUser(null);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', background: '#f7f8fc', position: 'relative' }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
        <Route path="/" element={<Guard user={user}><Home user={user} /></Guard>} />
        <Route path="/ride/new" element={<Guard user={user}><RideNew user={user} /></Guard>} />
        <Route path="/ride/list" element={<Guard user={user}><RideList /></Guard>} />
        <Route path="/rider/new" element={<Guard user={user}><RiderNew /></Guard>} />
        <Route path="/customer/new" element={<Guard user={user}><CustomerNew /></Guard>} />
        <Route path="/customer/list" element={<Guard user={user}><CustomerList /></Guard>} />
        <Route path="/settings" element={<Guard user={user}><Settings user={user} onLogout={handleLogout} /></Guard>} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
      </Routes>
    </div>
  );
}
