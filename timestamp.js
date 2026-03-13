const lastUpdated = "2026-03-13T01:45:23-06:00";

if (typeof window !== 'undefined') {
    window.lastUpdated = lastUpdated;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastUpdated };
}
