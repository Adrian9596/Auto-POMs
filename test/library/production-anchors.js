// GENERATED — do not edit by hand.
// Real production-detector anchors for the offline lab bridge (US-039 Stage 1).
// Regenerate: npm run demo -- --only=<demo> --dump-anchors=test/fixtures/production-anchors
//   then: node test/tools/build-anchor-bundle.mjs
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.PRODUCTION_ANCHOR_FIXTURES = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
  "EvelynBliss vA 1.0.jpg": {
    "image": "EvelynBliss vA 1.0.jpg",
    "source": "production_detected",
    "ruleNote": "Real anchors from the production detector (npm run demo -- --dump-anchors). Normalized [0,1] in source-image pixel space.",
    "cupModel": {
      "side": -1,
      "viewRole": "front_inner",
      "visibility": "direct",
      "topFromApex": true,
      "bottomFromSeam": false,
      "contourConfidence": 0.9822222222222222,
      "seamConfidence": 0.8415254237288136
    },
    "anchors": {
      "171": {
        "x": 0.816387,
        "y": 0.49232,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "cfTop",
        "reviewRequired": false
      },
      "172": {
        "x": 0.90476,
        "y": 0.320008,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "181": {
        "x": 0.941328,
        "y": 0.564734,
        "viewRole": "front_inner",
        "confidence": "low",
        "source": "silhouette",
        "reviewRequired": true
      },
      "182": {
        "x": 0.909839,
        "y": 0.320008,
        "viewRole": "front_inner",
        "confidence": "low",
        "source": "strapJoin",
        "reviewRequired": true
      },
      "cf-top": {
        "x": 0.168945,
        "y": 0.514107,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "cf-bottom": {
        "x": 0.168945,
        "y": 0.780564,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "silhouette",
        "reviewRequired": false
      },
      "band-left": {
        "x": 0.057617,
        "y": 0.742947,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "band-right": {
        "x": 0.279297,
        "y": 0.742947,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-left": {
        "x": 0.048828,
        "y": 0.583072,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-right": {
        "x": 0.289063,
        "y": 0.583072,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": false
      },
      "inner-cup-top": {
        "x": 0.809886,
        "y": 0.515361,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "innerCupTopInkFallback",
        "reviewRequired": true
      },
      "inner-cup-bottom": {
        "x": 0.809886,
        "y": 0.564734,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "innerCupTopInkFallback",
        "reviewRequired": true
      },
      "inner-cup-left": {
        "x": 0.723032,
        "y": 0.613119,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "innerCupTopInkFallback",
        "reviewRequired": true
      },
      "inner-cup-right": {
        "x": 0.811186,
        "y": 0.613119,
        "viewRole": "front_inner",
        "confidence": "medium",
        "source": "innerCupTopInkFallback",
        "reviewRequired": true
      },
      "side-top": {
        "x": 0.373047,
        "y": 0.570533,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "side-bottom": {
        "x": 0.388001,
        "y": 0.827586,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "apex-left": {
        "x": 0.082031,
        "y": 0.260188,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "apex-right": {
        "x": 0.253906,
        "y": 0.263323,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "strap-top": {
        "x": 0.259766,
        "y": 0.23511,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "frontStrapSeam",
        "reviewRequired": true
      },
      "strap-bottom": {
        "x": 0.411064,
        "y": 0.297806,
        "viewRole": "back",
        "confidence": "low",
        "source": "backPanelJoin",
        "reviewRequired": true
      },
      "back-top": {
        "x": 0.491211,
        "y": 0.526646,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-bottom": {
        "x": 0.491211,
        "y": 0.827586,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-top": {
        "x": 0.411064,
        "y": 0.297806,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-bottom": {
        "x": 0.411064,
        "y": 0.827586,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-left": {
        "x": 0.422852,
        "y": 0.297806,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-right": {
        "x": 0.5625,
        "y": 0.297806,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": false
      }
    }
  },
  "demo1.jpg": {
    "image": "demo1.jpg",
    "source": "production_detected",
    "ruleNote": "Real anchors from the production detector (npm run demo -- --dump-anchors). Normalized [0,1] in source-image pixel space.",
    "cupModel": {
      "side": -1,
      "viewRole": "front_outer",
      "visibility": "direct",
      "topFromApex": true,
      "bottomFromSeam": false,
      "contourConfidence": 0.9775368139223561,
      "seamConfidence": 0.85
    },
    "anchors": {
      "171": {
        "x": 0.254883,
        "y": 0.484706,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "cfTop",
        "reviewRequired": true
      },
      "172": {
        "x": 0.364258,
        "y": 0.167059,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "apexJoin",
        "reviewRequired": true
      },
      "181": {
        "x": 0.455078,
        "y": 0.574118,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "silhouette",
        "reviewRequired": true
      },
      "182": {
        "x": 0.386719,
        "y": 0.167059,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "strapJoin",
        "reviewRequired": true
      },
      "cf-top": {
        "x": 0.254883,
        "y": 0.484706,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "cf-bottom": {
        "x": 0.254883,
        "y": 0.870588,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "silhouette",
        "reviewRequired": false
      },
      "cradle-cf-top": {
        "x": 0.254883,
        "y": 0.72,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "seam",
        "reviewRequired": false
      },
      "cradle-cup-top": {
        "x": 0.347656,
        "y": 0.778824,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "cradle-cup-bottom": {
        "x": 0.347656,
        "y": 0.870588,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "band-left": {
        "x": 0.081055,
        "y": 0.870588,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "band-right": {
        "x": 0.429688,
        "y": 0.870588,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-left": {
        "x": 0.055664,
        "y": 0.574118,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "chest-right": {
        "x": 0.455078,
        "y": 0.574118,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "inner-cup-top": {
        "x": 0.137207,
        "y": 0.183529,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-bottom": {
        "x": 0.163818,
        "y": 0.778824,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-left": {
        "x": 0.092773,
        "y": 0.484706,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-right": {
        "x": 0.246094,
        "y": 0.484706,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "side-top": {
        "x": 0.557617,
        "y": 0.548235,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "side-bottom": {
        "x": 0.581438,
        "y": 0.872941,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "apex-left": {
        "x": 0.149414,
        "y": 0.183529,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "apex-right": {
        "x": 0.364258,
        "y": 0.167059,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "strap-top": {
        "x": 0.388184,
        "y": 0.122353,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "frontStrapSeam",
        "reviewRequired": true
      },
      "strap-bottom": {
        "x": 0.69179,
        "y": 0.454118,
        "viewRole": "back",
        "confidence": "low",
        "source": "backPanelJoin",
        "reviewRequired": true
      },
      "back-top": {
        "x": 0.760742,
        "y": 0.4,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-bottom": {
        "x": 0.760742,
        "y": 0.872941,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-top": {
        "x": 0.69179,
        "y": 0.454118,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-bottom": {
        "x": 0.69179,
        "y": 0.872941,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-left": {
        "x": 0.686523,
        "y": 0.454118,
        "viewRole": "back",
        "confidence": "medium",
        "source": "silhouette",
        "reviewRequired": true
      },
      "back-strap-right": {
        "x": 0.833984,
        "y": 0.454118,
        "viewRole": "back",
        "confidence": "medium",
        "source": "silhouette",
        "reviewRequired": true
      }
    }
  },
  "demo3.jpg": {
    "image": "demo3.jpg",
    "source": "production_detected",
    "ruleNote": "Real anchors from the production detector (npm run demo -- --dump-anchors). Normalized [0,1] in source-image pixel space.",
    "cupModel": {
      "side": 1,
      "viewRole": "front_outer",
      "visibility": "direct",
      "topFromApex": true,
      "bottomFromSeam": true,
      "contourConfidence": 0.9565078428843714,
      "seamConfidence": 1
    },
    "anchors": {
      "171": {
        "x": 0.185547,
        "y": 0.517241,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "cfTop",
        "reviewRequired": true
      },
      "172": {
        "x": 0.275391,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "apexJoin",
        "reviewRequired": true
      },
      "181": {
        "x": 0.342773,
        "y": 0.543103,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "silhouette",
        "reviewRequired": true
      },
      "182": {
        "x": 0.294922,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "strapJoin",
        "reviewRequired": true
      },
      "cf-top": {
        "x": 0.185547,
        "y": 0.517241,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "cf-bottom": {
        "x": 0.185547,
        "y": 0.821839,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "silhouette",
        "reviewRequired": false
      },
      "cradle-cf-top": {
        "x": 0.185547,
        "y": 0.70977,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamDip",
        "reviewRequired": true
      },
      "cradle-cup-top": {
        "x": 0.24707,
        "y": 0.70977,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "seam",
        "reviewRequired": false
      },
      "cradle-cup-bottom": {
        "x": 0.24707,
        "y": 0.79023,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "seam",
        "reviewRequired": false
      },
      "band-left": {
        "x": 0.046875,
        "y": 0.821839,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "band-right": {
        "x": 0.326172,
        "y": 0.821839,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-left": {
        "x": 0.030273,
        "y": 0.543103,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "chest-right": {
        "x": 0.342773,
        "y": 0.543103,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "inner-cup-top": {
        "x": 0.285156,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-bottom": {
        "x": 0.257813,
        "y": 0.70977,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-left": {
        "x": 0.202178,
        "y": 0.497126,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-right": {
        "x": 0.339844,
        "y": 0.497126,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "side-top": {
        "x": 0.633789,
        "y": 0.482759,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "side-bottom": {
        "x": 0.654008,
        "y": 0.821839,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "apex-left": {
        "x": 0.097656,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "apex-right": {
        "x": 0.275391,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "strap-top": {
        "x": 0.294922,
        "y": 0.143678,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "ratio",
        "reviewRequired": true
      },
      "strap-bottom": {
        "x": 0.691888,
        "y": 0.367816,
        "viewRole": "back",
        "confidence": "low",
        "source": "backPanelJoin",
        "reviewRequired": true
      },
      "back-top": {
        "x": 0.788086,
        "y": 0.617816,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-bottom": {
        "x": 0.788086,
        "y": 0.821839,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-top": {
        "x": 0.691888,
        "y": 0.367816,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-bottom": {
        "x": 0.691888,
        "y": 0.821839,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-left": {
        "x": 0.700195,
        "y": 0.367816,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "back-strap-right": {
        "x": 0.876953,
        "y": 0.367816,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      }
    }
  },
  "demo4.jpg": {
    "image": "demo4.jpg",
    "source": "production_detected",
    "ruleNote": "Real anchors from the production detector (npm run demo -- --dump-anchors). Normalized [0,1] in source-image pixel space.",
    "cupModel": {
      "side": -1,
      "viewRole": "front_outer",
      "visibility": "direct",
      "topFromApex": true,
      "bottomFromSeam": false,
      "contourConfidence": 0.9685703450891164,
      "seamConfidence": 0.85
    },
    "anchors": {
      "171": {
        "x": 0.188477,
        "y": 0.566092,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "cfTop",
        "reviewRequired": true
      },
      "172": {
        "x": 0.297852,
        "y": 0.329598,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "apexJoin",
        "reviewRequired": true
      },
      "181": {
        "x": 0.351563,
        "y": 0.568966,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "silhouette",
        "reviewRequired": true
      },
      "182": {
        "x": 0.301758,
        "y": 0.329598,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "strapJoin",
        "reviewRequired": true
      },
      "cf-top": {
        "x": 0.188477,
        "y": 0.566092,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "cf-bottom": {
        "x": 0.188477,
        "y": 0.925287,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "silhouette",
        "reviewRequired": false
      },
      "cradle-cf-top": {
        "x": 0.188477,
        "y": 0.83046,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamJunction",
        "reviewRequired": true
      },
      "cradle-cup-top": {
        "x": 0.239258,
        "y": 0.58908,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "cradle-cup-bottom": {
        "x": 0.239258,
        "y": 0.925287,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "band-left": {
        "x": 0.048828,
        "y": 0.925287,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "band-right": {
        "x": 0.329102,
        "y": 0.925287,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-left": {
        "x": 0.026367,
        "y": 0.568966,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-right": {
        "x": 0.351563,
        "y": 0.568966,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "inner-cup-top": {
        "x": 0.078125,
        "y": 0.247126,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-bottom": {
        "x": 0.102051,
        "y": 0.58908,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-left": {
        "x": 0.027344,
        "y": 0.485375,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-right": {
        "x": 0.168906,
        "y": 0.485889,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "side-top": {
        "x": 0.651367,
        "y": 0.548851,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "side-bottom": {
        "x": 0.678116,
        "y": 0.925287,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "apex-left": {
        "x": 0.080078,
        "y": 0.247126,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "apex-right": {
        "x": 0.297852,
        "y": 0.247126,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "strap-top": {
        "x": 0.303223,
        "y": 0.206897,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "frontStrapSeam",
        "reviewRequired": true
      },
      "strap-bottom": {
        "x": 0.705742,
        "y": 0.318966,
        "viewRole": "back",
        "confidence": "low",
        "source": "backPanelJoin",
        "reviewRequired": true
      },
      "back-top": {
        "x": 0.818359,
        "y": 0.571839,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-bottom": {
        "x": 0.818359,
        "y": 0.925287,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-top": {
        "x": 0.705742,
        "y": 0.318966,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-bottom": {
        "x": 0.705742,
        "y": 0.925287,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-left": {
        "x": 0.722656,
        "y": 0.318966,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "back-strap-right": {
        "x": 0.912109,
        "y": 0.318966,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      }
    }
  },
  "demo5.jpg": {
    "image": "demo5.jpg",
    "source": "production_detected",
    "ruleNote": "Real anchors from the production detector (npm run demo -- --dump-anchors). Normalized [0,1] in source-image pixel space.",
    "cupModel": {
      "side": -1,
      "viewRole": "front_outer",
      "visibility": "direct",
      "topFromApex": true,
      "bottomFromSeam": false,
      "contourConfidence": 0.9822222222222222,
      "seamConfidence": 0.85
    },
    "anchors": {
      "171": {
        "x": 0.231445,
        "y": 0.575,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "cfTop",
        "reviewRequired": true
      },
      "172": {
        "x": 0.335938,
        "y": 0.308333,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "apexJoin",
        "reviewRequired": true
      },
      "181": {
        "x": 0.423828,
        "y": 0.583333,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "silhouette",
        "reviewRequired": true
      },
      "182": {
        "x": 0.347656,
        "y": 0.308333,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "strapJoin",
        "reviewRequired": true
      },
      "cf-top": {
        "x": 0.231445,
        "y": 0.575,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "cf-bottom": {
        "x": 0.231445,
        "y": 0.897222,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "silhouette",
        "reviewRequired": false
      },
      "cradle-cf-top": {
        "x": 0.231445,
        "y": 0.579534,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamCrest",
        "reviewRequired": true
      },
      "cradle-cup-top": {
        "x": 0.307617,
        "y": 0.794444,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "cradle-cup-bottom": {
        "x": 0.307617,
        "y": 0.897222,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "seamArc",
        "reviewRequired": true
      },
      "band-left": {
        "x": 0.055664,
        "y": 0.897222,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "band-right": {
        "x": 0.40625,
        "y": 0.897222,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "chest-left": {
        "x": 0.038086,
        "y": 0.583333,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "chest-right": {
        "x": 0.423828,
        "y": 0.583333,
        "viewRole": "front_outer",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "inner-cup-top": {
        "x": 0.119629,
        "y": 0.305556,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-bottom": {
        "x": 0.147705,
        "y": 0.794444,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-left": {
        "x": 0.064453,
        "y": 0.536111,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "inner-cup-right": {
        "x": 0.209616,
        "y": 0.536111,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "cupModel",
        "reviewRequired": false
      },
      "side-top": {
        "x": 0.547852,
        "y": 0.566667,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "side-bottom": {
        "x": 0.566383,
        "y": 0.897222,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "apex-left": {
        "x": 0.129883,
        "y": 0.305556,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "apex-right": {
        "x": 0.335938,
        "y": 0.308333,
        "viewRole": "front_outer",
        "confidence": "high",
        "source": "apexJoin",
        "reviewRequired": false
      },
      "strap-top": {
        "x": 0.341797,
        "y": 0.236111,
        "viewRole": "front_outer",
        "confidence": "low",
        "source": "frontStrapSeam",
        "reviewRequired": true
      },
      "strap-bottom": {
        "x": 0.637326,
        "y": 0.455556,
        "viewRole": "back",
        "confidence": "low",
        "source": "backPanelJoin",
        "reviewRequired": true
      },
      "back-top": {
        "x": 0.746094,
        "y": 0.7,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-bottom": {
        "x": 0.746094,
        "y": 0.897222,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-top": {
        "x": 0.637326,
        "y": 0.455556,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-panel-bottom": {
        "x": 0.637326,
        "y": 0.897222,
        "viewRole": "back",
        "confidence": "high",
        "source": "ink",
        "reviewRequired": false
      },
      "back-strap-left": {
        "x": 0.645508,
        "y": 0.455556,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      },
      "back-strap-right": {
        "x": 0.844727,
        "y": 0.455556,
        "viewRole": "back",
        "confidence": "medium",
        "source": "ink",
        "reviewRequired": true
      }
    }
  }
};
});
