import { redirect } from 'next/navigation';

export default async function HRPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/hr/dashboard`);
}
