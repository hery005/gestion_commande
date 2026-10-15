import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import { getCommandes } from "../../api/commande.api";
import { getProduits } from "../../api/produit.api";
import "../../features/dashboard/pages/dashboard.css";
import { useAuth } from "../../features/auth/useAuth.js";

const THEME_STORAGE_KEY = "atelier:dark-mode";

function getStoredDarkMode() {
    try {
        return window.localStorage.getItem(THEME_STORAGE_KEY) === "true";
    } catch (error) {
        console.error("Impossible de lire la préférence du thème.", error);
        return false;
    }
}

export default function MainLayout({ children }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(getStoredDarkMode);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState({ products: [], orders: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const searchRequest = useRef(0);
    const navigate = useNavigate();
    const { endSession } = useAuth();

    useEffect(() => {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
        } catch (error) {
            console.error("Impossible d’enregistrer la préférence du thème.", error);
        }
    }, [darkMode]);

    useEffect(() => {
        const query = searchValue.trim();
        const requestId = ++searchRequest.current;
        if (!query) return undefined;

        const timer = window.setTimeout(async () => {
            setSearchLoading(true);
            setSearchError("");
            try {
                const [products, orders] = await Promise.all([
                    getProduits(query),
                    getCommandes(query),
                ]);
                if (searchRequest.current === requestId) {
                    setSearchResults({
                        products: Array.isArray(products) ? products.slice(0, 5) : [],
                        orders: Array.isArray(orders) ? orders.slice(0, 5) : [],
                    });
                }
            } catch {
                if (searchRequest.current === requestId) {
                    setSearchResults({ products: [], orders: [] });
                    setSearchError("La recherche est momentanément indisponible.");
                }
            } finally {
                if (searchRequest.current === requestId) setSearchLoading(false);
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchValue]);

    const handleLogout = () => {
        endSession();
        navigate("/login", { replace: true });
    };

    const handleSearchChange = (value) => {
        setSearchValue(value);
        setSearchLoading(Boolean(value.trim()));
        setSearchError("");
    };

    return (
        <div className={`dashboard-app${sidebarCollapsed ? " is-sidebar-collapsed" : ""}${darkMode ? " is-dark-mode" : ""}`}>
            <Sidebar
                open={menuOpen}
                collapsed={sidebarCollapsed}
                onClose={() => setMenuOpen(false)}
                onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
                onLogout={handleLogout}
            />
            <div className="dashboard-workspace">
                <Navbar
                    onMenuToggle={() => setMenuOpen((isOpen) => !isOpen)}
                    searchValue={searchValue}
                    onSearchChange={handleSearchChange}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    searchError={searchError}
                    darkMode={darkMode}
                    onToggleTheme={() => setDarkMode((current) => !current)}
                />
                <main className="dashboard-main">{typeof children === "function" ? children({ searchValue }) : children}</main>
            </div>
        </div>
    );
}