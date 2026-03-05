import { redirect } from 'next/navigation';

// Password resets are now handled by Privy's authentication flow.
export default function ResetPasswordPage() {
  redirect('/signin');
}
