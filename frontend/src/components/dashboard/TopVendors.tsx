import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Vendor } from '@/types/invoice';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, TrendingUp } from 'lucide-react';

export function TopVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const data = await api.getVendors();
        // Sort by total spend
        const sorted = [...data].sort((a, b) => b.totalSpend - a.totalSpend);
        setVendors(sorted.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxSpend = Math.max(...vendors.map(v => v.totalSpend));

  return (
    <div className="rounded-xl border border-border bg-card card-elevated animate-slide-up">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Top Vendors</h3>
          <p className="text-sm text-muted-foreground">By total spend</p>
        </div>
        <Link to="/vendors">
          <Button variant="ghost" size="sm" className="text-primary">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="p-6 space-y-4">
        {vendors.map((vendor, index) => {
          const percentage = (vendor.totalSpend / maxSpend) * 100;
          return (
            <div key={vendor.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground">{vendor.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    ${vendor.totalSpend.toLocaleString()}
                  </span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
