import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export default async function MeetingsPage() {
  // Fetch meetings from backend; fallback to empty array
  let meetings = [];
  try {
    const res = await fetch(`${API_BASE_URL}/meetings`, { headers: { "X-API-Key": API_KEY } });
    if (res.ok) meetings = await res.json();
  } catch (err) {
    console.warn("Failed to fetch meetings from backend:", err);
    meetings = [];
  }

  // Server action to delete a meeting (calls backend)
  async function deleteMeeting(formData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;

    try {
      await fetch(`${API_BASE_URL}/meetings/${id}`, { method: "DELETE", headers: { "X-API-Key": API_KEY } });
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }

    revalidatePath("/meetings");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-black">Meetings</h1>

      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Name</th>
            <th className="border p-2 text-black">User</th>
            <th className="border p-2 text-black">Patient</th>
            <th className="border p-2 text-black">Transcripts</th>
            <th className="border p-2 text-black">Actions</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 text-black">
              <td className="border p-2">{m.id}</td>
              <td className="border p-2">{m.name}</td>
              <td className="border p-2">{m.user?.email || "N/A"}</td>
              <td className="border p-2">{m.patient?.name || "N/A"}</td>
              <td className="border p-2">{(m.transcripts || []).length}</td>
              <td className="border p-2">
                <form action={deleteMeeting}>
                  <input type="hidden" name="id" value={m.id} />
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
