import { TypingTest } from "@/components/typing-test";

export default function Home() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center">
        <TypingTest />
      </main>
    </div>
  );
}
