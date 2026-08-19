(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  root.MEASUREMENT_PRIOR_SNAPSHOT = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    schema_version: 'tier0-prior-snapshot.v1',
    data_kind: 'copied_library_prior',
    copied_from: 'auto_mode_rules/sizeL-suggestions.json',
    copied_at: '2026-07-12',
    unit: 'in',
    poms: {
      "1": { median: 14, tol: "3/8", confidence: "medium", n: 225, source: "library" },
      "2": { median: 19, tol: "1/2", confidence: "medium", n: 225, source: "library" },
      "3": { median: 17, tol: "3/8", confidence: "medium", n: 198, source: "library" },
      "4": { median: 22, tol: "1/2", confidence: "medium", n: 197, source: "library" },
      "5": { median: 5.5, tol: "1/4", confidence: "medium", n: 217, source: "library" },
      "6": { median: 2.25, tol: "1/8", confidence: "medium", n: 163, source: "library" },
      "7": { median: 1.75, tol: "1/8", confidence: "medium", n: 173, source: "library" },
      "8": { median: 3, tol: "1/4", confidence: "low", n: 113, source: "library" },
      "9": { median: 8, tol: "1/4", confidence: "medium", n: 237, source: "library" },
      "10": { median: 8, tol: "1/4", confidence: "medium", n: 221, source: "library" },
      "11": { median: 5.5, tol: "1/4", confidence: "medium", n: 211, source: "library" },
      "12": { median: 3.75, tol: "1/8", confidence: "medium", n: 239, source: "library" },
      "13": { median: 7.25, tol: "1/4", confidence: "medium", n: 181, source: "library" },
      "14": { median: 8, tol: "1/4", confidence: "low", n: 155, source: "library" },
      "15": { median: null, tol: null, confidence: "very_low", n: 0, source: "none" },
      "16": { median: null, tol: null, confidence: "very_low", n: 0, source: "none" }
    }
  };
});
