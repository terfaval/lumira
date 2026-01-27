export type ObservationPayloadV0 = {
  summary: string;
  scenes: Array<{
    setting: string;
    characters: string[];
    objects: string[];
    actions: string[];
    sensations: string[];
    mood_words: string[];
  }>;
  entities: {
    people: string[];
    places: string[];
    objects: string[];
    themes_words: string[];
  };
  raw_facts: string[];
};
