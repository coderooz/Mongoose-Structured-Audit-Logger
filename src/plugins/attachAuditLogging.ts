/** @format
 * @filePath src/lib/loggingAction.ts
 * @author Coderooz
 * @author Ranit Saha <coderooz.dev@gmail.com>
 * @description
 * Production-grade reusable logging helpers for MongoDB (Mongoose).
 *
 * This module provides:
 * 1. A generic `logAudit` contract (expected to be implemented elsewhere).
 * 2. A reusable schema plugin `attachAuditLogging` that can be applied to
 * multiple schemas to log create/update/delete actions.
 */

import type {
  Schema,
  Document,
  Query,
} from "mongoose";
import { AttachAuditLoggingOptions } from "../types/Logging";

/**
 * attachAuditLogging
 * ---------------------------------------------------------------------------
 * Attaches structured audit logging hooks to a Mongoose schema.
 *
 * This function is implemented as a reusable **Mongoose plugin-style utility**
 * that automatically records lifecycle events occurring on database models.
 *
 * Instead of manually calling logging functions throughout application code,
 * this utility allows developers to define **declarative logging hooks** that
 * trigger whenever certain database operations occur.
 *
 * The plugin intercepts selected Mongoose operations and forwards structured
 * audit events to a provided `AuditLogger` implementation.
 *
 * ---------------------------------------------------------------------------
 * SUPPORTED LIFECYCLE HOOKS
 * ---------------------------------------------------------------------------
 * The plugin supports the following database operations:
 *
 * • `create`
 *   Triggered when a new document is saved (`schema.post("save")`)
 *
 * • `update`
 *   Triggered when a document is updated using `findOneAndUpdate`
 *
 * • `delete`
 *   Triggered when a document instance calls `deleteOne()`
 *
 * • `findOneAndDelete`
 *   Triggered when a document is removed using `findOneAndDelete`
 *
 * These operations correspond to the most common persistence events in
 * typical CRUD applications.
 *
 * ---------------------------------------------------------------------------
 * DESIGN GOALS
 * ---------------------------------------------------------------------------
 * - Centralize audit logging logic
 * - Remove repetitive logging code from application services
 * - Provide flexible hook configuration
 * - Support multi-model logging across projects
 * - Allow pluggable logger implementations
 * - Maintain compatibility with Mongoose lifecycle hooks
 *
 * The function does **not implement storage logic itself**. Instead, it
 * delegates event persistence to a provided `AuditLogger` implementation.
 *
 * This allows the same plugin to be reused across applications that may
 * store logs in different backends such as:
 *
 * - MongoDB
 * - ElasticSearch
 * - Message queues
 * - Observability platforms
 *
 * ---------------------------------------------------------------------------
 * @typeParam TDoc
 * The document type associated with the schema. This allows TypeScript to
 * correctly infer document properties inside hook callbacks.
 *
 * ---------------------------------------------------------------------------
 * @param schema
 * The Mongoose schema that will receive the audit logging hooks.
 *
 * The plugin modifies this schema by attaching `post` middleware
 * corresponding to the configured lifecycle events.
 *
 * ---------------------------------------------------------------------------
 * @param options
 * Configuration object describing how logging should behave.
 *
 * Fields:
 *
 * - `logger`
 *   Implementation of the `AuditLogger` contract responsible for persisting
 *   the generated audit events.
 *
 * - `hooks`
 *   Array of hook configurations defining which lifecycle events should
 *   trigger audit logs and how event metadata should be generated.
 *
 * Each hook configuration contains:
 *
 * - `hook`
 *   The lifecycle operation to observe.
 *
 * - `action`
 *   A semantic identifier describing the event.
 *   Examples:
 *   - `"content.created"`
 *   - `"user.account.deleted"`
 *   - `"order.completed"`
 *
 * - `getActorId`
 *   Optional function used to determine the responsible actor.
 *   If omitted, the document `_id` is used.
 *
 * - `getDetails`
 *   Optional function used to extract structured metadata from the
 *   document or query context.
 *
 * ---------------------------------------------------------------------------
 * LOGGER CONTRACT
 * ---------------------------------------------------------------------------
 * The provided logger must follow the `AuditLogger` interface:
 *
 * ```
 * (event: {
 *   action: string
 *   userId?: unknown
 *   details?: Record<string, unknown>
 * }) => Promise<void>
 * ```
 *
 * This function is responsible for persisting the log event.
 *
 * ---------------------------------------------------------------------------
 * ERROR HANDLING
 * ---------------------------------------------------------------------------
 * Errors inside logging hooks are caught and passed to Mongoose's `next()`
 * handler to prevent application crashes.
 *
 * The plugin intentionally does not throw unhandled exceptions to avoid
 * interrupting database operations.
 *
 * ---------------------------------------------------------------------------
 * PERFORMANCE NOTES
 * ---------------------------------------------------------------------------
 * Logging operations occur **after database operations** using Mongoose
 * `post` middleware.
 *
 * This ensures:
 *
 * - The primary operation completes before logging
 * - Logging does not block the database write
 *
 * For extremely high-throughput systems, it is recommended that the logger
 * implementation forward events to an asynchronous queue.
 *
 * ---------------------------------------------------------------------------
 * SECURITY NOTES
 * ---------------------------------------------------------------------------
 * Avoid logging sensitive data such as:
 *
 * - passwords
 * - authentication tokens
 * - private keys
 * - personally identifiable information
 *
 * Only log information necessary for auditing and diagnostics.
 *
 * ---------------------------------------------------------------------------
 * @example
 * Basic usage with a Content model
 *
 * ```ts
 * import { attachAuditLogging } from "@coderooz/mongo-audit-logger";
 * import { logAudit } from "@/lib/auditLogger";
 *
 * attachAuditLogging(ContentSchema, {
 *   logger: logAudit,
 *   hooks: [
 *     {
 *       hook: "create",
 *       action: "content.created",
 *       getActorId: (doc) => doc.author,
 *       getDetails: (doc) => ({
 *         title: doc.title,
 *         slug: doc.slug
 *       })
 *     }
 *   ]
 * });
 * ```
 *
 * ---------------------------------------------------------------------------
 * @example
 * Logging update operations
 *
 * ```ts
 * attachAuditLogging(UserSchema, {
 *   logger: logAudit,
 *   hooks: [
 *     {
 *       hook: "update",
 *       action: "user.account.updated",
 *       getActorId: (_, query) => query?.getOptions()?.userId,
 *       getDetails: (doc) => ({
 *         userId: doc._id,
 *         email: doc.email
 *       })
 *     }
 *   ]
 * });
 * ```
 *
 * ---------------------------------------------------------------------------
 * @example
 * Logging deletion
 *
 * ```ts
 * attachAuditLogging(PostSchema, {
 *   logger: logAudit,
 *   hooks: [
 *     {
 *       hook: "findOneAndDelete",
 *       action: "post.deleted",
 *       getActorId: (doc) => doc.author,
 *       getDetails: (doc) => ({
 *         postId: doc._id,
 *         title: doc.title
 *       })
 *     }
 *   ]
 * });
 * ```
 *
 * ---------------------------------------------------------------------------
 * @architecture-role
 *
 * This function represents the **automatic audit instrumentation layer**
 * of the logging system.
 *
 * It enables database models to self-report lifecycle events without
 * requiring explicit logging calls throughout business logic.
 */
