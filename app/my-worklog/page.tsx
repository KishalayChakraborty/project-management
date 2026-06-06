'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/hooks/organization';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MyWorklogPage() {
  const { data: session } = useSession();
  const { data: organizations } = useOrganizations();

  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Work Logs</h1>
          <p className="text-gray-600">Track and view all your work sessions</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Work Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Organization</label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedOrg && (
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Projects would be fetched based on selectedOrg */}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Logs Hierarchy View */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {selectedOrg ? (
                <div className="text-center py-8 text-gray-500">
                  Work logs for selected organization will appear here
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select an organization to view work logs
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
