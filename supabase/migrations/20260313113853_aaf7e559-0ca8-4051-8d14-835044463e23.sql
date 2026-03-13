
-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'co_worker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'co_worker_data_entry';
