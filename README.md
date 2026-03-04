# MongoDB Audit Logging Framework

A lightweight, portable audit logging framework for **MongoDB + Mongoose applications**.

This library provides a reusable system for **tracking database actions, system events, and runtime errors** using structured audit logs.

It is designed to work across **any Node.js / React / Next.js project** that uses MongoDB.

---

# Features

* Automatic audit logging using **Mongoose middleware**
* Structured event logging with **semantic action identifiers**
* Portable logging architecture (works in any project)
* Centralized **error logging utility**
* Flexible metadata support
* Optional **user attribution**
* Resolution status for investigation workflows
* Fully **TypeScript typed**

---

# Architecture

```txt
Application Code
       │
       │  (Model Lifecycle)
       ▼
attachAuditLogging()
       │
       ▼
AuditEvent
       │
       ▼
AuditLogger (custom implementation)
       │
       ▼
AuditLog Model
       │
       ▼
MongoDB
```

---

# Installation

Currently this project is intended to be used as a **Git repository dependency**.

Clone or copy the module into your project:

```bash
git clone https://github.com/coderooz/Mongoose-Structured-Audit-Logger.git
```

Or copy the source files into your project.

Later it can be published as an **npm package**.

---

# Core Concepts

## Audit Event

Every action in the system is represented as an **AuditEvent**.

Example:

```ts
{
  action: "content.created",
  userId: "64f123abc...",
  details: {
    contentId: "...",
    title: "My Article"
  }
}
```

---

# Audit Logger

The system does **not force a specific storage mechanism**.

You provide a logger implementation.

Example:

```ts
import AuditLog from "@/models/AuditLog";
import { AuditLogger } from "@/types/logging";

export const logAudit: AuditLogger = async (event) => {
  await AuditLog.create({
    action: event.action,
    user: event.userId,
    details: event.details ?? {}
  });
};
```

---

# Using the Mongoose Plugin

Attach automatic logging to any schema.

```ts
import { attachAuditLogging } from "@/lib/attachAuditLogging";
import { logAudit } from "@/lib/auditLogger";

attachAuditLogging(ContentSchema, {
  logger: logAudit,
  hooks: [
    {
      hook: "create",
      action: "content.created",
      getActorId: (doc) => doc.author,
      getDetails: (doc) => ({
        title: doc.title,
        slug: doc.slug
      })
    }
  ]
});
```

---

# Supported Lifecycle Hooks

| Hook             | Trigger                  |
| ---------------- | ------------------------ |
| create           | After document creation  |
| update           | After `findOneAndUpdate` |
| delete           | After `deleteOne`        |
| findOneAndDelete | After `findOneAndDelete` |

---

# Error Logging

The framework also provides a helper for structured error logging.

Create a logger:

```ts
import { createErrorLogger } from "@/lib/createErrorLogger";
import { logAudit } from "@/lib/auditLogger";

export const ErrorLogging = createErrorLogger(logAudit);
```

Usage:

```ts
try {
  await updateContent(id, data);
} catch (error) {
  await ErrorLogging({
    error,
    user: session.user.id,
    context: "updateContent",
    metadata: { contentId: id }
  });
}
```

---

# Audit Log Model

Example Mongoose model used for persistence:

```ts
const AuditLogSchema = new Schema({
  action: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, default: null },
  details: { type: Object, default: {} },
  resolution: {
    type: String,
    enum: ["unresolved","resolved","under-review"],
    default: "unresolved"
  }
},{
  timestamps: { createdAt: true, updatedAt: false }
});
```

---

# Log Resolution Status

Audit logs can include a **resolution state** for operational tracking.

Available states:

```
unresolved
resolved
under-review
```

These are useful for:

* debugging
* security monitoring
* incident investigation

---

# Example Logged Event

Example document stored in MongoDB:

```
{
  action: "content.updated",
  user: ObjectId("64f..."),
  details: {
    contentId: "abc123",
    title: "New Title"
  },
  resolution: "unresolved",
  createdAt: "2026-03-04T12:00:00Z"
}
```

---

# Design Philosophy

This library follows several design principles:

* **Decoupled logging** (storage implementation is injected)
* **Structured events** rather than raw strings
* **Reusable architecture**
* **Non-blocking logging**
* **Type-safe configuration**

---

# Security Considerations

Avoid logging sensitive data such as:

* passwords
* authentication tokens
* API keys
* private credentials

Only include necessary debugging metadata.

---

# Future Improvements

Potential enhancements include:

* global mongoose plugin support
* async queue logging
* audit log indexing helpers
* event streaming integration
* analytics dashboards

---

# License

[MIT License](LICENSE)

---

# Author

[Ranit Saha (Coderooz)](https://www.coderooz.in)

Full-stack developer focused on building scalable web infrastructure.
