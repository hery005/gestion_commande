import {useState} from "react";
import {useNavigate, Link} from "react-router-dom";
import { login } from "../../../api/auth.api";
import { useAuth } from "../useAuth.js";
import LoginForm from "../components/LoginForm";
import "../styles/auth.css";

export default function LoginPage() {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { establishSession } = useAuth();

    const handleLogin = async (credentials) => {
        setLoading(true);
        setError(null);
        try {
            const data = await login(credentials);
            if (typeof data?.access !== "string" || typeof data?.refresh !== "string") {
                throw new Error("Le serveur a renvoyé une réponse de connexion invalide.");
            }
            establishSession(data);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            if (!err.response) {
                setError("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
            } else if (err.response.status === 401) {
                setError("Adresse e-mail ou mot de passe incorrect.");
            } else if (err.response.status === 400) {
                setError("Veuillez vérifier votre adresse e-mail et votre mot de passe.");
            } else {
                setError("La connexion a échoué. Veuillez réessayer dans quelques instants.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-card" aria-labelledby="login-title">
                <div className="login-heading">
                    <p className="login-eyebrow">GESTION DE COMMANDE</p>
                    <h1 id="login-title">Connectez-vous<br />à votre compte</h1>
                    <p className="login-intro">Accédez à votre espace en toute simplicité.</p>
                </div>
            <LoginForm onSubmit={handleLogin} error={error} loading={loading} />
                <p className="login-signup">
                    Vous n'avez pas de compte ? <Link to="/register">Créer un compte</Link>
                </p>
            </section>
        </main>
    );
}