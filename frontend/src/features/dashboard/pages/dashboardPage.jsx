import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../../components/layouts/mainLayout";
import { getCommandes } from "../../../api/commande.api";
import { getFactures } from "../../../api/facture.api";
import { getFournisseurs } from "../../../api/fournisseur.api";
import { getProduits } from "../../../api/produit.api";
import { DATA_MUTATED_EVENT } from "../../../api/axios";
import { getAuthenticatedUser } from "../../../features/auth/authSession";
import { formatAriary } from "../../../utils/currency";

const LOW_STOCK_LIMIT = 5;
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function Icon({ name, size = 19 }) {
    const paths = {
        arrow: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
        orders: <><path d="M5 7h14l1 13H4L5 7Z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></>,
        delivered: <><path d="M4 12.5 9.5 18 20 6" /><circle cx="12" cy="12" r="9" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        money: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5c-.7-.7-1.6-1-3-1-1.5 0-2.5.8-2.5 1.9 0 2.8 5 1.2 5 4.1 0 1.2-1.1 2-2.7 2-1.3 0-2.3-.4-3-1.2M12 6v12" /></>,
        search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    };
    return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function getPeriod(range, offset, now) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "Semaine") {
        const mondayOffset = (date.getDay() + 6) % 7;
        const start = new Date(date);
        start.setDate(date.getDate() - mondayOffset + offset * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return { start, end };
    }
    if (range === "Mois") {
        const start = new Date(date.getFullYear(), date.getMonth() + offset, 1);
        return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
    }
    const start = new Date(date.getFullYear() + offset, 0, 1);
    return { start, end: new Date(start.getFullYear() + 1, 0, 1) };
}

function buildRevenueChart(invoices, range) {
    const now = new Date();
    const currentPeriod = getPeriod(range, 0, now);
    const previousPeriod = getPeriod(range, -1, now);
    const bucketCount = range === "Semaine" ? 7 : range === "Mois" ? 5 : 12;
    const currentValues = Array(bucketCount).fill(0);
    const previousValues = Array(bucketCount).fill(0);
    const labels = Array.from({ length: bucketCount }, (_, index) => {
        if (range === "Semaine") {
            const date = new Date(currentPeriod.start);
            date.setDate(date.getDate() + index);
            return weekdayFormatter.format(date);
        }
        if (range === "Mois") {
            const date = new Date(currentPeriod.start);
            date.setDate(1 + Math.floor(index * new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() / bucketCount));
            return dateFormatter.format(date);
        }
        return monthFormatter.format(new Date(currentPeriod.start.getFullYear(), index, 1));
    });
    const totals = { current: 0, previous: 0 };

    invoices.forEach((invoice) => {
        const date = new Date(invoice.date_facture || invoice.date_creation);
        if (Number.isNaN(date.getTime())) return;
        const amount = Number(invoice.montant_total) || 0;
        let target;
        let period;
        if (date >= currentPeriod.start && date < currentPeriod.end) {
            target = currentValues;
            period = "current";
        } else if (date >= previousPeriod.start && date < previousPeriod.end) {
            target = previousValues;
            period = "previous";
        } else {
            return;
        }
        let bucket;
        if (range === "Semaine") {
            bucket = Math.floor((date - currentPeriod.start) / 86400000);
            if (period === "previous") bucket = Math.floor((date - previousPeriod.start) / 86400000);
        } else if (range === "Mois") {
            const periodStart = period === "current" ? currentPeriod.start : previousPeriod.start;
            const days = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
            bucket = Math.min(bucketCount - 1, Math.floor((date.getDate() - 1) * bucketCount / days));
        } else {
            bucket = date.getMonth();
        }
        if (bucket >= 0 && bucket < bucketCount) target[bucket] += amount;
        totals[period] += amount;
    });

    const difference = totals.previous
        ? `${totals.current >= totals.previous ? "+" : ""}${((totals.current - totals.previous) * 100 / totals.previous).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`
        : totals.current ? "Nouveau" : "0 %";
    return { labels, currentValues, previousValues, totals, difference };
}

function pointsFor(values, maxValue) {
    return values.map((value, index) => {
        const x = values.length === 1 ? 350 : (index / (values.length - 1)) * 700;
        const y = 220 - (value / maxValue) * 220;
        return `${x},${y}`;
    }).join(" ");
}

