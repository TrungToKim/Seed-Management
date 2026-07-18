import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/data")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);
  return (
    <>
      <div>
        <h1>Test api backend</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </>
  );
}
