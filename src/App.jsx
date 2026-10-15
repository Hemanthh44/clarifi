import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RedirectIfAuthed, RequireAuth } from "./lib/auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Ask from "./pages/Ask";
import ProductExplainer from "./pages/ProductExplainer";
import RiskSimulator from "./pages/RiskSimulator";
import ScamScreener from "./pages/ScamScreener";
import Documents from "./pages/Documents";
import Portfolio from "./pages/Portfolio";
import History from "./pages/History";
import Settings from "./pages/Settings";
import MlLab from "./pages/MlLab";

// Every authenticated surface goes through RequireAuth, so the sidebar can
// assume a real account exists and render that person's actual name.
const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/ask", element: <Ask /> },
  { path: "/product-explainer", element: <ProductExplainer /> },
  { path: "/risk-simulator", element: <RiskSimulator /> },
  { path: "/ml-lab", element: <MlLab /> },
  { path: "/scam-screener", element: <ScamScreener /> },
  { path: "/documents", element: <Documents /> },
  { path: "/portfolio", element: <Portfolio /> },
  { path: "/history", element: <History /> },
  { path: "/settings", element: <Settings /> },
];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthed>
                <Signup />
              </RedirectIfAuthed>
            }
          />
          {protectedRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={<RequireAuth>{element}</RequireAuth>} />
          ))}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
