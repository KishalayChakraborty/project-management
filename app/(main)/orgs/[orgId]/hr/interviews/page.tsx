'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InterviewsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Interviews</h1>
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Schedule and manage interviews from applicant detail pages</p>
        </CardContent>
      </Card>
    </div>
  );
}
