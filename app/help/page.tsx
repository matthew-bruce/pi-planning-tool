export default function HelpPage() {
  return (
    <div className="prose max-w-3xl">
      <h2>Dispatch Help & Guide</h2>
      <h3>What is Dispatch?</h3>
      <p>A PI Planning orchestration and observability PoC for Royal Mail Group.</p>
      <h3>How does Demo Mode work?</h3>
      <p>When enabled, Dispatch simulates activity every 8–15 seconds and writes events into the dashboard activity feed.</p>
      <h3>What is the Parking Lot?</h3>
      <p>It lists unallocated features (no sprint). Drag cards onto sprint columns or assign them through Bulk Triage.</p>
      <h3>Will this replace Jira/ADO?</h3>
      <p>No. This PoC is integration-ready and intended as an orchestration layer.</p>
    </div>
  );
}
