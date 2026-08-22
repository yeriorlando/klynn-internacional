-- Migración para soportar periodo de facturación en tenants (Polar.sh billing)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_periodo text DEFAULT 'monthly';
