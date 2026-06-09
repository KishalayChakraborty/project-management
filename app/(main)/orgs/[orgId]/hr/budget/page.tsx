'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useHiringBudgets, useCreateBudget } from '@/hooks/hr/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function BudgetPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const { data: budgetsData } = useHiringBudgets(orgId, currentYear);
  const createMutation = useCreateBudget(orgId);

  const budgets = budgetsData?.data || [];

  const handleCreateBudget = async () => {
    try {
      await createMutation.mutateAsync({
        fiscalYear: currentYear,
        budgetedPositions: parseInt(formData.budgetedPositions || '0'),
        allocatedAmount: parseInt(formData.allocatedAmount || '0'),
        currency: formData.currency || 'USD',
        department: formData.department || '',
        notes: formData.notes || '',
      });
      toast({ title: 'Budget created', description: 'Hiring budget has been created' });
      setIsCreateOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create budget',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hiring Budget</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No budgets created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget: any) => (
            <Card key={budget.id}>
              <CardHeader>
                <CardTitle className="text-lg">{budget.department || 'General'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Budgeted Positions</div>
                    <div className="text-2xl font-bold">{budget.budgetedPositions}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Filled Positions</div>
                    <div className="text-2xl font-bold">{budget.filledPositions}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Allocated Amount</div>
                    <div className="text-2xl font-bold">
                      {budget.currency} {budget.allocatedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Spent Amount</div>
                    <div className="text-2xl font-bold">
                      {budget.currency} {budget.spentAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
                {budget.notes && (
                  <p className="text-sm text-muted-foreground mt-4">{budget.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Hiring Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Department</label>
              <input
                type="text"
                placeholder="Engineering, Sales, etc."
                value={formData.department || ''}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Budgeted Positions</label>
              <input
                type="number"
                placeholder="5"
                value={formData.budgetedPositions || ''}
                onChange={(e) => setFormData({...formData, budgetedPositions: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Allocated Amount</label>
              <input
                type="number"
                placeholder="500000"
                value={formData.allocatedAmount || ''}
                onChange={(e) => setFormData({...formData, allocatedAmount: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                placeholder="Any additional notes..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                rows={3}
              />
            </div>
            <Button onClick={handleCreateBudget} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
