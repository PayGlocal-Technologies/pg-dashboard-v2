"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Button } from "@/components/ui";
import { heartbeatApi } from "@/api";

export default function NotFound() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleGoBack = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const res = await fetch(heartbeatApi);
      if (!res.ok) {
        router.push("/login");
        return;
      }
      router.back();
    } catch {
      router.push("/login");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* 404 watermark — positioned behind content */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center select-none"
        aria-hidden="true"
      >
        <span className="text-[22vw] font-black leading-none text-primary/[0.05] dark:text-primary/[0.08]">
          404
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center page-enter">
        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/15">
          <Icon name="file-text" size={24} className="text-primary" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Check the URL
          and try again.
        </p>

        <Button className="mt-8 px-10" isLoading={isChecking} onClick={handleGoBack}>
          Go back
        </Button>
      </div>
    </div>
  );
}
