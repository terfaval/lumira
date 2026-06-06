export const OBSERVATION_SALIENCE_LEVELS = ["present", "strong"] as const;

export type ObservationSalienceLevel = (typeof OBSERVATION_SALIENCE_LEVELS)[number];

export interface ObservationSalienceProfile {
  anomaly?: ObservationSalienceLevel;
  agencyTension?: ObservationSalienceLevel;
  metacognitivePresence?: ObservationSalienceLevel;
}
