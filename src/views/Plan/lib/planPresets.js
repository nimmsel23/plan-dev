// Built-in drafts, copied only on explicit selection. No account writes on load.
const EXERCISES = {
  "bench": {
    "exercise_id": "barbell_bench_press_-_medium_grip",
    "yuhonas_id": "Barbell_Bench_Press_-_Medium_Grip",
    "name": "Bankdrücken",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": [
      "barbell"
    ]
  },
  "incline": {
    "exercise_id": "041",
    "yuhonas_id": "Incline_Dumbbell_Press",
    "name": "Schrägbankdrücken mit Kurzhanteln",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": [
      "dumbbell"
    ]
  },
  "fly": {
    "exercise_id": "yuhonas_cable_crossover",
    "yuhonas_id": "Cable_Crossover",
    "name": "Cable Crossovers",
    "primaryMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders"
    ],
    "equipment": [
      "cable"
    ]
  },
  "row": {
    "exercise_id": "yuhonas_seated_cable_rows",
    "yuhonas_id": "Seated_Cable_Rows",
    "name": "Rudern am Kabelzug",
    "primaryMuscles": [
      "middle back"
    ],
    "secondaryMuscles": [
      "biceps",
      "lats",
      "shoulders"
    ],
    "equipment": [
      "cable"
    ]
  },
  "lat": {
    "exercise_id": "yuhonas_wide-grip_lat_pulldown",
    "yuhonas_id": "Wide-Grip_Lat_Pulldown",
    "name": "Latzug zur Brust",
    "primaryMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps",
      "middle back",
      "shoulders"
    ],
    "equipment": [
      "cable"
    ]
  },
  "pullup": {
    "exercise_id": "yuhonas_pullups",
    "yuhonas_id": "Pullups",
    "name": "Klimmzüge",
    "primaryMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps",
      "middle back"
    ],
    "equipment": [
      "body only"
    ]
  },
  "squat": {
    "exercise_id": "back_squat",
    "yuhonas_id": "Barbell_Squat",
    "name": "Langhantel-Kniebeugen",
    "primaryMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings",
      "lower back"
    ],
    "equipment": [
      "barbell"
    ]
  },
  "lunge": {
    "exercise_id": "yuhonas_dumbbell_lunges",
    "yuhonas_id": "Dumbbell_Lunges",
    "name": "Kurzhantel-Ausfallschritte",
    "primaryMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": [
      "dumbbell"
    ]
  },
  "hinge": {
    "exercise_id": "81",
    "yuhonas_id": "Romanian_Deadlift",
    "name": "Rumänisches Kreuzheben",
    "primaryMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "lower back"
    ],
    "equipment": [
      "barbell"
    ]
  },
  "extend": {
    "exercise_id": "401",
    "yuhonas_id": "Leg_Extensions",
    "name": "Beinstrecken",
    "primaryMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "machine"
    ]
  },
  "curlleg": {
    "exercise_id": "402",
    "yuhonas_id": "Lying_Leg_Curls",
    "name": "Beinbeugen",
    "primaryMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "machine"
    ]
  },
  "calf": {
    "exercise_id": "yuhonas_standing_calf_raises",
    "yuhonas_id": "Standing_Calf_Raises",
    "name": "Wadenheben",
    "primaryMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "machine"
    ]
  },
  "press": {
    "exercise_id": "yuhonas_seated_dumbbell_press",
    "yuhonas_id": "Seated_Dumbbell_Press",
    "name": "Kurzhantel-Schulterdrücken",
    "primaryMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [
      "triceps"
    ],
    "equipment": [
      "dumbbell"
    ]
  },
  "lateral": {
    "exercise_id": "dumbbell_lateral_raise",
    "yuhonas_id": "Side_Lateral_Raise",
    "name": "Seitheben",
    "primaryMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "dumbbell"
    ]
  },
  "face": {
    "exercise_id": "yuhonas_face_pull",
    "yuhonas_id": "Face_Pull",
    "name": "Face Pulls",
    "primaryMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [
      "middle back"
    ],
    "equipment": [
      "cable"
    ]
  },
  "curl": {
    "exercise_id": "wger_91",
    "yuhonas_id": "Dumbbell_Bicep_Curl",
    "name": "Bizeps-Curls",
    "primaryMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [
      "forearms"
    ],
    "equipment": [
      "dumbbell"
    ]
  },
  "hammer": {
    "exercise_id": "yuhonas_alternate_hammer_curl",
    "yuhonas_id": "Alternate_Hammer_Curl",
    "name": "Hammer Curls",
    "primaryMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [
      "forearms"
    ],
    "equipment": [
      "dumbbell"
    ]
  },
  "overhead": {
    "exercise_id": "yuhonas_cable_rope_overhead_triceps_extension",
    "yuhonas_id": "Cable_Rope_Overhead_Triceps_Extension",
    "name": "Overhead-Trizepsstrecken am Kabelzug",
    "primaryMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "equipment": [
      "cable"
    ]
  }
};

