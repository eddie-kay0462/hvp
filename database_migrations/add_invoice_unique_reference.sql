-- Prevent duplicate invoices for the same Paystack reference.
--
-- Step 1: Show what duplicates exist (run this SELECT first to review before deleting).
-- SELECT paystack_reference, COUNT(*) as cnt, array_agg(id ORDER BY created_at) as ids
-- FROM public.invoices
-- WHERE paystack_reference IS NOT NULL
-- GROUP BY paystack_reference
-- HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate invoices — keeps the EARLIEST invoice per reference,
-- removes all later duplicates. Wrapped in a transaction so it's fully atomic.
BEGIN;

DELETE FROM public.invoices
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      paystack_reference,
      ROW_NUMBER() OVER (
        PARTITION BY paystack_reference
        ORDER BY created_at ASC, id ASC   -- keep the first one created
      ) AS rn
    FROM public.invoices
    WHERE paystack_reference IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add the unique constraint now that duplicates are gone.
-- NULL values are exempt — multiple invoices without a reference are still allowed.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_paystack_reference_unique UNIQUE (paystack_reference);

COMMIT;
