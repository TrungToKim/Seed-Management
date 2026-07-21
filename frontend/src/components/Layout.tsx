import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <nav className="navbar">
        <div className="container">
          <NavLink to="/" className="navbar-brand">
            🌿 Quản Lý Cây Thuốc
          </NavLink>
          <ul className="navbar-links">
            <li><NavLink to="/">Trang Chủ</NavLink></li>
            <li><NavLink to="/plants">Cây Thuốc</NavLink></li>
            <li><NavLink to="/admin">Quản Trị</NavLink></li>
            <li><NavLink to="/chat">Tra Cứu AI</NavLink></li>
          </ul>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          Quản Lý Cây Thuốc &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </>
  );
}
