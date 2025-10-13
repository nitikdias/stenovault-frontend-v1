const [user, setUser] = useState(null);
const [dropdownOpen, setDropdownOpen] = useState(false);

useEffect(() => {
  async function fetchUser() {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  }
  fetchUser();
}, []);
