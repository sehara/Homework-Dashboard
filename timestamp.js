const lastUpdated = "2026-01-11T12:20:00-06:00";

if (typeof window !== 'undefined') {
    window.lastUpdated = lastUpdated;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastUpdated };
}
