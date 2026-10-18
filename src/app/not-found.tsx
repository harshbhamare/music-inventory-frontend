import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <BrandLogo size="lg" variant="badge" className="shadow-md mb-2" />
      <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md">
        The requested Stereobliss inventory resource could not be found or has been moved.
      </p>
      <Link href="/dashboard">
        <Button variant="default" className="font-bold gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
