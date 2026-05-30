-- Plaid sync fixups
-- 1. Add unique constraints needed for ON CONFLICT
-- 2. plaid_items.account_count was named differently — check actual column

-- Add unique on plaid_account_id (one balance row per Plaid account)
ALTER TABLE finance_personal.balances
  ADD CONSTRAINT balances_plaid_account_id_key UNIQUE (plaid_account_id);

-- Add unique on plaid_transaction_id
ALTER TABLE finance_personal.transactions
  ADD CONSTRAINT transactions_plaid_transaction_id_key UNIQUE (plaid_transaction_id);

-- Same for the TH-side finance schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='balances' AND column_name='plaid_account_id') THEN
    BEGIN
      ALTER TABLE finance.balances ADD CONSTRAINT balances_plaid_account_id_key UNIQUE (plaid_account_id);
    EXCEPTION WHEN duplicate_table THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='transactions' AND column_name='plaid_transaction_id') THEN
    BEGIN
      ALTER TABLE finance.transactions ADD CONSTRAINT transactions_plaid_transaction_id_key UNIQUE (plaid_transaction_id);
    EXCEPTION WHEN duplicate_table THEN NULL; END;
  END IF;
END $$;
