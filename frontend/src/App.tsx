import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import PlantPage from "./pages/Plant";
import PlantDetail from "./pages/PlantDetail";
import FavoritesPage from "./pages/Favorites";
import ArticlesPage from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import AIRecognitionPage from "./pages/AIRecognition";
import Admin from "./pages/Admin";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Community from "./pages/Community";
import Packages from "./pages/Packages";
import Account from "./pages/Account";
import { AuthProvider } from "./auth";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/plants" element={<PlantPage />} />
            <Route path="/plants/:id" element={<PlantDetail />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/ai-recognition" element={<AIRecognitionPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/community" element={<Community />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}