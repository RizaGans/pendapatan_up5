import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from '../components/dashboard-client';
import { getSessionUser, SESSION_COOKIE } from '../lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  return <DashboardClient />;
}
