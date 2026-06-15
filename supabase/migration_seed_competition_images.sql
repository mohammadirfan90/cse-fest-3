-- ====================================================================
-- MIGRATION: Populate Competition Cover & Banner Images
-- Run this script in the Supabase SQL Editor.
-- ====================================================================

-- 1. Software Showcase image mapping
UPDATE public.competitions
SET 
  cover_image_url = '/software-showcase-logo.png',
  banner_image_url = '/software-showcase-logo.png'
WHERE id = 'e0bb66f8-45e0-4c12-a1f7-418f773b069d' OR short_name = 'SOFT';

-- 2. IoT Showcase image mapping
UPDATE public.competitions
SET 
  cover_image_url = '/iot-showcase-logo.png',
  banner_image_url = '/iot-showcase-logo.png'
WHERE id = '318a4a58-89c0-449e-ba60-318df883ba58' OR short_name = 'IoT';

-- 3. Idea Showcase image mapping
UPDATE public.competitions
SET 
  cover_image_url = '/idea-showcase-logo.png',
  banner_image_url = '/idea-showcase-logo.png'
WHERE id = 'dfec0659-6308-42e3-aaf6-dfdc85eb2cfa' OR short_name = 'IDEA';
