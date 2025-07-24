import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <header style={{ 
        backgroundColor: '#2563eb', 
        color: 'white', 
        padding: '1rem 0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>富士山カレンダー</h1>
          <nav style={{ marginTop: '0.5rem' }}>
            <Link to="/" style={{ 
              color: 'white', 
              textDecoration: 'none',
              marginRight: '1rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}>ホーム</Link>
            <Link to="/favorites" style={{ 
              color: 'white', 
              textDecoration: 'none',
              marginRight: '1rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}>お気に入り</Link>
            <Link to="/admin" style={{ 
              color: 'white', 
              textDecoration: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}>地点登録</Link>
          </nav>
        </div>
      </header>
      
      <main style={{ flex: 1, padding: '1rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <Outlet />
        </div>
      </main>
      
      <footer style={{ 
        backgroundColor: '#1f2937', 
        color: 'white', 
        textAlign: 'center',
        padding: '1rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <p style={{ margin: 0 }}>&copy; 2025 富士山カレンダー. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;