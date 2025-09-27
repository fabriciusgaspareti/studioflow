import Link from 'next/link';
import { Music4 } from 'lucide-react';
import { AuthButtons } from './auth-buttons';
import { ThemeToggle } from './theme-toggle';
import { AdminDashboardButton } from './admin-dashboard-button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Music4 className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold sm:inline-block">
            StudioFlow
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <AdminDashboardButton />
           <ThemeToggle />
           <AuthButtons />
        </div>
      </div>
    </header>
  );
}
