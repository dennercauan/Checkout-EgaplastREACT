// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operacao from './pages/Operacao';
import OperacaoAdm from './pages/OperacaoAdm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota inicial de Login */}
        <Route path="/" element={<Login />} />

        {/* Rota do Dashboard Operacional */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Rota do Dashboard Comercial */}
        <Route path="/dashboard-viewer" element={<h2>Dashboard Comercial (Em construção)</h2>} />

        {/* Rota Principal da Operação */}
        <Route path="/operacao" element={<Operacao isAdmin={false} />} />

        {/* Rota de compatibilidade para links legados */}
        <Route path="/elemento" element={<Operacao isAdmin={false} />} />

        {/* Rota Administrativa */}
        <Route path="/operacao-adm" element={<OperacaoAdm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;