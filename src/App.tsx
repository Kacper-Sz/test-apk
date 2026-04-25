import PWABadge from './PWABadge.tsx'
import { test_api } from './api_test.ts'
import { useNavigate } from "react-router";
import { useEffect, useState } from 'react';
import '/src/styles/bootstrap_overrides.scss';

function App() {
  const [count, setCount] = useState(0)
  const [apiData] = useState<any | null>(null);
  let navigate = useNavigate();

  useEffect(() => {
    async function load(){
      const result = await test_api();
      return result;
    }

    load()
  }, [])

  return (
    <div>

      <h1 className="text-primary">Carton</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
        <p>{apiData ? JSON.stringify(apiData, null, 2) : "Loading..."}</p>
        <div className="d-flex justify-content-center gap-2 flex-wrap">
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/containers")}>
          Przejdź do Kontenerów
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/products")}>
          Przejdź do Produktów
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/login")}>
          Przejdź do Logowania
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/register")}>
          Przejdź do Rejestracji
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/profile")}>
          Przejdź do Profilu
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/add-container")}>
          Przejdź do Dodawania Kontenera
        </button>
      </div>
      <PWABadge />
    </div>
  )
}

export default App
