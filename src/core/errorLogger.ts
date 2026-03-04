// src/core/errorLogger.ts

import { AuditLogger } from "../types/Logging";

export interface ErrorLogPayload {
    error: unknown;
    action?:string;
    user?: unknown;
    context?: string;
    metadata?: Record<string, unknown>;
}

/**
 * createErrorLogger
 * ---------------------------------------------------------------------------
 * Factory function that creates a reusable structured error logging utility.
 *
 * This helper wraps an existing `AuditLogger` implementation and produces
 * a dedicated `ErrorLogging` function that can be used across the application
 * to record runtime failures, system issues, and unexpected exceptions.
 *
 * The purpose of this abstraction is to:
 *
 * - Centralize error logging behavior
 * - Normalize error objects into structured JSON
 * - Prevent application crashes caused by logging failures
 * - Allow flexible storage backends (MongoDB, queues, external services)
 * - Integrate seamlessly with audit logging infrastructure
 *
 * Instead of writing database logic directly inside application code,
 * the application provides a logger implementation while this utility
 * standardizes how errors are recorded.
 *
 * ---------------------------------------------------------------------------
 * DESIGN PRINCIPLES
 * ---------------------------------------------------------------------------
 * - Framework agnostic (works with Next.js, Express, NestJS, etc.)
 * - Storage agnostic (MongoDB, Kafka, Elasticsearch, etc.)
 * - Non-blocking (never throws intentionally)
 * - Structured JSON logging
 * - Portable across projects
 *
 * ---------------------------------------------------------------------------
 * @param logger
 * A function implementing the `AuditLogger` contract.
 *
 * The logger is responsible for persisting or transmitting audit events.
 * This may write to:
 *
 * - MongoDB
 * - Message queues
 * - Logging services
 * - Observability platforms
 *
 * The logger receives a normalized `AuditEvent`.
 *
 * ---------------------------------------------------------------------------
 * @returns
 * Returns a reusable async function `ErrorLogging` which logs structured
 * error events using the provided logger implementation.
 *
 * ---------------------------------------------------------------------------
 * ErrorLogging Function Parameters
 * ---------------------------------------------------------------------------
 * @param error
 * The original error object or unknown value that triggered the failure.
 *
 * Accepts:
 * - `Error` instances
 * - strings
 * - unknown values
 *
 * The function normalizes this input into a JSON-safe structure containing:
 *
 * - `message`
 * - `stack`
 * - `name`
 *
 * If the value is not an `Error`, it will be converted into a string message.
 *
 * ---------------------------------------------------------------------------
 * @param action
 * Optional semantic action identifier.
 *
 * Defaults to:
 *
 * `"system.error"`
 *
 * This value should represent the category of failure or system event.
 *
 * Example values:
 *
 * - `"system.error"`
 * - `"auth.login.failed"`
 * - `"api.external.failure"`
 *
 * ---------------------------------------------------------------------------
 * @param user
 * Optional identifier representing the user or system actor associated
 * with the error.
 *
 * Accepts:
 *
 * - MongoDB ObjectId
 * - string identifier
 * - null / undefined
 *
 * Useful for tracing errors back to authenticated users.
 *
 * ---------------------------------------------------------------------------
 * @param context
 * Optional string describing where the error occurred.
 *
 * Recommended examples:
 *
 * - `"createContent"`
 * - `"updateUserProfile"`
 * - `"stripeWebhookHandler"`
 * - `"background-indexing-job"`
 *
 * This greatly improves debugging and observability.
 *
 * ---------------------------------------------------------------------------
 * @param metadata
 * Optional structured payload containing additional diagnostic information.
 *
 * Must be JSON-serializable.
 *
 * Examples:
 *
 * - request parameters
 * - identifiers
 * - external API response data
 * - environment details
 *
 * ---------------------------------------------------------------------------
 * ERROR NORMALIZATION
 * ---------------------------------------------------------------------------
 * The function converts thrown values into a structured format:
 *
 * If `error instanceof Error`:
 *
 * {
 *   message: error.message
 *   stack: error.stack
 *   name: error.name
 * }
 *
 * Otherwise:
 *
 * {
 *   message: String(error)
 * }
 *
 * ---------------------------------------------------------------------------
 * BEHAVIOR
 * ---------------------------------------------------------------------------
 * - Logging failures are caught internally
 * - The function intentionally does **not throw**
 * - This prevents logging from breaking the main application workflow
 *
 * If the logger itself fails, the failure is printed to console.
 *
 * ---------------------------------------------------------------------------
 * SECURITY NOTES
 * ---------------------------------------------------------------------------
 * Avoid logging sensitive information such as:
 *
 * - passwords
 * - tokens
 * - API secrets
 * - personal data
 *
 * Only include necessary diagnostic metadata.
 *
 * ---------------------------------------------------------------------------
 * @example
 * Creating an error logger for MongoDB storage
 *
 * ```ts
 * import { createErrorLogger } from "@coderooz/mongo-audit-logger";
 * import { logAudit } from "@/lib/auditLogger";
 *
 * export const ErrorLogging = createErrorLogger(logAudit);
 * ```
 *
 * ---------------------------------------------------------------------------
 * @example
 * Using inside a server action
 *
 * ```ts
 * try {
 *   await updateContent(contentId, data);
 * } catch (error) {
 *   await ErrorLogging({
 *     error,
 *     user: session.user.id,
 *     context: "updateContent",
 *     metadata: { contentId }
 *   });
 * }
 * ```
 *
 * ---------------------------------------------------------------------------
 * @example
 * Logging external API failures
 *
 * ```ts
 * try {
 *   await submitToIndexNow(url);
 * } catch (error) {
 *   await ErrorLogging({
 *     error,
 *     context: "IndexNowSubmission",
 *     metadata: { url }
 *   });
 * }
 * ```
 *
 * ---------------------------------------------------------------------------
 * @architecture-role
 *
 * This function represents the **error observability layer**
 * of the audit logging system.
 *
 * It standardizes how runtime errors are recorded across
 * the entire application ecosystem.
 */
export function createErrorLogger(logger: AuditLogger) {
    return async function ErrorLogging({
        error, action="system.error", user, context, metadata = {}
    }: ErrorLogPayload) {
        try {
            const normalizedError = error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : {message: String(error)};

            await logger({
                action,
                userId: user as any,
                details: {
                    context: context ?? "unknown",
                    ...normalizedError,
                    ...metadata,
                }
            })
        } catch (err){
            console.log("Error Logging Failed:", err);
        }
    };
}