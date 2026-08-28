# Database migrations

Vanta uses **Prisma Migrate** as the source of truth for schema
migrations. Prisma requires its migration history to live alongside
the schema file it was generated from, so the actual, applied
migration files are generated into:

```
services/api/prisma/migrations/
```

when you run:

```
pnpm db:migrate
```

This top-level `database/migrations/` directory is kept for any future
hand-written data-migration scripts that aren't pure schema changes
(e.g. backfills), which Prisma Migrate doesn't model well on its own.
It is currently empty — no data migrations exist yet.

If you edit `services/api/prisma/schema.prisma`, always regenerate via
`prisma migrate dev` rather than hand-editing SQL here — this folder
is documentation, not the execution path.
