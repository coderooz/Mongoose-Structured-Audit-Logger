/**
 * @file Logging.ts
 * @description
 * Core constant definitions used by the audit logging framework.
 *
 * This module provides strongly typed constant values used throughout the
 * logging system, including:
 *
 * - Supported Mongoose lifecycle hooks used by the audit logging plugin
 * - Audit log resolution status values used for investigation workflows
 *
 * These constants are defined using `as const` to preserve literal types,
 * allowing TypeScript to infer exact union types from their values.
 *
 * ---------------------------------------------------------------------------
 * DESIGN GOALS
 * ---------------------------------------------------------------------------
 * - Provide a centralized source for logging-related constants
 * - Ensure strong typing across the logging framework
 * - Avoid string duplication across the codebase
 * - Enable safe union-type extraction using `typeof ...[number]`
 *
 * Example:
 *
 * ```ts
 * type LoggingHookTypes = typeof LoggingActionHooks[number];
 * ```
 *
 * This ensures only supported hook types can be used by the logging plugin.
 *
 * ---------------------------------------------------------------------------
 * ARCHITECTURAL ROLE
 * ---------------------------------------------------------------------------
 * These constants are consumed by multiple parts of the system:
 *
 * - `attachAuditLogging()` plugin
 * - logging configuration types
 * - audit log model interfaces
 * - administrative dashboards
 *
 * Because these constants define **core behavior contracts**, they should
 * remain stable across versions of the logging library.
 */


/* -------------------------------------------------------------------------- */
/* Supported Mongoose Logging Hooks                                           */
/* -------------------------------------------------------------------------- */

/**
 * List of supported lifecycle hook identifiers used by the audit logging
 * plugin.
 *
 * These values correspond to database operations performed through Mongoose
 * models and determine which operations will trigger audit log events.
 *
 * The plugin internally maps these identifiers to the appropriate
 * Mongoose middleware hooks.
 *
 * ---------------------------------------------------------------------------
 * Supported hooks:
 *
 * • `"create"`
 *   Triggered after a new document is saved using `schema.post("save")`
 *
 * • `"update"`
 *   Triggered after a document is updated via `findOneAndUpdate`
 *
 * • `"delete"`
 *   Triggered when a document instance calls `deleteOne()`
 *
 * • `"findOneAndDelete"`
 *   Triggered when a document is removed using `findOneAndDelete`
 *
 * ---------------------------------------------------------------------------
 * These values are intentionally limited to the most common CRUD lifecycle
 * events used in production applications.
 *
 * Additional hook types can be introduced in future versions if necessary.
 *
 * ---------------------------------------------------------------------------
 * @example
 *
 * ```ts
 * attachAuditLogging(UserSchema, {
 *   logger: logAudit,
 *   hooks: [
 *     {
 *       hook: "create",
 *       action: "user.account.created"
 *     }
 *   ]
 * });
 * ```
 */
export const LoggingActionHooks = [
  "create",
  "update",
  "delete",
  "findOneAndDelete"
] as const;


/* -------------------------------------------------------------------------- */
/* Audit Log Resolution Status                                                */
/* -------------------------------------------------------------------------- */

/**
 * Defines the possible resolution states for an audit log entry.
 *
 * These values are typically used in administrative dashboards or
 * monitoring tools to track whether a logged event has been reviewed
 * or addressed.
 *
 * ---------------------------------------------------------------------------
 * Available statuses:
 *
 * • `"unresolved"`
 *   The log entry has not yet been reviewed or investigated.
 *
 * • `"resolved"`
 *   The issue associated with the log entry has been addressed.
 *
 * • `"under-review"`
 *   The log entry is currently being investigated or analyzed.
 *
 * ---------------------------------------------------------------------------
 * These statuses are especially useful for:
 *
 * - security monitoring
 * - incident response tracking
 * - administrative review workflows
 * - operational diagnostics
 *
 * ---------------------------------------------------------------------------
 * @example
 *
 * ```ts
 * await AuditLog.create({
 *   action: "system.error",
 *   user: userId,
 *   details: { context: "paymentWebhook" },
 *   resolution: "under-review"
 * });
 * ```
 */
export const LOG_RESOULUTION_STATUS = [
  "unresolved",
  "resolved",
  "under-review"
] as const;