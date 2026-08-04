-- Payments table for tracking Xendit transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  session_id UUID REFERENCES sessions(id),
  tournament_id UUID REFERENCES tournaments(id),
  booking_id UUID REFERENCES court_bookings(id),
  xendit_invoice_id TEXT,
  xendit_invoice_url TEXT,
  amount NUMERIC NOT NULL,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  payment_method TEXT, -- gcash, maya, etc
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, expired, failed
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payments_profile ON payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_xendit ON payments(xendit_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS: users can read their own payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE
  USING (true);
