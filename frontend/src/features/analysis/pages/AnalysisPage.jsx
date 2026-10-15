import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../../../components/layouts/mainLayout";
import { getCommandes } from "../../../api/commande.api";
import { getFournisseurs } from "../../../api/fournisseur.api";
import { getProduits, getReliableSuppliers } from "../../../api/produit.api";
import { formatAriary } from "../../../utils/currency";
import "../../inventory/pages/inventory.css";
import "./analysis.css";

const LOW_STOCK_LIMIT = 5;
const quantityFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function AnalysisContent() {
    const [data, setData] = useState({ products: [], orders: [], suppliers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [recommendations, setRecommendations] = useState([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationsError, setRecommendationsError] = useState("");
    const recommendationRequest = useRef(0);

    const fetchAnalysis = useCallback(async () => {
        const [products, orders, suppliers] = await Promise.all([
            getProduits(),
            getCommandes(),
            getFournisseurs(),
        ]);
        return {
            products: Array.isArray(products) ? products : [],
            orders: Array.isArray(orders) ? orders : [],
            suppliers: Array.isArray(suppliers) ? suppliers : [],
        };
    }, []);

    useEffect(() => {
        let active = true;
        fetchAnalysis()
            .then((result) => {
                if (!active) return;
                setData(result);
                setError("");
            })
            .catch(() => {
                if (active) setError("Impossible de charger l’analyse depuis le serveur. Vérifiez la connexion puis réessayez.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [fetchAnalysis]);

    const refreshAnalysis = () => {
        setLoading(true);
        setError("");
        fetchAnalysis()
            .then(setData)
            .catch(() => setError("Impossible de charger l’analyse depuis le serveur. Vérifiez la connexion puis réessayez."))
            .finally(() => setLoading(false));
    };
    const { products, orders, suppliers } = data;

    const selectProduct = async (productId) => {
        const requestId = ++recommendationRequest.current;
        setSelectedProductId(productId);
        setRecommendations([]);
        setRecommendationsError("");
        if (!productId) {
            setRecommendationsLoading(false);
            return;
        }
        setRecommendationsLoading(true);
        try {
            const result = await getReliableSuppliers(productId);
            if (recommendationRequest.current === requestId) setRecommendations(Array.isArray(result) ? result : []);
        } catch {
            if (recommendationRequest.current === requestId) setRecommendationsError("Impossible de calculer les recommandations pour ce produit.");
        } finally {
            if (recommendationRequest.current === requestId) setRecommendationsLoading(false);
        }
    };

    const metrics = useMemo(() => {
        const units = products.reduce((sum, product) => sum + (Number(product.quantiteStock) || 0), 0);
        const stockValue = products.reduce((sum, product) => sum + (Number(product.quantiteStock) || 0) * (Number(product.prixUnitaire) || 0), 0);
        const lowStock = products.filter((product) => Number(product.quantiteStock) <= LOW_STOCK_LIMIT).length;
        const pendingOrders = orders.filter((order) => ["en_attente", "envoye"].includes(String(order.status).toLowerCase())).length;
        return { units, stockValue, lowStock, pendingOrders };
    }, [orders, products]);

    const supplierStock = useMemo(() => {
        const values = new Map(suppliers.map((supplier) => [String(supplier.id_fournisseur), {
            id: supplier.id_fournisseur,
            name: supplier.raisonSociale || `${supplier.prenomFournisseur} ${supplier.nomFournisseur}`,
            references: 0,
            units: 0,
            value: 0,
        }]));
        products.forEach((product) => {
            const supplier = values.get(String(product.fk_id_fournisseur));
            if (supplier) {
                const quantity = Number(product.quantiteStock) || 0;
                supplier.references += 1;
                supplier.units += quantity;
                supplier.value += quantity * (Number(product.prixUnitaire) || 0);
            }
        });
        return [...values.values()].filter((supplier) => supplier.references).sort((first, second) => second.value - first.value);
    }, [products, suppliers]);

    const maxSupplierValue = Math.max(...supplierStock.map((supplier) => supplier.value), 0);
    const orderStatuses = useMemo(() => {
        const counts = new Map();
        orders.forEach((order) => {
            const status = order.status || "Non renseigné";
            counts.set(status, (counts.get(status) || 0) + 1);
        });
        return [...counts.entries()].sort((first, second) => second[1] - first[1]);
    }, [orders]);

    return (
        <div className="analysis-page">
            <header className="analysis-heading">
                <div>
                    <p className="inventory-eyebrow">PILOTAGE DE L’ACTIVITÉ</p>
                    <h1>Analyse</h1>
                    <p>Indicateurs calculés à partir des produits, commandes et fournisseurs enregistrés.</p>
                </div>
                <button className="inventory-action" type="button" onClick={refreshAnalysis} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"} <span aria-hidden="true">↻</span></button>
            </header>

            {error && <div className="inventory-panel inventory-error" role="alert"><p>{error}</p><button className="analysis-retry" type="button" onClick={refreshAnalysis} disabled={loading}>Réessayer</button></div>}
            {loading && <p className="inventory-feedback" role="status">Calcul des indicateurs à partir des données du serveur…</p>}
            {!loading && !error && (
                <>
                    <section className="inventory-metrics" aria-label="Indicateurs d’activité">
                        <article><span>Références produits</span><strong>{products.length}</strong><small>catalogue actuel</small></article>
                        <article><span>Valeur du stock</span><strong>{formatAriary(metrics.stockValue)}</strong><small>quantité × prix unitaire</small></article>
                        <article><span>Unités en stock</span><strong>{quantityFormat.format(metrics.units)}</strong><small>toutes références confondues</small></article>
                        <article className={metrics.lowStock ? "inventory-metric-alert" : ""}><span>Stocks à surveiller</span><strong>{metrics.lowStock}</strong><small>{metrics.pendingOrders} commande(s) en attente</small></article>
                    </section>

                    <div className="analysis-grid">
                        <section className="analysis-panel">
                            <span className="inventory-eyebrow">RÉPARTITION DES STOCKS</span>
                            <h2>Valeur par fournisseur</h2>
                            {supplierStock.length ? (
                                <div className="analysis-supplier-list">
                                    {supplierStock.map((supplier) => (
                                        <article className="analysis-supplier" key={supplier.id}>
                                            <div className="analysis-supplier-heading"><strong>{supplier.name}</strong><span>{formatAriary(supplier.value)}</span></div>
                                            <div className="analysis-bar" aria-label={`${supplier.name}: ${formatAriary(supplier.value)}`}><span style={{ width: `${maxSupplierValue ? (supplier.value / maxSupplierValue) * 100 : 0}%` }} /></div>
                                            <small>{supplier.references} référence(s) · {quantityFormat.format(supplier.units)} unité(s)</small>
                                        </article>
                                    ))}
                                </div>
                            ) : <p className="inventory-feedback">Aucun produit associé à un fournisseur.</p>}
                        </section>

                        <section className="analysis-panel">
                            <span className="inventory-eyebrow">SUIVI COMMERCIAL</span>
                            <h2>Commandes par statut</h2>
                            {orderStatuses.length ? (
                                <div className="analysis-status-list">
                                    {orderStatuses.map(([status, count]) => (
                                        <div className="analysis-status-row" key={status}><span>{status.replaceAll("_", " ")}</span><strong>{count}</strong></div>
                                    ))}
                                </div>
                            ) : <p className="inventory-feedback">Aucune commande enregistrée.</p>}
                            <p className="analysis-summary">{orders.length} commande(s) au total · {suppliers.length} fournisseur(s) enregistré(s)</p>
                        </section>

                        <section className="analysis-panel analysis-recommendations">
                            <span className="inventory-eyebrow">AIDE À L’APPROVISIONNEMENT</span>
                            <h2>Fournisseurs fiables recommandés</h2>
                            <label className="analysis-product-select">
                                <span>Produit à évaluer</span>
                                <select value={selectedProductId} onChange={(event) => { void selectProduct(event.target.value); }}>
                                    <option value="">Choisir un produit</option>
                                    {products.map((product) => <option key={product.id_produit} value={product.id_produit}>{product.nomProduit}</option>)}
                                </select>
                            </label>
                            <p className="analysis-summary">Classement par taux réel de commandes livrées pour ce produit ; à égalité, le nombre de livraisons départage les fournisseurs.</p>
                            {recommendationsLoading && <p className="inventory-feedback">Analyse de l’historique…</p>}
                            {recommendationsError && <p className="inventory-feedback inventory-error">{recommendationsError}</p>}
                            {!recommendationsLoading && !recommendationsError && selectedProductId && recommendations.length > 0 && (
                                <div className="analysis-status-list">
                                    {recommendations.map((supplier, index) => (
                                        <article className="analysis-recommendation" key={supplier.id_fournisseur}>
                                            <div><strong>{index + 1}. {supplier.nom}</strong><span>{supplier.taux_livraison}% livrées</span></div>
                                            <small>{supplier.commandes_livrees} commande(s) livrée(s) sur {supplier.commandes} pour ce produit</small>
                                        </article>
                                    ))}
                                </div>
                            )}
                            {!recommendationsLoading && !recommendationsError && selectedProductId && !recommendations.length && <p className="inventory-feedback">Aucune commande historique pour ce produit : la fiabilité ne peut pas encore être évaluée.</p>}
                            {!selectedProductId && <p className="inventory-feedback">Sélectionnez un produit pour consulter les fournisseurs évalués sur son historique.</p>}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AnalysisPage() {
    return <MainLayout><AnalysisContent /></MainLayout>;
}
