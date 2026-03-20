import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function HazelWhatsAppSection() {
  const phoneNumber = process.env.NEXT_PUBLIC_HAZEL_PHONE_NUMBER || "";
  const cleanNumber = phoneNumber.replace(/\+/g, "");
  const whatsappLink = `https://wa.me/${cleanNumber}?text=Hello%20Hazel`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappLink)}`;

  if (!cleanNumber) return null;

  return (
    <div className="mt-12 pt-8 border-t border-garden-border w-full">
      <div className="text-center">
        <h2 className="text-heading-sm text-garden-text mb-2">
          Chat with Hazel on WhatsApp
        </h2>
        <p className="text-body text-garden-textMuted mb-6">
          Send a photo of your plant and get instant advice
        </p>

        {/* QR Code */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="Scan to chat with Hazel on WhatsApp"
          width={200}
          height={200}
          className="mx-auto mb-4 rounded-lg"
        />

        {/* WhatsApp Button */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#25D366] text-white font-semibold text-lg transition-colors hover:bg-[#1da851]"
        >
          🌱 Open WhatsApp
        </a>
      </div>
    </div>
  );
}

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

        {/* Hazel WhatsApp Section */}
        <HazelWhatsAppSection />
      </div>
    </div>
  );
}
