import { supabase, supabaseAdmin } from '../config/supabase.js';

export async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const db = supabaseAdmin || supabase;
  const { data: invoices, error } = await db
    .from('invoices')
    .select('invoice_number, created_at')
    .ilike('invoice_number', `HV-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest invoice number:', error);
  }

  let nextSeq = 1;
  if (invoices && invoices.length > 0) {
    const last = invoices[0].invoice_number;
    const parts = last.split('-');
    const seqStr = parts[2] || '0000';
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }
  const padded = String(nextSeq).padStart(4, '0');
  return `HV-${year}-${padded}`;
}
