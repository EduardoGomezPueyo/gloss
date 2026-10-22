/*
 * Domain model (see docs/SPEC.md, section 3).
 *
 * Pure types with no dependency on storage or the browser, so they can be shared
 * with a future backend. Every persisted entity is backend-shaped: UUID id plus
 * creation/update metadata.
 */

export type Id = string;
/** ISO 8601 timestamp. */
export type Timestamp = string;
/** BCP 47 language code, e.g. "en", "es", "ja". */
export type LanguageCode = string;

export interface Entity {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Member who created the entity; null for seeded or system data. */
  createdBy: Id | null;
  /** Member who last updated the entity; null for seeded or system data. */
  updatedBy: Id | null;
}

/** Canonical statuses. UI labels come from i18n. */
export const STATUSES = ['not-started', 'in-progress', 'under-review', 'completed'] as const;
export type Status = (typeof STATUSES)[number];

/** Canonical priorities, highest first. */
export const PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PLATFORMS = ['playstation', 'xbox', 'pc', 'switch'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type MemberCategory = 'manager' | 'worker';
export type MemberStatus = 'active' | 'invited';

export interface Member extends Entity {
  name: string;
  email: string;
  category: MemberCategory;
  status: MemberStatus;
  /** Removed members are kept so their translations stay attributed. */
  removedAt: Timestamp | null;
}

export interface Project extends Entity {
  name: string;
  /** Human-readable identifier, e.g. "DEMO-A-2026". */
  code: string;
  /** Free text, e.g. "Q3 2026" (SPEC minor open decision). */
  releaseDate: string | null;
  sourceLanguage: LanguageCode;
  /** Never includes the source language. */
  targetLanguages: LanguageCode[];
  platforms: Platform[];
  managerIds: Id[];
  memberIds: Id[];
  priority: Priority;
}

/** An act of the game ("Act 1 - …"). */
export interface Section extends Entity {
  projectId: Id;
  name: string;
  description: string;
  order: number;
}

export interface ContentItem extends Entity {
  projectId: Id;
  sectionId: Id;
  name: string;
  /** e.g. "Mission dialogue" (closed list or free text is still open). */
  type: string;
  order: number;
  translatorNote: string | null;
}

/** Position of a text box detected by OCR, in image pixels. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrBlock {
  text: string;
  bbox: BoundingBox | null;
  confidence: number | null;
}

/** The single source text block of an image. */
export interface SourceText {
  text: string;
  speaker: string | null;
  /** e.g. "Dialogue". */
  type: string | null;
  contextNote: string | null;
  /** Text as returned by OCR; null if it was typed by hand. */
  ocrText: string | null;
  ocrBlocks: OcrBlock[];
}

/**
 * Where OCR is for an image: waiting (queued or running), text found, no text
 * found, or failed (it can be retried). DECISIONS D29.
 */
export const OCR_STATUSES = ['pending', 'done', 'empty', 'failed'] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];

/**
 * One image of a content item. It has no title of its own: it is shown as
 * "<item name> - <position>" (DECISIONS D29, see imageLabel).
 */
export interface SceneImage extends Entity {
  projectId: Id;
  contentItemId: Id;
  order: number;
  /** Original file name, kept for reference. */
  fileName: string;
  /** Stored image file; null when the image has no file (e.g. placeholder seed data). */
  fileId: Id | null;
  source: SourceText;
  ocrStatus: OcrStatus;
  /** Why OCR failed, for the retry message; null otherwise. */
  ocrError: string | null;
}

/** Translation of one image into one target language. A missing translation means "not started". */
export interface Translation extends Entity {
  projectId: Id;
  imageId: Id;
  language: LanguageCode;
  text: string;
  status: Status;
  /**
   * "Mark translated" (DECISIONS D30): an in-progress translation its translator
   * considers finished. "Submit for review" moves these to Under Review.
   */
  ready: boolean;
  authorId: Id | null;
  /** Manager who approved it (Completed); null otherwise. */
  reviewerId: Id | null;
}

/** A conversation about one image (Figma: Comments, "This image"). */
export interface CommentThread extends Entity {
  projectId: Id;
  imageId: Id;
  /** Language the thread is about; null for the source text or the image in general. */
  language: LanguageCode | null;
  resolvedAt: Timestamp | null;
  resolvedBy: Id | null;
}

/** One message of a thread; the first one opens it. Mentions are plain "@Name" text. */
export interface Comment extends Entity {
  projectId: Id;
  threadId: Id;
  authorId: Id | null;
  body: string;
}

/** A glossary category of a project (Characters, Factions, Locations, Lore…). */
export interface GlossaryCategory extends Entity {
  projectId: Id;
  name: string;
  order: number;
}

/** The editable content of a glossary entry; each save stores it as a version. */
export interface GlossaryContent {
  categoryId: Id;
  title: string;
  /** Short description for cards and the editor panel. */
  description: string;
  tags: string[];
  /** Stored image files, in gallery order (the first one is shown large). */
  imageFileIds: Id[];
  /** Markdown with [[Title]] links and footnote references (DECISIONS D31). */
  body: string;
}

/** A per-project glossary entry (SPEC 5.5: simplified Markdown entries only). */
export interface GlossaryEntry extends Entity, GlossaryContent {
  projectId: Id;
  viewCount: number;
}

/** A saved state of an entry; createdBy / createdAt are its author and time. */
export interface GlossaryVersion extends Entity, GlossaryContent {
  projectId: Id;
  entryId: Id;
  /** 1 for the first save, then 2, 3… (orders versions saved within the same millisecond). */
  number: number;
}
