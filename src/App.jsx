// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Importando o novo painel
import Operacao from './pages/Operacao';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota inicial de Login */}
        <Route path="/" element={<Login />} />
        s
        {/* Rota do Dashboard Operacional (agora apontando para o arquivo real) */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Rota do Dashboard Comercial (manteremos em construção por enquanto) */}
        <Route path="/dashboard-viewer" element={<h2>Dashboard Comercial (Em construção)</h2>} />

        <Route path="/elemento" element={<Operacao />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;