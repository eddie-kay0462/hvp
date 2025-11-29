import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileDown, Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId) {
        setError("Missing invoice ID");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await (api as any).invoices.getById(invoiceId);
        if (res?.status === 200) {
          setInvoice(res.data);
          setError(null);
        } else {
          setError(res?.msg || "Failed to load invoice");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  const amountText = invoice?.amount != null ? `GH₵${Number(invoice.amount).toFixed(2)}` : "—";
  const createdAt = invoice?.created_at ? new Date(invoice.created_at).toLocaleDateString() : "—";
  const serviceTitle = invoice?.service?.title || "Service";
  const buyerName = invoice?.buyer_profile
    ? `${invoice.buyer_profile.first_name || ""} ${invoice.buyer_profile.last_name || ""}`.trim() || "Buyer"
    : "Buyer";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
              <CardTitle>Invoice</CardTitle>
              <div className="text-sm text-muted-foreground">Hustle Village</div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Loading invoice...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-destructive mb-4">{error}</p>
                  <Button onClick={() => navigate("/my-bookings")}>My Bookings</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="text-lg font-semibold">{invoice?.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="text-lg font-semibold">{createdAt}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-lg font-semibold">{amountText}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Billed To</p>
                      <p className="font-semibold">{buyerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paystack Reference</p>
                      <p className="font-semibold">{invoice?.paystack_reference || "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 p-3 bg-muted text-xs font-medium">
                      <div className="col-span-8">Description</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-2 text-right">Amount</div>
                    </div>
                    <div className="grid grid-cols-12 p-3">
                      <div className="col-span-8">
                        <div className="font-medium">{serviceTitle}</div>
                        {invoice?.service?.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {invoice.service.description}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-right">1</div>
                      <div className="col-span-2 text-right">{amountText}</div>
                    </div>
                    <div className="grid grid-cols-12 p-3 border-t">
                      <div className="col-span-10 text-right font-medium">Total</div>
                      <div className="col-span-2 text-right font-semibold">{amountText}</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <Button variant="outline" onClick={() => window.print()}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Print / Download
                    </Button>
                    <Button onClick={() => navigate("/my-bookings")}>My Bookings</Button>
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


