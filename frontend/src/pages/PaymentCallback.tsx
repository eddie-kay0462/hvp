import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import { api } from "@/lib/api";

interface InvoiceData {
  invoice_number: string;
  amount: number | null;
  service?: { title?: string };
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const verifyAndFetch = useCallback(async (ref: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await (api as any).payments.verify(ref);

      if (result?.status === 200 && result?.data?.success) {
        const invId: string | null = result.data.invoice_id || null;
        setInvoiceId(invId);

        if (invId) {
          try {
            const inv = await (api as any).invoices.getById(invId);
            if (inv?.status === 200) setInvoice(inv.data);
          } catch {
            // Invoice fetch failing is non-fatal — payment was still recorded
          }
        }
      } else {
        setError(result?.msg || "Payment verification failed.");
      }
    } catch (e: any) {
      setError(e?.message || "Payment verification failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Paystack may send ?reference or ?trxref
    const ref = searchParams.get("reference") || searchParams.get("trxref");
    setReference(ref);
    if (!ref) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }
    verifyAndFetch(ref);
  }, [searchParams, verifyAndFetch]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Verifying your payment...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center text-center py-10">
                  <XCircle className="h-10 w-10 text-destructive mb-2" />
                  <p className="font-medium mb-1">Payment Failed</p>
                  <p className="text-sm text-muted-foreground mb-2">{error}</p>
                  {reference && (
                    <p className="text-xs text-muted-foreground mb-6">
                      Reference: <span className="text-foreground font-mono">{reference}</span>
                    </p>
                  )}
                  <div className="flex gap-3">
                    {reference && (
                      <Button onClick={() => verifyAndFetch(reference)}>
                        Retry verification
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate("/my-bookings")}>
                      My Bookings
                    </Button>
                    <Button onClick={() => window.location.replace("/")}>Go Home</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-10">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
                  <p className="font-medium mb-1">Payment Successful</p>
                  {invoice ? (
                    <div className="text-sm text-muted-foreground mb-6">
                      <div>Invoice: <span className="font-medium text-foreground">{invoice.invoice_number}</span></div>
                      {invoice?.service?.title && (
                        <div>Service: <span className="font-medium text-foreground">{invoice.service.title}</span></div>
                      )}
                      {invoice?.amount != null && (
                        <div>Amount: <span className="font-medium text-foreground">GH₵{Number(invoice.amount).toFixed(2)}</span></div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">
                      Your payment has been recorded.
                    </p>
                  )}
                  <div className="flex gap-3">
                    {invoiceId && (
                      <Button onClick={() => navigate(`/invoice/${invoiceId}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Invoice
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate("/my-bookings")}>
                      My Bookings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
