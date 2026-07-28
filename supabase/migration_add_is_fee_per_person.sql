-- Migration: Add is_fee_per_person column to competitions table
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS is_fee_per_person BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing Idea Showcase Contest to set is_fee_per_person = true
UPDATE public.competitions 
SET is_fee_per_person = TRUE 
WHERE id = 'cc04f8b0-acc7-442e-b315-4b8bfb550764' 
   OR name = 'Idea Showcase Contest';
