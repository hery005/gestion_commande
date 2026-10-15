import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../../components/layouts/mainLayout";
import { getFournisseurs } from "../../../api/fournisseur.api";
import { getProduits } from "../../../api/produit.api";
import { formatAriary } from "../../../utils/currency";
import "./inventory.css";

const LOW_STOCK_LIMIT = 5;
const quantityFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function InventoryContent() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierError, setSupplierError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const requestId = useRef(0);

    useEffect(() => {
        let active = true;
        getFournisseurs()
            .then((data) => { if (active && Array.isArray(data)) setSuppliers(data); })
            .catch(() => { if (active) setSupplierError("La liste des fournisseurs n’a pas pu être chargée."); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const currentRequest = ++requestId.current;
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError("");
            try {
                const data = await getProduits(search);
                if (requestId.current === currentRequest) setProducts(Array.isArray(data) ? data : []);
            } catch {
                if (requestId.current === currentRequest) setError("Impossible de charger l’inventaire. Vérifiez la connexion au serveur puis réessayez.");
            } finally {
                if (requestId.current === currentRequest) setLoading(false);
            }
        }, search ? 300 : 0);

        return () => window.clearTimeout(timer);
    }, [search]);

    const supplierNames = useMemo(
        () => new Map(suppliers.map((supplier) => [String(supplier.id_fournisseur), supplier.raisonSociale || `${supplier.prenomFournisseur} ${supplier.nomFournisseur}`])),
        [suppliers],
    );
    const filteredProducts = useMemo(() => products.filter((product) => {
        const stock = Number(product.quantiteStock);
        if (filter === "low") return stock <= LOW_STOCK_LIMIT;
        if (filter === "available") return stock > LOW_STOCK_LIMIT;
        return true;
    }), [filter, products]);

    const units = products.reduce((sum, product) => sum + (Number(product.quantiteStock) || 0), 0);
    const value = products.reduce((sum, product) => sum + (Number(product.quantiteStock) || 0) * (Number(product.prixUnitaire) || 0), 0);
    const lowStockCount = products.filter((product) => Number(product.quantiteStock) <= LOW_STOCK_LIMIT).length;
    const handleSearchChange = (value) => {
        setSearch(value);
        setLoading(true);
    };

    return (
        <div className="inventory-page">
            <header className="inventory-heading">
                <div>
                    <p className="inventory-eyebrow">GESTION DES STOCKS</p>
                    <h1>Inventaire</h1>
                    <p>Visualisez vos quantités et repérez les produits à réapprovisionner.</p>
                </div>
                <Link className="inventory-action" to="/dashboard/produits">Gérer les produits <span aria-hidden="true">↗</span></Link>
            </header>

            <section className="inventory-metrics" aria-label="Résumé de l’inventaire">
                <article><span>Références produits</span><strong>{products.length}</strong><small>références enregistrées</small></article>
                <article><span>Unités en stock</span><strong>{quantityFormat.format(units)}</strong><small>quantité disponible</small></article>
                <article><span>Valeur du stock</span><strong>{formatAriary(value)}</strong><small>au prix unitaire actuel</small></article>
                <article className={lowStockCount ? "inventory-metric-alert" : ""}><span>Stocks à surveiller</span><strong>{lowStockCount}</strong><small>seuil : {LOW_STOCK_LIMIT} unités ou moins</small></article>
            </section>

            <section className="inventory-panel">
                <div className="inventory-panel-heading">
                    <div><span className="inventory-eyebrow">CATALOGUE CONNECTÉ</span><h2>État des stocks</h2></div>
                    <label className="inventory-search">
                        <span aria-hidden="true">⌕</span>
                        <input type="search" value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Rechercher un produit…" aria-label="Rechercher dans l’inventaire" />
                    </label>
                </div>
                <div className="inventory-filters" role="group" aria-label="Filtrer les produits">
                    {[["all", "Tous les produits"], ["low", "Stock à surveiller"], ["available", "Stock disponible"]].map(([value, label]) => (
                        <button key={value} type="button" className={filter === value ? "is-selected" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
                    ))}
                </div>
                {error ? <p className="inventory-feedback inventory-error" role="alert">{error}</p> : null}
                {supplierError && <p className="inventory-feedback inventory-error" role="status">{supplierError}</p>}
                {loading ? <p className="inventory-feedback" role="status">Chargement des produits…</p> : null}
                {!loading && !error && (
                    <div className="inventory-table-wrap">
                        <table className="inventory-table">
                            <thead><tr><th>Produit</th><th>Fournisseur</th><th>Prix unitaire</th><th>Quantité</th><th>Valeur du stock</th><th>État</th></tr></thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const stock = Number(product.quantiteStock) || 0;
                                    const isLow = stock <= LOW_STOCK_LIMIT;
                                    return (
                                        <tr key={product.id_produit}>
                                            <td><strong>{product.nomProduit}</strong><small>{product.codeProduit}</small></td>
                                            <td>{supplierNames.get(String(product.fk_id_fournisseur)) || "—"}</td>
                                            <td>{formatAriary(product.prixUnitaire)}</td>
                                            <td className="inventory-quantity">{quantityFormat.format(stock)}</td>
                                            <td>{formatAriary(stock * (Number(product.prixUnitaire) || 0))}</td>
                                            <td><span className={`inventory-status${isLow ? " is-low" : ""}`}>{stock === 0 ? "Rupture" : isLow ? "À réapprovisionner" : "Disponible"}</span></td>
                                        </tr>
                                    );
                                })}
                                {!filteredProducts.length && <tr><td className="inventory-empty" colSpan="6">{search ? "Aucun produit ne correspond à cette recherche." : "Aucun produit dans cette sélection."}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function InventoryPage() {
    return <MainLayout><InventoryContent /></MainLayout>;
}
