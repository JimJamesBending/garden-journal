export const metadata = {
  title: "Privacy Policy — Hazel",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-heading-lg text-garden-text mb-6">Privacy Policy</h1>
        <p className="text-sm text-garden-textMuted mb-8">Last updated: March 2026</p>

        <div className="space-y-6 text-body text-garden-text">
          <section>
            <h2 className="font-semibold text-lg mb-2">What Hazel Collects</h2>
            <p>
              When you message Hazel on WhatsApp, we store your phone number,
              display name, message content, and any photos you send. Photos are
              stored on Cloudinary. Conversation history and identified plants
              are stored in our database so Hazel can remember your garden.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">How We Use Your Data</h2>
            <p>
              Your data is used solely to provide the Hazel gardening service:
              identifying plants, giving advice, and building your garden page.
              We do not sell your data or share it with third parties for
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">Your Garden Page</h2>
            <p>
              Hazel creates a public garden page showing your plants and photos.
              This page is accessible via a unique link. You can request removal
              of your garden page at any time by messaging Hazel.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">Third-Party Services</h2>
            <p>
              We use Supabase (database), Cloudinary (image hosting), Google
              Gemini (AI), and Meta WhatsApp Business API (messaging). Each has
              their own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">Data Deletion</h2>
            <p>
              You can request deletion of all your data at any time by emailing
              hellojimbending@gmail.com. We will delete your account,
              conversation history, plants, and photos within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-2">Contact</h2>
            <p>
              For any privacy questions, contact hellojimbending@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