function Chart({ range, chart }) {
    const maxValue = Math.max(...chart.currentValues, ...chart.previousValues, 1);
    const current = pointsFor(chart.currentValues, maxValue);
    const previous = pointsFor(chart.previousValues, maxValue);
    const yLabels = [maxValue, maxValue * .75, maxValue * .5, maxValue * .25, 0];
    return (
        <div className="chart-wrap">
            <div className="chart-legend"><span><i className="legend-current" />Cette période</span><span><i className="legend-previous" />Période précédente</span></div>
            <div className="chart-plot">
                <div className="chart-y-labels" aria-hidden="true">{yLabels.map((value, index) => <span key={index}>{formatAriary(value)}</span>)}</div>
                <svg className="chart-svg" viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label={`Chiffre d’affaires facturé par période sur la ${range.toLowerCase()}`}>
                    <defs><linearGradient id="chart-area-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f0d0b7" stopOpacity=".5" /><stop offset="100%" stopColor="#f0d0b7" stopOpacity="0" /></linearGradient></defs>
                    {[0, 55, 110, 165, 220].map((y) => <line className="chart-gridline" key={y} x1="0" x2="700" y1={y} y2={y} />)}
                    <polygon className="chart-area" points={`0,220 ${current} 700,220`} />
                    <polyline className="chart-line chart-line-previous" points={previous} />
                    <polyline className="chart-line chart-line-current" points={current} />
                    {chart.currentValues.map((value, index) => {
                        const x = chart.currentValues.length === 1 ? 350 : (index / (chart.currentValues.length - 1)) * 700;
                        const y = 220 - (value / maxValue) * 220;
                        return <circle className="chart-point" key={`${range}-${index}`} cx={x} cy={y} r="4"><title>{chart.labels[index]} · {formatAriary(value)}</title></circle>;
                    })}
                </svg>
            </div>
            <div className="chart-x-labels" style={{ "--label-count": chart.labels.length }}>{chart.labels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>
    );
}

function MetricCard({ label, value, detail, icon, featured = false }) {
    return (
        <article className={`metric-card${featured ? " metric-featured" : ""}`}>
            <div className="metric-topline"><span className="metric-label">{label}</span><span className="metric-icon"><Icon name={icon} /></span></div>
            <strong className="metric-value">{value}</strong>
            <div className="metric-foot"><span>{detail}</span></div>
        </article>
    );
}

function DashboardContent({ searchValue }) {
    const [range, setRange] = useState("Mois");
    const [data, setData] = useState({ orders: [], invoices: [], products: [], suppliers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const user = getAuthenticatedUser();
    const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const query = searchValue.trim().toLocaleLowerCase("fr");

    const loadDashboard = useCallback(async () => {
        const [orders, invoices, products, suppliers] = await Promise.all([
            getCommandes(),
            getFactures(),
            getProduits(),
            getFournisseurs(),
        ]);
        return {
            orders: Array.isArray(orders) ? orders : [],
            invoices: Array.isArray(invoices) ? invoices : [],
            products: Array.isArray(products) ? products : [],
            suppliers: Array.isArray(suppliers) ? suppliers : [],
        };
    }, []);

    useEffect(() => {
        let active = true;
        loadDashboard()
            .then((result) => {
                if (!active) return;
                setData(result);
                setError("");
            })
            .catch(() => { if (active) setError("Impossible de charger les indicateurs du tableau de bord depuis le serveur."); })
            .finally(() => { if (active) setLoading(false); });
        const refreshOnMutation = () => {
            loadDashboard()
                .then((result) => {
                    if (!active) return;
                    setData(result);
                    setError("");
                })
                .catch(() => {
                    if (active) setError("Les données viennent d’être modifiées, mais le tableau de bord n’a pas pu être actualisé.");
                });
        };
        window.addEventListener(DATA_MUTATED_EVENT, refreshOnMutation);
        return () => {
            active = false;
            window.removeEventListener(DATA_MUTATED_EVENT, refreshOnMutation);
        };
    }, [loadDashboard]);

    const visibleOrders = useMemo(() => data.orders
        .filter((order) => {
            const supplier = data.suppliers.find((item) => String(item.id_fournisseur) === String(order.fk_id_fournisseur));
            const supplierName = supplier?.raisonSociale || `${supplier?.prenomFournisseur || ""} ${supplier?.nomFournisseur || ""}`;
            return `${order.reference} ${supplierName} ${order.status}`.toLocaleLowerCase("fr").includes(query);
        })
        .slice(0, 6), [data.orders, data.suppliers, query]);
    const lowStockProducts = useMemo(() => data.products
        .filter((product) => Number(product.quantiteStock) <= LOW_STOCK_LIMIT)
        .sort((first, second) => Number(first.quantiteStock) - Number(second.quantiteStock)), [data.products]);
    const visibleProducts = lowStockProducts.filter((product) =>
        `${product.nomProduit} ${product.codeProduit}`.toLocaleLowerCase("fr").includes(query));
    const chart = useMemo(() => buildRevenueChart(data.invoices, range), [data.invoices, range]);
    const deliveredOrders = data.orders.filter((order) => order.status === "livree").length;
    const pendingOrders = data.orders.filter((order) => ["en_attente", "envoye", "confirme"].includes(order.status)).length;
    const chartHeading = range === "Semaine" ? "cette semaine" : range === "Mois" ? "ce mois-ci" : "cette année";
    const previousHeading = range === "Semaine" ? "la semaine précédente" : range === "Mois" ? "le mois précédent" : "l’année précédente";

    return (
        <div className="dashboard-content">
            <section className="dashboard-welcome" id="overview">
                <div>
                    <p className="dashboard-eyebrow">{today.toLocaleUpperCase("fr")} <span /></p>
                    <h1>Bonjour {user?.name || ""} <span className="welcome-star">✳</span></h1>
                    <p className="welcome-subtitle">Voici les données réelles de votre activité.</p>
                </div>
                <Link className="dashboard-primary-link" to="/dashboard/commandes"><Icon name="orders" size={17} /><span>Nouvelle commande</span><Icon name="arrow" size={15} /></Link>
            </section>

            {error && <div className="dashboard-data-message" role="alert">{error}<button type="button" onClick={() => {
                setLoading(true);
                loadDashboard()
                    .then((result) => { setData(result); setError(""); })
                    .catch(() => setError("Impossible de charger les données du serveur."))
                    .finally(() => setLoading(false));
            }}>Réessayer</button></div>}

            <section className="metrics-grid" aria-label="Indicateurs clés">
                <MetricCard label="Chiffre d'affaires facturé" value={loading || error ? "…" : formatAriary(chart.totals.current)} detail={chartHeading} icon="money" featured />
                <MetricCard label="Commandes" value={loading || error ? "…" : data.orders.length} detail="Toutes périodes" icon="orders" />
                <MetricCard label="Livrées" value={loading || error ? "…" : deliveredOrders} detail="Commandes au statut livrée" icon="delivered" />
                <MetricCard label="À traiter" value={loading || error ? "…" : pendingOrders} detail="En attente, envoyées ou confirmées" icon="clock" />
            </section>

            <section className="dashboard-card analytics-card" id="analytics">
                <div className="card-heading chart-heading">
                    <div>
                        <p className="card-kicker">PERFORMANCE · FACTURES ENREGISTRÉES</p>
                        <div className="chart-title-row"><h2>Chiffre d'affaires facturé</h2><span className="chart-total">{loading || error ? "…" : formatAriary(chart.totals.current)}</span></div>
                        <p className="card-description"><span className="positive-change">{loading || error ? "" : chart.difference}</span>{!loading && !error && ` par rapport à ${previousHeading}`}</p>
                    </div>
                    <div className="range-picker" aria-label="Période du graphique">
                        {["Semaine", "Mois", "Année"].map((option) => <button aria-pressed={range === option} className={range === option ? "is-selected" : ""} key={option} onClick={() => setRange(option)} type="button">{option}</button>)}
                    </div>
                </div>
                {loading || error ? <p className="dashboard-data-message">{error ? "Graphique indisponible tant que les données ne sont pas chargées." : "Chargement des factures…"}</p> : <Chart range={range} chart={chart} />}
            </section>

            <div className="dashboard-lists">
                <section className="dashboard-card list-card" id="orders">
                    <div className="card-heading list-heading">
                        <div><p className="card-kicker">SUIVI DE VOTRE ACTIVITÉ</p><h2>Commandes récentes <span className="heading-count">{data.orders.length}</span></h2></div>
                        <Link className="text-link" to="/dashboard/commandes">Tout voir <Icon name="arrow" size={14} /></Link>
                    </div>
                    <div className="order-list" role="list">
                        {loading || error ? <p className="dashboard-data-message">{error ? "Commandes indisponibles." : "Chargement des commandes…"}</p> : visibleOrders.length ? visibleOrders.map((order, index) => {
                            const supplier = data.suppliers.find((item) => String(item.id_fournisseur) === String(order.fk_id_fournisseur));
                            const supplierName = supplier?.raisonSociale || `${supplier?.prenomFournisseur || ""} ${supplier?.nomFournisseur || ""}`.trim() || "Fournisseur";
                            const statusLabels = { en_attente: "En attente", envoye: "Envoyée", confirme: "Confirmée", livree: "Livrée", annulee: "Annulée" };
                            const statusLabel = statusLabels[order.status] || order.status || "Non renseigné";
                            const statusClass = order.status === "livree" ? "delivered" : ["en_attente", "annulee"].includes(order.status) ? "pending" : "progress";
                            return (
                                <article className="order-row" key={order.id_commande} role="listitem">
                                    <span className={`supplier-avatar avatar-${["sand", "blue", "sage", "rose"][index % 4]}`}>{supplierName.charAt(0).toLocaleUpperCase("fr")}</span>
                                    <div className="order-main"><strong>{supplierName}</strong><span>{order.reference}</span></div>
                                    <span className="order-date">{order.dateCommande ? dateFormatter.format(new Date(order.dateCommande)) : "—"}</span>
                                    <strong className="order-total">{formatAriary(order.total)}</strong>
                                    <span className={`order-status status-${statusClass}`}><i />{statusLabel}</span>
                                </article>
                            );
                        }) : <p className="empty-search"><Icon name="search" size={18} />{query ? "Aucune commande ne correspond à votre recherche." : "Aucune commande enregistrée."}</p>}
                    </div>
                    <Link className="list-mobile-link" to="/dashboard/commandes">Afficher toutes les commandes <Icon name="arrow" size={14} /></Link>
                </section>

                <section className="dashboard-card list-card inventory-card" id="inventory">
                    <div className="card-heading list-heading">
                        <div><p className="card-kicker">À GARDER À L'ŒIL</p><h2>Stock à surveiller <span className="stock-alert-count">{lowStockProducts.length}</span></h2></div>
                        <Link className="text-link" to="/dashboard/inventaire">Inventaire <Icon name="arrow" size={14} /></Link>
                    </div>
                    <div className="product-list" role="list">
                        {loading || error ? <p className="dashboard-data-message">{error ? "Stocks indisponibles." : "Chargement des stocks…"}</p> : visibleProducts.length ? visibleProducts.slice(0, 5).map((product, index) => (
                            <article className="product-row" key={product.id_produit} role="listitem">
                                <span className={`product-art product-${["peach", "lavender", "mint"][index % 3]}`} aria-hidden="true"><span /></span>
                                <div className="product-main"><strong>{product.nomProduit}</strong><span>{product.codeProduit}</span></div>
                                <span className={`stock-quantity${Number(product.quantiteStock) <= LOW_STOCK_LIMIT ? " is-low" : ""}`}><strong>{product.quantiteStock}</strong><small>pièces</small></span>
                            </article>
                        )) : <p className="empty-search"><Icon name="search" size={18} />{query ? "Aucun stock ne correspond à votre recherche." : "Aucun stock bas. Tout est à jour."}</p>}
                    </div>
                    <div className="stock-note"><span /> Les niveaux de stock proviennent du catalogue</div>
                </section>
            </div>
            <footer className="dashboard-footer"><span>ATELIER <i>·</i> GESTION DE COMMANDE</span><span>Un espace clair, des idées bien rangées. <b>✳</b></span></footer>
        </div>
    );
}

export default function DashboardPage() {
    return <MainLayout>{({ searchValue }) => <DashboardContent searchValue={searchValue} />}</MainLayout>;
}
