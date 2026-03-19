import { Suspense } from "react";
import { LogForm } from "./LogForm";

export default function LogNewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto text-center py-12">
          <p className="font-mono text-sm text-moss-500">Loading...</p>
        </div>
      }
    >
      <LogForm />
    </Suspense>
  );
}
