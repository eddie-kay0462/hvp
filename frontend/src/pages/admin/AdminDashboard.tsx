import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type BackendEnvelope } from '@/lib/api';
import { Navbar } from '@/components/landing/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Wallet, Banknote, Gavel, ChevronRight } from 'lucide-react';

type SectionKey = 'services' | 'momo' | 'payouts' | 'disputes';

interface Section {
  key: SectionKey;
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardCheck;
  /** Label for the count badge, e.g. "3 pending" */
  countLabel: (n: number) => string;
}

const SECTIONS: Section[] = [
  {
    key: 'services',
    title: 'Service approvals',
    description: 'Review services vendors have submitted for listing.',
    href: '/admin/services/pending',
    icon: ClipboardCheck,
    countLabel: (n) => `${n} awaiting review`,
  },
  {
    key: 'momo',
    title: 'MoMo payments',
    description: 'Verify buyer payment receipts and mark bookings paid.',
    href: '/admin/payments/momo',
    icon: Wallet,
    countLabel: (n) => `${n} to verify`,
  },
  {
    key: 'payouts',
    title: 'Payout queue',
    description: 'Send money to vendors for completed bookings and record it.',
    href: '/admin/payouts/pending',
    icon: Banknote,
    countLabel: (n) => `${n} to pay`,
  },
  {
    key: 'disputes',
    title: 'Disputes',
    description: 'Resolve disputes raised by buyers or vendors.',
    href: '/admin/disputes',
    icon: Gavel,
    countLabel: (n) => `${n} open`,
  },
];

/** Counts are a convenience, never a reason to fail the page. */
type Counts = Partial<Record<SectionKey, number>>;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const lengthOf = (res: PromiseSettledResult<unknown>): number | undefined => {
      if (res.status !== 'fulfilled') return undefined;
      const data = (res.value as BackendEnvelope<unknown[]>)?.data;
      return Array.isArray(data) ? data.length : undefined;
    };

    const load = async () => {
      // Settled, not all: one failing endpoint must not blank the whole board.
      const [services, momo, payouts, disputes] = await Promise.allSettled([
        api.admin.getPendingServices(),
        api.admin.getPendingMomoPayments(),
        api.admin.getPendingPayouts(),
        api.disputes.getAll('open'),
      ]);

      if (cancelled) return;

      setCounts({
        services: lengthOf(services),
        momo: lengthOf(momo),
        payouts: lengthOf(payouts),
        disputes: lengthOf(disputes),
      });
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground mt-1">
            Everything that needs a decision from the Hustle Village team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const count = counts[section.key];

            return (
              <Card
                key={section.key}
                role="link"
                tabIndex={0}
                onClick={() => navigate(section.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(section.href);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <CardDescription className="pt-1">{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-28" />
                  ) : count === undefined ? (
                    // The endpoint failed — say so rather than implying zero work
                    <span className="text-sm text-muted-foreground">Count unavailable</span>
                  ) : (
                    <Badge variant={count > 0 ? 'default' : 'secondary'}>
                      {section.countLabel(count)}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
