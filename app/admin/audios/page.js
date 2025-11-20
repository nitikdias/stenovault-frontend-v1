import { Buffer } from "buffer";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export default async function AudiosPage() {
  let audios = [];
  try {
    const res = await fetch(`${API_BASE_URL}/audios`, { headers: { "X-API-Key": API_KEY } });
    if (res.ok) audios = await res.json();
  } catch (err) {
    console.warn("Failed to fetch audios from backend:", err);
    audios = [];
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Audio Samples</h1>
      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">ID</th>
            <th className="border p-2">User</th>
            <th className="border p-2">Filename</th>
            <th className="border p-2">Play</th>
            <th className="border p-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {audios.map((a) => {
            const base64Audio = Buffer.from(a.data || "").toString("base64");
            return (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="border p-2">{a.id}</td>
                <td className="border p-2">{a.user?.email || "-"}</td>
                <td className="border p-2">{a.filename}</td>
                <td className="border p-2">
                  <audio controls src={`data:audio/wav;base64,${base64Audio}`} />
                </td>
                <td className="border p-2">{a.description || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
