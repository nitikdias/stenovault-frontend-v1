import Link from "next/link";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export default async function AdminDashboard() {
  let userCount = 0;
  let meetingCount = 0;
  let transcriptCount = 0;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/metrics`, { headers: { "X-API-Key": API_KEY } });
    if (res.ok) {
      const metrics = await res.json();
      userCount = metrics.users || 0;
      meetingCount = metrics.meetings || 0;
      transcriptCount = metrics.transcripts || 0;
    }
  } catch (err) {
    console.warn("Failed to fetch admin metrics, falling back to zeros:", err);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/admin/users" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-gray-500">{userCount} users</p>
        </Link>
        <Link href="/admin/meetings" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Meetings</h2>
          <p className="text-gray-500">{meetingCount} meetings</p>
        </Link>
        <Link href="/admin/transcripts" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Transcripts</h2>
          <p className="text-gray-500">{transcriptCount} transcripts</p>
        </Link>
        
      </div>
    </div>
  );
}
