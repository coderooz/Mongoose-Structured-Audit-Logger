/**
 * @file logging.ts
 * @description
 * Core type definitions for the portable MongoDB audit logging system.
 *
 * This module defines the foundational interfaces and type contracts used by
 * the audit logging framework, including:
 *
 * - Canonical audit event structure
 * - Logger function contract
 * - Plugin configuration types
 * - Mongoose audit log model interface
 * - Hook configuration schema
 *
 * These types ensure that logging behavior remains strongly typed,
 * predictable, and reusable across multiple applications and database models.
 *
 * ---------------------------------------------------------------------------
 * DESIGN GOALS
 * ---------------------------------------------------------------------------
 * - Provide a portable type system independent of application models
 * - Support flexible audit logging implementations
 * - Enable safe integration with Mongoose lifecycle hooks
 * - Allow structured metadata logging
 * - Maintain compatibility with TypeScript inference for document types
 *
 * ---------------------------------------------------------------------------
 * ARCHITECTURAL ROLE
 * ---------------------------------------------------------------------------
 * This module serves as the **type backbone** of the audit logging system.
 *
 * Other parts of the system rely on these types:
 *
 * - `attachAuditLogging()` plugin
 * - `createErrorLogger()` helper
 * - application-specific logging implementations
 * - database audit log models
 *
 * Because of this, the types defined here should remain **framework-agnostic**
 * and **independent of application-specific schemas**.
 */

import mongoose from "mongoose";
import type {
  Document,
  Query,
  Types,
} from "mongoose";
import { LoggingActionHooks, LOG_RESOULUTION_STATUS } from "../constants/Logging";

/**
 * Represents the identifier of the user or actor responsible for an event.
 *
 * This field is intentionally flexible because different applications may
 * represent users differently.
 *
 * Supported values:
 *
 * - `string`
 *   Useful when using external authentication providers or UUID systems.
 *
 * - `Types.ObjectId`
 *   Standard MongoDB ObjectId reference to a User collection.
 *
 * - `null`
 *   Represents system-level events or background tasks where no user
 *   initiated the action.
 */
type UserIdType =  string | Types.ObjectId | null;


/* -------------------------------------------------------------------------- */
/* Canonical Audit Event                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Represents the canonical structure of an audit event passed to a logger.
 *
 * This event structure is produced by the audit logging plugin or other
 * logging utilities and consumed by the `AuditLogger` implementation.
 *
 * ---------------------------------------------------------------------------
 * @typeParam TDetails
 * Optional generic type allowing structured metadata specific to the event.
 *
 * Example:
 *
 * ```ts
 * interface ContentDetails {
 *   title: string
 *   slug: string
 * }
 *
 * AuditEvent<ContentDetails>
 * ```
 *
 * ---------------------------------------------------------------------------
 * @property action
 * A semantic identifier describing the action being logged.
 *
 * Example values:
 *
 * - `"user.account.created"`
 * - `"content.updated"`
 * - `"system.error"`
 *
 * ---------------------------------------------------------------------------
 * @property userId
 * Identifier of the actor responsible for the event.
 *
 * Can be a user ID, MongoDB ObjectId, or null for system operations.
 *
 * ---------------------------------------------------------------------------
 * @property details
 * Optional structured metadata associated with the event.
 *
 * This may include:
 *
 * - record identifiers
 * - document attributes
 * - contextual information
 * - external API responses
 *
 * This field should remain JSON-serializable.
 */
export interface AuditEvent<TDetails = Record<string, unknown>> {
  action: string;
  userId?: UserIdType;
  details?: TDetails;
}

/* -------------------------------------------------------------------------- */
/* Logger Contract                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Defines the contract for an audit logging implementation.
 *
 * The logging framework itself **does not store logs directly**.
 * Instead, it delegates persistence to an implementation of this interface.
 *
 * Applications may implement this logger to store events in:
 *
 * - MongoDB collections
 * - logging queues
 * - analytics systems
 * - monitoring platforms
 *
 * ---------------------------------------------------------------------------
 * @typeParam TDetails
 * Optional metadata type attached to the audit event.
 *
 * ---------------------------------------------------------------------------
 * @param event
 * The structured audit event payload.
 *
 * ---------------------------------------------------------------------------
 * @returns
 * Promise resolving once the logging operation completes.
 *
 * The logger should **not throw** unless a critical failure occurs.
 *
 * ---------------------------------------------------------------------------
 * @example
 *
 * ```ts
 * export const logAudit: AuditLogger = async (event) => {
 *   await AuditLog.create({
 *     action: event.action,
 *     user: event.userId,
 *     details: event.details ?? {}
 *   });
 * };
 * ```
 */
