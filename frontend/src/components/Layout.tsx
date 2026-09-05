import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Chatbox from "./Chatbox";

export default function Layout() {
  const location = useLocation();
  const isChatPage = location.pathname === "/chat";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      <Header />
      <main className={`flex-1 ${isChatPage ? "h-[calc(100vh-80px)] overflow-hidden" : ""}`}>
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
      {/* Floating Chatbox Widget */}
      {!isChatPage && <Chatbox />}
    </div>
  );
}
