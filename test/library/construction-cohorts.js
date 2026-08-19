(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  root.CONSTRUCTION_COHORT_FIXTURE = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const profile = (p1, p5, p9, p10, p12, p14) => ({
    "1": p1,
    "2": p1 + 5,
    "3": p1 + 3,
    "4": p1 + 8,
    "5": p5,
    "6": Number((p5 * .41).toFixed(3)),
    "7": Number((p5 * .32).toFixed(3)),
    "8": Number((p9 * .36).toFixed(3)),
    "9": p9,
    "10": p10,
    "11": Number((p5 * .96).toFixed(3)),
    "12": p12,
    "13": Number((p12 * 1.92).toFixed(3)),
    "14": p14,
    "15": Number((p10 * .91).toFixed(3)),
    "16": Number((p10 * .88).toFixed(3))
  });
  return {
    schema_version: 'construction-cohort-fixture.v1',
    data_kind: 'synthetic_test_data',
    minimum_peer_count: 3,
    production_approved_peer_count: 0,
    provenance: {
      construction_roster: ['LIBRARY_EVIDENCE_SOURCES.md', 'LIBRARY_WORKING_SET.md'],
      measurement_values: 'synthetic_test_data',
      isolation: 'test_only_never_promote'
    },
    cohorts: [
      {
        id: 'front_zipper',
        label: 'Front zipper',
        closure_position: 'center_front',
        styles: [
          { id: 'curvylace', name: 'CurvyLace', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14, 5.75, 8.5, 8.25, 3.5, 8.25) },
          { id: 'ziplacy', name: 'ZipLacy', construction_confidence: 'high', evidence: 'title_and_trim_standard', measurements: profile(13.75, 5.5, 8.25, 8, 3.5, 8) },
          { id: 'uplacy_20', name: 'UpLacy 2.0', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14.25, 5.75, 8.5, 8.25, 3.75, 8.5) },
          { id: 'shapecurvy2', name: 'ShapeCurvy2', construction_confidence: 'high', evidence: 'marketing_title_and_trim_reference', measurements: profile(14.5, 6, 8.75, 8.5, 3.75, 8.5) }
        ]
      },
      {
        id: 'front_closure_placket',
        label: 'Front closure placket',
        closure_position: 'center_front',
        styles: [
          { id: 'easeblooming', name: 'EaseBlooming', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14, 5.25, 8, 7.75, 3.5, 8) },
          { id: 'serena_bra', name: 'Serena Bra', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14.5, 5.5, 8.25, 8, 3.75, 8.25) },
          { id: 'emmabra_31', name: 'EmmaBra 3.1', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14.25, 5.5, 8, 8, 3.75, 8.25) }
        ]
      },
      {
        id: 'front_hook_and_eye',
        label: 'Front hook and eye',
        closure_position: 'center_front',
        styles: [
          { id: 'elisebra2', name: 'EliseBra2', construction_confidence: 'high', evidence: 'marketing_title', measurements: profile(14, 5.5, 8.25, 8, 3.5, 8) }
        ]
      },
      {
        id: 'back_hook_and_eye',
        label: 'Back hook and eye',
        closure_position: 'center_back',
        evidence_state: 'pending_direct_measurement_evidence',
        styles: [
          { id: 'sonabra', name: 'SonaBra', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3in', measurements: profile(14, 5.25, 8, 7.75, 3, 8) },
          { id: 'lumilift', name: 'LumiLift', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3in', measurements: profile(14.25, 5.5, 8.25, 8, 3, 8.25) },
          { id: 'lauralift', name: 'LauraLift', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3in', measurements: profile(14, 5.5, 8.25, 8, 3, 8) },
          { id: 'airnix', name: 'AirNix', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3_75in', measurements: profile(14.5, 5.75, 8.5, 8.25, 3.75, 8.5) },
          { id: 'arialift', name: 'AriaLift', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3_75in', measurements: profile(14.25, 5.75, 8.5, 8.25, 3.75, 8.5) },
          { id: 'trulysofty', name: 'TrulySofty', construction_confidence: 'medium', evidence: 'raw_term_hook_and_eye_width_3_75in', measurements: profile(14.5, 6, 8.75, 8.5, 3.75, 8.5) }
        ]
      },
      {
        id: 'none_pull_on',
        label: 'Pull-on / no closure',
        closure_position: 'none',
        styles: [
          { id: 'hana_bra', name: 'Hana Bra', construction_confidence: 'high', evidence: 'buttonless_title', measurements: profile(13.5, 4.75, 7.5, 7.5, 3, 7.5) },
          { id: 'aerisoft', name: 'AeriSoft', construction_confidence: 'high', evidence: 'pullover_title', measurements: profile(14, 5, 7.75, 7.75, 3.25, 7.75) },
          { id: 'ivylift', name: 'IvyLift', construction_confidence: 'medium', evidence: 'seamless_title_inference', measurements: profile(13.75, 5, 8, 7.75, 3.25, 7.75) },
          { id: 'sonashape', name: 'SonaShape', construction_confidence: 'medium', evidence: 'seamless_title_inference', measurements: profile(14.25, 5.25, 8, 8, 3.5, 8) }
        ]
      }
    ]
  };
});