function day(label, weekday, keys) {
  return { label, weekdays: [weekday], targetCount: 1, targetPeriodDays: 7,
    exercises: keys.map(([key, count = 3, reps = '8-12'], order) => ({
      ...EXERCISES[key], id: `${key}-${order}`, order,
      trackingType: key === 'pullup' ? 'bodyweight_reps' : 'weight_reps',
      rest_seconds: ['bench', 'squat', 'hinge', 'pullup', 'press', 'row', 'lat', 'incline', 'lunge'].includes(key) ? 120 : 90,
      notes: 'Kontrollierte Ausführung; zunächst ca. 2 Wiederholungen in Reserve. Aufwärmsätze zusätzlich.',
      templateSets: Array.from({ length: count }, (_, i) => ({ setIndex: i + 1, setType: 'normal', targetReps: reps, targetWeight: null, targetDuration: null })),
    })) };
}
const progression = 'Bearbeitbarer Ausgangspunkt für 4 Wochen. Last individuell wählen. Wenn alle Arbeitssätze das obere Wiederholungsziel mit sauberer Technik und ca. 2 Wiederholungen in Reserve erreichen, Last in einem kleinen Schritt erhöhen. Allgemeines und übungsspezifisches Aufwärmen voranstellen.';
const core = ' Danach an jedem Trainingstag ein separates Core-Intervallworkout aus der 6Pack-App, nach Tagesform dosieren. Nicht als Rückenstreckung oder zusätzliche Kraftsätze zählen; kein konkretes App-Workout vorausgewählt.';

export const PLAN_PRESETS = [
  { id: 'full-body', name: 'Basic · Ganzkörper A/B · 3 Tage', description: progression + ' Mo A, Mi B, Fr A.', routines: [
    day('Ganzkörper A', 0, [['squat'], ['bench'], ['row'], ['curlleg', 2], ['lateral', 2]]),
    day('Ganzkörper B', 2, [['hinge'], ['lat'], ['press'], ['lunge', 2], ['curl', 2]]),
    day('Ganzkörper A', 4, [['squat'], ['bench'], ['row'], ['curlleg', 2], ['lateral', 2]]),
  ] },
  { id: 'push-pull', name: 'Basic · Push/Pull mit Beinen · 4 Tage', description: progression + ' Mo Push A, Di Pull A, Do Push B, Sa Pull B. Beine sind auf beide Bewegungsmuster verteilt.', routines: [
    day('Push A', 0, [['squat'], ['bench'], ['press', 2], ['overhead', 2]]),
    day('Pull A', 1, [['hinge'], ['row'], ['lat', 2], ['curl', 2]]),
    day('Push B', 3, [['lunge'], ['incline'], ['lateral'], ['extend', 2]]),
    day('Pull B', 5, [['curlleg'], ['lat'], ['row', 2], ['hammer', 2], ['calf']]),
  ] },
  { id: 'ppl-basic', name: 'Basic · Push/Pull/Beine · 3 Tage', description: progression + ' Mo Push, Mi Pull, Fr Beine.', routines: [
    day('Push', 0, [['bench'], ['press', 2], ['lateral', 2], ['overhead', 2]]),
    day('Pull', 2, [['lat'], ['row'], ['face', 2, '12-15'], ['curl', 2]]),
    day('Beine', 4, [['squat'], ['hinge'], ['curlleg', 2], ['calf']]),
  ] },
  { id: 'daniel-three', name: 'Daniel · Brust/Pull/Beine + Schultern · 3 Tage', description: progression + ' Aus Trainingsplanerstellung.md abgeleitet und gestrafft: Mo Brust/Trizeps, Mi Rücken/Bizeps, Fr Beine/Schultern. Schulterübungen ergänzt; Tag-4-Testentwurf ausgeschlossen.' + core, routines: [
    day('Brust + Trizeps', 0, [['incline'], ['fly'], ['overhead']]),
    day('Rücken + Bizeps', 2, [['row'], ['pullup', 3, '5-8'], ['face', 2, '12-15'], ['curl'], ['hammer', 2]]),
    day('Beine + Schultern', 4, [['squat'], ['lunge', 2], ['curlleg'], ['calf'], ['press', 2], ['lateral', 2]]),
  ] },
  { id: 'daniel-classic-five', name: 'Daniel · Klassischer 5er-Split + 6Pack', description: progression + ' Tag 1 Brust, Tag 2 Rücken, Tag 3 Pause, Tag 4 Beine, Tag 5 Schultern, Tag 6 Arme, Tag 7 Pause. Wochenstart Montag; kein Ober-/Unterkörper-Split. Aus dem ursprünglichen Übungspool abgeleitet, keine zusätzlichen Cheat-/Versagenssätze.' + core, routines: [
    day('Brust', 0, [['bench'], ['incline'], ['fly', 2, '12-15']]),
    day('Rücken', 1, [['pullup', 3, '5-8'], ['row'], ['lat', 2]]),
    day('Beine', 3, [['squat'], ['hinge'], ['extend', 2], ['curlleg', 2], ['calf']]),
    day('Schultern', 4, [['press'], ['lateral', 3, '12-15'], ['face', 3, '12-15']]),
    day('Arme', 5, [['curl'], ['overhead'], ['hammer', 2]]),
  ] },
];

export function planFromPreset(id) {
  const preset = PLAN_PRESETS.find((item) => item.id === id);
  if (!preset) throw new Error('Unbekannte Planvorlage.');
  const { name, description, routines } = structuredClone(preset);
  return { name, description, totalWeeks: 4, routines: routines.map((routine, i) => ({ ...routine, id: `preset-day-${i}` })) };
}
