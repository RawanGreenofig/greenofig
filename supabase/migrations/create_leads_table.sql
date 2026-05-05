-- Create leads table for storing targeted customer information from popup discounts
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Discount information
  discount_code TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 25,
  discount_used BOOLEAN DEFAULT FALSE,
  discount_used_at TIMESTAMP WITH TIME ZONE,

  -- Lead tracking
  source TEXT DEFAULT 'popup_discount', -- popup_discount, landing_page, referral, etc.
  status TEXT DEFAULT 'new', -- new, contacted, converted, unsubscribed

  -- User association (if they later sign up)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Additional metadata (JSON)
  metadata JSONB DEFAULT '{}',

  -- Marketing preferences
  email_subscribed BOOLEAN DEFAULT TRUE,
  sms_subscribed BOOLEAN DEFAULT FALSE,

  -- Notes for sales/marketing team
  notes TEXT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Create index on discount_code for validation
CREATE INDEX IF NOT EXISTS idx_leads_discount_code ON leads(discount_code);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Create index on created_at for date-based queries
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert leads (for popup form)
CREATE POLICY "Allow anonymous lead creation" ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert leads
CREATE POLICY "Allow authenticated lead creation" ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only admins can view all leads
CREATE POLICY "Admins can view all leads" ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Only admins can update leads
CREATE POLICY "Admins can update leads" ON leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Only super_admins can delete leads
CREATE POLICY "Super admins can delete leads" ON leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Create a function to validate and mark discount codes as used
CREATE OR REPLACE FUNCTION validate_discount_code(code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  percentage INTEGER,
  lead_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT l.discount_used AS valid,
    l.discount_percentage AS percentage,
    l.email AS lead_email
  FROM leads l
  WHERE l.discount_code = code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark discount as used
CREATE OR REPLACE FUNCTION use_discount_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE leads
  SET
    discount_used = TRUE,
    discount_used_at = NOW(),
    status = 'converted'
  WHERE discount_code = code
    AND discount_used = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Add comment to table
COMMENT ON TABLE leads IS 'Stores targeted customer information from popup discount forms and other lead generation sources';
