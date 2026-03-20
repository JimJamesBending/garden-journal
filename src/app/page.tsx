import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged in users go straight to their garden
  if (user) {
    redirect("/garden");
  }

  // Landing page for new/returning visitors
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        {/* Big leaf emoji as visual anchor */}
        <div className="text-6xl mb-6">🌱</div>

        <h1 className="text-heading-lg text-garden-text mb-4">
          Your Garden Starts Here
        </h1>

        <p className="text-body text-garden-textMuted mb-10 max-w-md mx-auto">
          Snap a photo of your plant or seed packet and get instant care advice
        </p>

        {/* Three big CTAs */}
        <div className="space-y-3 mb-8">
          <Link
            href="/try?mode=camera"
            className="flex items-center justify-center gap-3 w-full h-16 rounded-xl bg-garden-greenBright text-white text-button transition-colors hover:bg-garden-green"
          >
            📷 Take a Photo of My Plant
          </Link>

          <Link
            href="/try?mode=packet"
            className="flex items-center justify-center gap-3 w-full h-16 rounded-xl bg-garden-greenBright text-white text-button transition-colors hover:bg-garden-green"
          >
            📦 Snap My Seed Packet
          </Link>

          <Link
            href="/try?mode=search"
            className="flex items-center justify-center gap-3 w-full h-16 rounded-xl bg-white border-2 border-garden-greenBright text-garden-greenBright text-button transition-colors hover:bg-garden-greenLight"
          >
            🌱 Tell Me What I&apos;m Growing
          </Link>
        </div>

        {/* Sign in link */}
        <p className="text-body text-garden-textMuted">
          Already have an account?{" "}
          <Link href="/login" className="text-garden-greenBright font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
