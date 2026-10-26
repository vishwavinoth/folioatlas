/**
 * FolioAtlas — core data types.
 * The Portfolio type mirrors PRD §7.3 with added provenance (letter, line)
 * and transparent classification (technologies).
 */

/** Wire-format entry (embedded into the client payload without provenance). */
export type PortfolioBase = {
  /** Deterministic across builds (derived from normalized name + URL). */
  id: string;
  /** Developer name, exactly as supplied upstream (Unicode preserved). */
  name: string;
  /** Validated, normalized HTTP(S) URL. */
  url: string;
  /** Short description — only present when actually supplied upstream. */
  description?: string;
  /** Primary focus areas derived ONLY from upstream role text (documented rules). */
  technologies?: string[];
  /** Alphabetical bucket letter (A–Z), derived from upstream section heading. */
  letter: string;
};

export type Portfolio = PortfolioBase & {
  /** Provenance of the entry in the upstream source. */
  source: {
    repository: string;
    file: string;
    line?: number;
  };
};

export type TechnologyCategory = {
  slug: string;
  label: string;
  count: number;
};

export type ClientIndex = {
  schemaVersion: number;
  source: {
    repository: string;
    file: string;
    branch: string;
    commit: string | null;
  };
  generatedAt: string;
  stats: SyncReport["stats"];
  technologies: TechnologyCategory[];
  portfolios: PortfolioBase[];
};

export type SyncReport = {
  schemaVersion: number;
  source: {
    repository: string;
    file: string;
    branch: string;
    commit: string | null;
  };
  generatedAt: string;
  stats: {
    linesScanned: number;
    entriesDetected: number;
    valid: number;
    duplicatesRemoved: number;
    quarantined: number;
    withDescription: number;
    classified: number;
    nameCollisionsKept: number;
  };
  warnings: string[];
  quarantined: Array<{ line: number; raw: string; reason: string }>;
  duplicateCollisions: Array<{ url: string; keptName: string; droppedName: string }>;
  technologies: TechnologyCategory[];
};

export type PortfolioIndex = {
  schemaVersion: number;
  source: {
    repository: string;
    file: string;
    branch: string;
    commit: string | null;
  };
  generatedAt: string;
  stats: SyncReport["stats"];
  technologies: TechnologyCategory[];
  portfolios: Portfolio[];
};
