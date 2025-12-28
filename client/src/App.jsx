import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import PhotoDetail from './pages/PhotoDetail';
import DeceasedLocation from './pages/DeceasedLocation';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/home" /> : <Login setIsAuthenticated={setIsAuthenticated} setCurrentUser={setCurrentUser} />
            }
          />
          <Route
            path="/home"
            element={
              isAuthenticated ? (
                <Home
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onUpdateUser={setCurrentUser}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/photo"
            element={
              isAuthenticated ? <PhotoDetail currentUser={currentUser} /> : <Navigate to="/" />
            }
          />
          <Route
            path="/deceased-location"
            element={
              isAuthenticated ? <DeceasedLocation /> : <Navigate to="/" />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App
