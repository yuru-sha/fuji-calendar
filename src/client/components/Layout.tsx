import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="App hide-scrollbar">
      <header className="header">
        <div className="container">
          <h1>富士山カレンダー</h1>
          <nav>
            <Link to="/">ホーム</Link>
            <Link to="/favorites">お気に入り</Link>
            <Link to="/admin">地点登録</Link>
          </nav>
        </div>
      </header>
      
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 富士山カレンダー. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;