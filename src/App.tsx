import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BaseDeConocimiento from "./pages/BaseDeConocimiento";
import Tareas from "./pages/Tareas";
import GeneradorCanvas from "./pages/GeneradorCanvas";
import { AuthProvider } from "./providers/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="conocimiento" element={<BaseDeConocimiento />} />
            <Route path="tareas" element={<Tareas />} />
            <Route path="canvas" element={<GeneradorCanvas />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
