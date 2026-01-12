const lastUpdated = "2026-01-12T10:23:20-06:00";

if (typeof window !== 'undefined') {
    window.lastUpdated = lastUpdated;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastUpdated };
}
