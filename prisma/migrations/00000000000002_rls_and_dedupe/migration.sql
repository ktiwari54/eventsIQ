-- Deduplicate leads by (orgId, email) where an email is present.
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_orgId_email_key"
  ON "Lead" ("orgId", "email") WHERE "email" IS NOT NULL;

-- Row-Level Security for multi-tenant isolation.
-- The app sets `app.current_org` per request (see lib/tenant.ts withTenant()).
-- nullif(setting, '') treats an unset OR reset GUC (set_config leaves '') as
-- permissive, so worker/seed/migrations and org-signup paths are never broken;
-- when the GUC holds an org id, only that org's rows are visible/insertable.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Event','Lead','Vendor','ZohoConfig','ZohoSyncLog',
    'Notification','AuditLog','ReportSchedule','ReportRun'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (nullif(current_setting('app.current_org', true), '') IS NULL
             OR "orgId" = nullif(current_setting('app.current_org', true), ''))
      WITH CHECK (nullif(current_setting('app.current_org', true), '') IS NULL
             OR "orgId" = nullif(current_setting('app.current_org', true), ''))
    $f$, t);
  END LOOP;

  -- Organization is keyed by its own id.
  EXECUTE 'ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY';
  EXECUTE $f$
    CREATE POLICY tenant_isolation ON "Organization"
    USING (nullif(current_setting('app.current_org', true), '') IS NULL
           OR "id" = nullif(current_setting('app.current_org', true), ''))
    WITH CHECK (nullif(current_setting('app.current_org', true), '') IS NULL
           OR "id" = nullif(current_setting('app.current_org', true), ''))
  $f$;
END $$;
