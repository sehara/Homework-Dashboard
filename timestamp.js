const lastUpdated = "2026-01-13T08:07:52-06:00";

if (typeof window !== 'undefined') {
    window.lastUpdated = lastUpdated;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastUpdated };
}
