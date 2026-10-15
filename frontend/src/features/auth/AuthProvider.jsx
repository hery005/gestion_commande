import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/axios";
import { AuthContext } from "./AuthContext";
import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    isAccessTokenValid,
    SESSION_CHANGED_EVENT,
    storeTokens,
} from "./authSession";

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const onSessionChanged = (event) => {
            if (active) setIsAuthenticated(Boolean(event.detail?.authenticated));
        };
        const onStorageChanged = (event) => {
            if (event.key === "access" || event.key === "refresh") {
                if (active) setIsAuthenticated(isAccessTokenValid());
            }
        };

        window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
        window.addEventListener("storage", onStorageChanged);

        const restoreSession = async () => {
            const access = getAccessToken();
            if (isAccessTokenValid(access)) {
                if (active) setIsAuthenticated(true);
                if (active) setIsSessionLoading(false);
                return;
            }

            const refresh = getRefreshToken();
            if (!refresh) {
                clearTokens();
                if (active) setIsSessionLoading(false);
                return;
            }

            try {
                const response = await api.post("/token/refresh/", { refresh }, { skipAuthRefresh: true });
                if (typeof response.data?.access !== "string") {
                    throw new Error("Le serveur a renvoyé un jeton d’accès invalide.");
                }
                storeTokens({ access: response.data.access, refresh: response.data.refresh });
                if (active) setIsAuthenticated(true);
            } catch {
                clearTokens();
                if (active) setIsAuthenticated(false);
            } finally {
                if (active) setIsSessionLoading(false);
            }
        };

        void restoreSession();
        return () => {
            active = false;
            window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
            window.removeEventListener("storage", onStorageChanged);
        };
    }, []);

    const establishSession = useCallback((tokens) => {
        storeTokens(tokens);
        setIsAuthenticated(true);
    }, []);

    const endSession = useCallback(() => {
        clearTokens();
        setIsAuthenticated(false);
    }, []);

    const value = useMemo(() => ({
        isAuthenticated,
        isSessionLoading,
        establishSession,
        endSession,
    }), [endSession, establishSession, isAuthenticated, isSessionLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
