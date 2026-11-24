# Design

## Context

The architecture describes the scheduled worker on pages 10 and 14. Materialization and finalization already use the shared PlayerState lock.

## Goals / Non-Goals

Close elapsed dates in order and resume after interruption. Keep session cleanup separate. The commands can be scheduled by the selected deployment provider.

## Decisions

- Page eligible owners by UUID. An owner is eligible if they have an overdue unclosed plan or no current plan covering the database clock.
- Process at most 30 dates per owner per invocation. Under the PlayerState lock, take the oldest overdue plan or materialize the next eligible local day. Materialize and close an elapsed date in one transaction. Opening the current date uses one slot.
- Reuse the finalization writer. The close event, PlayerState checkpoint, and plan closure commit together. Use committed checkpoints to resume without replaying closed dates.
- Delete at most 500 expired sessions per statement. Use one database clock cutoff per run, skip locked rows, and stop after 20 statements. Subsequent invocations handle remaining rows.
- Each command owns its database client, structured result, and exit code. Run finalization hourly through an external scheduler.

- Expose liveness independent of database connections and use a bounded transactional query for readiness. Drain existing HTTP requests before disconnecting Prisma.
- Emit request logs from a fixed field list. Derive actor pseudonyms with a domain-separated HMAC and emit route templates rather than raw URLs.
- Terminate TLS at ingress, forward only the required trusted headers, and use a separate database role for migrations.
- Seed the acceptance dataset and measure warm localhost HTTP requests against disposable PostgreSQL. Restore a logical backup into a second empty database and compare ledger and state reconciliation.

## Risks / Trade-offs

Long absences may take more than one invocation. Respect the existing time-zone, lock, and unique award rules.

## Migration Plan

Use the existing tables and indexes.
