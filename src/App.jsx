import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota principal: Quando o usuário entrar no site, vê o Login */}
        <Route path="/" element={<Login />} />
        
        {/* Rotas futuras */}
        <Route path="/dashboard" element={<h2>Página do Dashboard (Em construção)</h2>} />
        <Route path="/dashboard-viewer" element={<h2>Dashboard Comercial (Em construção)</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;