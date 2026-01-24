const lastUpdated = "2026-01-24T10:37:45-06:00";

if (typeof window !== 'undefined') {
    window.lastUpdated = lastUpdated;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastUpdated };
}
