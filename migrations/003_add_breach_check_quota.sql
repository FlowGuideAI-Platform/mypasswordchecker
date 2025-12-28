-- Migration: Add breach_check_requests quota tracking
-- Date: November 6, 2025
-- Purpose: Add quota tracking for password breach checking feature (HIBP k-anonymity)

-- Add breach_check_requests column to usage_logs table
-- This tracks monthly breach check API calls per customer
ALTER TABLE usage_logs ADD COLUMN breach_check_requests INTEGER DEFAULT 0;

-- Note: Quota limits by tier (defined in application code):
-- Free API: 50 breach checks/month
-- Standard: 2,500 breach checks/month
-- Basic Quantum: 10,000 breach checks/month
-- Standard Quantum: 25,000 breach checks/month
-- Large Quantum: 50,000 breach checks/month
-- Super Quantum: 200,000 breach checks/month
