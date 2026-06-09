'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalaryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Salary & Offers</h1>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Manage salary structures and offers for applicants from their detail pages</p>
        </CardContent>
      </Card>
    </div>
  );
}
