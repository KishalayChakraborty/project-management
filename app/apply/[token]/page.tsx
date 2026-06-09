'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { ApplicationForm } from '@/components/hr/ApplicationForm';

export default function ApplyPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();
  const [adInfo, setAdInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchAdInfo = async () => {
      try {
        const response = await axios.get(`/api/apply/${token}`);
        setAdInfo(response.data.data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Job advertisement not found',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAdInfo();
  }, [token, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading job advertisement...</p>
        </div>
      </div>
    );
  }

  if (!adInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Job Not Found</h1>
          <p className="text-muted-foreground">This job advertisement is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{adInfo.title}</h1>
          {adInfo.location && <p className="text-muted-foreground">{adInfo.location}</p>}
          {adInfo.salaryRangeMin && adInfo.salaryRangeMax && (
            <p className="text-sm text-muted-foreground mt-2">
              Salary: ₹ {adInfo.salaryRangeMin.toLocaleString('en-IN')} - ₹ {adInfo.salaryRangeMax.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        <ApplicationForm submitUrl={`/api/apply/${token}`} />
      </div>
    </div>
  );
}
