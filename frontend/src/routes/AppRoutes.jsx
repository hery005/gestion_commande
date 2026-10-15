import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth.js";
import "../features/auth/styles/auth.css";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import RegisterPage from "../features/auth/pages/RegisterPage.jsx";
import DashboardPage from "../features/dashboard/pages/dashboardPage.jsx";
import InventoryPage from "../features/inventory/pages/InventoryPage.jsx";
import AnalysisPage from "../features/analysis/pages/AnalysisPage.jsx";
import ModelPage from "../features/models/pages/ModelPage.jsx";

function RequireAuth({ children }) {
    const { isAuthenticated, isSessionLoading } = useAuth();
    if (isSessionLoading) return <main className="auth-loading" role="status">Restauration de la session…</main>;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
    const { isAuthenticated, isSessionLoading } = useAuth();
    if (isSessionLoading) return <main className="auth-loading" role="status">Restauration de la session…</main>;
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RouteFallback() {
    const { isAuthenticated, isSessionLoading } = useAuth();
    if (isSessionLoading) return <main className="auth-loading" role="status">Restauration de la session…</main>;
    return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RouteFallback />} />
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/dashboard/inventaire" element={<RequireAuth><InventoryPage /></RequireAuth>} />
            <Route path="/dashboard/analyse" element={<RequireAuth><AnalysisPage /></RequireAuth>} />
            <Route path="/dashboard/fournisseurs" element={<RequireAuth><ModelPage entity="fournisseur" /></RequireAuth>} />
            <Route path="/dashboard/commandes" element={<RequireAuth><ModelPage entity="commande" /></RequireAuth>} />
            <Route path="/dashboard/utilisateurs" element={<RequireAuth><ModelPage entity="utilisateur" /></RequireAuth>} />
            <Route path="/dashboard/paiements" element={<RequireAuth><ModelPage entity="paiement" /></RequireAuth>} />
            <Route path="/dashboard/produits" element={<RequireAuth><ModelPage entity="produit" /></RequireAuth>} />
            <Route path="/dashboard/factures" element={<RequireAuth><ModelPage entity="facture" /></RequireAuth>} />
            <Route path="*" element={<RouteFallback />} />
        </Routes>
    );
}