export type AuditLogger = <TDetails = Record<string, unknown>>(
  event: AuditEvent<TDetails>
) => Promise<void>;

/* -------------------------------------------------------------------------- */
/* Logging Hook Types                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Represents the list of supported lifecycle hooks that the logging plugin
 * can attach to.
 *
 * These correspond to common Mongoose middleware events.
 *
 * Example values:
 *
 * - `"create"`
 * - `"update"`
 * - `"delete"`
 * - `"findOneAndDelete"`
 */
export type LoggingHookTypes = typeof LoggingActionHooks[number];


/* -------------------------------------------------------------------------- */
/* Log Resolution Status                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Represents the resolution state of an audit log entry.
 *
 * These statuses may be used in administrative dashboards or monitoring
 * tools to track whether an issue has been reviewed or resolved.
 *
 * Possible values:
 *
 * - `"unresolved"`
 * - `"resolved"`
 * - `"under-review"`
 */
export type LogResolutionStatusType = typeof LOG_RESOULUTION_STATUS[number];


/* -------------------------------------------------------------------------- */
/* Audit Log Database Model Interface                                         */
/* -------------------------------------------------------------------------- */

/**
 * Represents the Mongoose document structure of an audit log entry stored
 * in the database.
 *
 * This interface is typically used when defining the application's
 * audit log model.
 *
 * ---------------------------------------------------------------------------
 * @property action
 * Semantic action identifier describing the event.
 *
 * ---------------------------------------------------------------------------
 * @property user
 * Identifier of the actor responsible for the action.
 *
 * Can be null for system-level events.
 *
 * ---------------------------------------------------------------------------
 * @property details
 * Structured metadata describing the event context.
 *
 * This may include record identifiers, contextual information,
 * or diagnostic data.
 *
 * ---------------------------------------------------------------------------
 * @property resolution
 * Optional resolution state of the log entry.
 *
 * Useful for tracking investigation or remediation workflows.
 *
 * ---------------------------------------------------------------------------
 * @property createdAt
 * Timestamp indicating when the audit event was recorded.
 */
export interface IAuditLog extends Document {
  action: string;
  user: UserIdType;
  details: Record<string, unknown>;
  resolution?: LogResolutionStatusType;
  createdAt?: Date;
}


/* -------------------------------------------------------------------------- */
/* Hook Configuration                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Configuration object defining how a specific lifecycle hook should be
 * logged by the audit logging plugin.
 *
 * Each configuration entry describes:
 *
 * - which Mongoose lifecycle event to observe
 * - what semantic action identifier should be logged
 * - how to determine the actor responsible
 * - what additional metadata should be recorded
 *
 * ---------------------------------------------------------------------------
 * @typeParam TDoc
 * The document type associated with the schema being instrumented.
 */
export interface LoggingHookConfig<TDoc extends Document> {

  /**
   * Mongoose lifecycle event that should trigger logging.
   *
   * Examples:
   *
   * - `"create"`
   * - `"update"`
   * - `"delete"`
   * - `"findOneAndDelete"`
   */
  hook: LoggingHookTypes;

  /**
   * Semantic identifier stored in the audit log.
   *
   * Example values:
   *
   * - `"user.account.deleted"`
   * - `"content.created"`
   * - `"order.completed"`
   */
  action: string;

  /**
   * Optional function used to extract the actor responsible for the action.
   *
   * If this function is omitted, the plugin defaults to `document._id`.
   *
   * The query object is provided for hooks where the operation originates
   * from a query context (such as updates).
   */
  getActorId?: (doc: TDoc, query?: Query<any, any>) => unknown;

  /**
   * Optional function used to generate structured metadata for the audit log.
   *
   * This allows applications to include contextual information such as:
   *
   * - identifiers
   * - document attributes
   * - external references
   *
   * The returned object must be JSON-serializable.
   */
  getDetails?: (doc: TDoc, query?: Query<any, any>) => Record<string, unknown>;
}


/* -------------------------------------------------------------------------- */
/* Plugin Options                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Configuration options passed to the `attachAuditLogging` plugin.
 *
 * These options define:
 *
 * - the logger implementation responsible for persisting events
 * - the lifecycle hooks that should trigger logging
 */
export interface AttachAuditLoggingOptions<TDoc extends Document> {

  /**
   * Audit logging implementation responsible for persisting events.
   *
   * The plugin calls this function whenever a configured lifecycle
   * event occurs.
   */
  logger: AuditLogger;

  /**
   * Array of hook configurations describing which events should
   * trigger audit logs.
   */
  hooks: LoggingHookConfig<TDoc>[];
}