export function attachAuditLogging<TDoc extends Document>(
  schema: Schema<TDoc>,
  options: AttachAuditLoggingOptions<TDoc>
): void {

    const { logger, hooks } = options;

    hooks.forEach((config) => {
        switch (config.hook) {
            case "create":
                schema.post("save", async function (doc: TDoc, next) {
                    try {
                        if (!doc.isNew) return next();
                        const actorId = config.getActorId?.(doc) ?? doc._id;
                        await logger({ action: config.action, userId: actorId as any, details: config.getDetails?.(doc)});
                        next();
                    } catch (err) {
                        next(err as Error);
                    }
                });
                break;
            
            case "update":
                schema.post("findOneAndUpdate",async function (this: Query<any, TDoc>, doc: TDoc, next) {
                    try {
                        if (!doc) return next();
                        const actorId = config.getActorId?.(doc, this) ?? doc._id;
                        await logger({action: config.action, userId: actorId as any, details: config.getDetails?.(doc, this)});
                        next();
                    } catch (err) {
                        next(err as Error);
                    }
                });
                break;
            
            case "delete":
                
                schema.post("deleteOne" as any, { document: true, query: false }, async function (doc: TDoc, next) {
                    try {
                        const actorId = config.getActorId?.(doc) ?? doc._id;
                        await logger({action: config.action, userId: actorId as any, details: config.getDetails?.(doc) });
                        next();
                    } catch (err) {
                        next(err as Error);
                    }
                });
                break;
            
            case "findOneAndDelete":
                
                schema.post("findOneAndDelete", async function (this: Query<any, TDoc>, doc: TDoc, next) {
                    try {
                        if (!doc) return next();
                        const actorId = config.getActorId?.(doc, this) ?? doc._id;
                        await logger({action: config.action, userId: actorId as any, details: config.getDetails?.(doc, this)});
                        next();
                    } catch (err) {
                        next(err as Error);
                    }
                });
                break;
        }
    });
}