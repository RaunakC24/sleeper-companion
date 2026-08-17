import DraftTracker from "@/components/DraftTracker";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-8 max-w-6xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-emerald-500 uppercase">
          Sleeper companion
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
          Live draft tracker
        </h1>
      </div>
      <DraftTracker />
    </main>
  );
}
