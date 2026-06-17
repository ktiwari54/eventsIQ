-- Add Zoho tracking fields to SalesOrder and Invoice
ALTER TABLE "SalesOrder" ADD COLUMN "zohoId" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "zohoSyncedAt" TIMESTAMP(3);
CREATE INDEX "SalesOrder_zohoId_idx" ON "SalesOrder"("zohoId");

ALTER TABLE "Invoice" ADD COLUMN "zohoId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "zohoSyncedAt" TIMESTAMP(3);
CREATE INDEX "Invoice_zohoId_idx" ON "Invoice"("zohoId");
