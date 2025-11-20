import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export default async function UsersPage() {
  let users = [];
  try {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: { "X-API-Key": API_KEY } });
    if (res.ok) users = await res.json();
  } catch (err) {
    console.warn("Failed to fetch users from backend:", err);
    users = [];
  }

  async function deleteUser(formData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;

    try {
      await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE", headers: { "X-API-Key": API_KEY } });
    } catch (error) {
      console.error("Error deleting user:", error);
    }

    revalidatePath("/users");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-black">Users</h1>

      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Email</th>
            <th className="border p-2 text-black">Meetings</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="border p-2 text-black">{u.id}</td>
              <td className="border p-2 text-black">{u.email}</td>
              <td className="border p-2 text-black">{(u.meetings || []).length}</td>
              <td className="border p-2 text-black">
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="bg-red-500 text-white px-2 py-1 rounded">
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
