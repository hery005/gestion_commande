const amountFormat = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
});

export function formatAriary(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? `${amountFormat.format(amount)} Ar` : "—";
}
