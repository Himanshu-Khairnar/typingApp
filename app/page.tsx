"use client";

import { useState } from "react";
import { TypingTest } from "@/components/typing-test";
import { Keyboard } from "@/components/ui/keyboard";
import { useAppSettings } from "@/lib/app-settings";

export default function Home() {
  const { theme, isMuted } = useAppSettings();
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-20 pb-8 md:px-6 md:pt-22 md:pb-10">
        <TypingTest
          onResultVisibleChange={setIsResultVisible}
          onZenModeChange={setIsZenMode}
        />
        {!isResultVisible && !isZenMode && (
          <div className="w-full overflow-x-auto pt-10">
            <div className="flex min-w-max items-start justify-center px-2 pb-4">
              <Keyboard
                className="origin-top scale-[0.86] sm:scale-95 lg:scale-100"
                theme={theme}
                enableHaptics
                enableSound={!isMuted}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
