import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export default async function TranscriptsPage() {
  let transcripts = [];
  try {
    const res = await fetch(`${API_BASE_URL}/transcripts`, { headers: { "X-API-Key": API_KEY } });
    if (res.ok) transcripts = await res.json();
  } catch (err) {
    console.warn("Failed to fetch transcripts from backend:", err);
    transcripts = [];
  }

  async function deleteTranscript(formData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;

    try {
      await fetch(`${API_BASE_URL}/transcripts/${id}`, { method: "DELETE", headers: { "X-API-Key": API_KEY } });
    } catch (error) {
      console.error("Error deleting transcript:", error);
    }

    revalidatePath("/transcripts");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-black">Transcripts</h1>
      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Meeting</th>
            <th className="border p-2 text-black">User</th>
            <th className="border p-2 text-black">Patient</th>
            <th className="border p-2 text-black">Transcript</th>
            <th className="border p-2 text-black">Summary</th>
            <th className="border p-2 text-black">Action</th>
          </tr>
        </thead>
        <tbody>
          {transcripts.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="border p-2 text-black">{t.id}</td>
              <td className="border p-2 text-black">{t.meeting?.name || "-"}</td>
              <td className="border p-2 text-black">{t.meeting?.user?.email || "-"}</td>
              <td className="border p-2 text-black">{t.meeting?.patient?.name || "N/A"}</td>
              <td className="border p-2 text-black">{t.transcript}</td>
              <td className="border p-2 text-black">{t.summary || "-"}</td>
              <td className="border p-2 text-black">
                <form action={deleteTranscript}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
