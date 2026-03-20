import { Suspense } from "react";
import { LogForm } from "./LogForm";

export default function LogNewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto text-center py-12">
          <p className="font-sans text-base text-garden-textMuted">Loading...</p>
        </div>
      }
    >
      <LogForm />
    </Suspense>
  );
}
