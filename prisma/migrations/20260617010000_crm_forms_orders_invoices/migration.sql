-- CRM configs
CREATE TABLE "SalesforceConfig" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "clientId" TEXT NOT NULL,
  "clientSecret" TEXT NOT NULL, "instanceUrl" TEXT, "accessToken" TEXT,
  "refreshToken" TEXT, "expiresAt" TIMESTAMP(3), "connected" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesforceConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesforceConfig_orgId_key" ON "SalesforceConfig"("orgId");
ALTER TABLE "SalesforceConfig" ADD CONSTRAINT "SalesforceConfig_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DynamicsConfig" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL, "clientSecret" TEXT NOT NULL, "resourceUrl" TEXT,
  "accessToken" TEXT, "refreshToken" TEXT, "expiresAt" TIMESTAMP(3),
  "connected" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DynamicsConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DynamicsConfig_orgId_key" ON "DynamicsConfig"("orgId");
ALTER TABLE "DynamicsConfig" ADD CONSTRAINT "DynamicsConfig_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Forms
CREATE TYPE "FormFieldType" AS ENUM ('TEXT','EMAIL','PHONE','NUMBER','TEXTAREA','SELECT','CHECKBOX');

CREATE TABLE "Form" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "eventId" TEXT,
  "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");
CREATE INDEX "Form_orgId_idx" ON "Form"("orgId");
ALTER TABLE "Form" ADD CONSTRAINT "Form_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Form" ADD CONSTRAINT "Form_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FormField" (
  "id" TEXT NOT NULL, "formId" TEXT NOT NULL, "label" TEXT NOT NULL,
  "fieldType" "FormFieldType" NOT NULL DEFAULT 'TEXT', "placeholder" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false, "options" JSONB, "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL, "formId" TEXT NOT NULL, "data" JSONB NOT NULL,
  "leadId" TEXT, "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sales Orders
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT','CONFIRMED','PROCESSING','DELIVERED','CANCELLED');

CREATE TABLE "SalesOrder" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "leadId" TEXT, "eventId" TEXT,
  "orderNumber" TEXT NOT NULL, "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0, "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0, "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "SalesOrder"("orderNumber");
CREATE INDEX "SalesOrder_orgId_status_idx" ON "SalesOrder"("orgId", "status");
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SalesOrderItem" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(14,2) NOT NULL, "total" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalesOrderItem_orderId_idx" ON "SalesOrderItem"("orderId");
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoices
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','SENT','PAID','OVERDUE','CANCELLED');

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "salesOrderId" TEXT,
  "invoiceNumber" TEXT NOT NULL, "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "clientName" TEXT NOT NULL, "clientEmail" TEXT, "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0, "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0, "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3), "paidAt" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_salesOrderId_key" ON "Invoice"("salesOrderId");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_orgId_status_idx" ON "Invoice"("orgId", "status");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_salesOrderId_fkey"
  FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvoiceItem" (
  "id" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(14,2) NOT NULL, "total" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
