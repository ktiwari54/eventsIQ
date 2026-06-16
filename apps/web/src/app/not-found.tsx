import Link from "next/link";

// Custom 404 page.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <div className="text-5xl font-extrabold text-accent mb-2">404</div>
        <h1 className="text-lg font-bold mb-2">Page not found</h1>
        <p className="text-muted text-sm mb-4">The page you’re looking for doesn’t exist or has moved.</p>
        <Link className="btn btn-primary" href="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
