import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Search, Tv, Plus, Power } from 'lucide-react';

// Importação da logo
import logoEgaplast from '../img/egaplast.png';

export default function Navbar({ user, isAdmin }) {
  const navigate = useNavigate();

  // A função que estava faltando e causando o crash da tela
  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('justLoggedIn');
      navigate('/');
    } catch (error) {
      console.error("Erro ao desconectar: ", error);
    }
  };

  return (
    <nav className="modern-navbar">
      <div className="nav-brand">
        
        {/* A imagem importada corretamente sem aspas */}
        <img 
          src={logoEgaplast} 
          alt="Egaplast Logo" 
          className="nav-logo" 
          onClick={() => window.location.reload()}
        />
        
        <div className="nav-title">
          Dashboard
          <small>{user?.email || 'Carregando...'}</small>
        </div>
      </div>

      <div className="nav-actions">
        <div className="search-container">
          <input 
            type="text" 
            className="search-expandable" 
            placeholder="Pesquisar Romaneio ou Loja..." 
          />
          <Search className="search-icon-overlay" size={16} />
        </div>
        
        {isAdmin && (
          <button className="btn-nav" title="Painel TV">
            <Tv size={16} /> Ranking
          </button>
        )}
        
        <button className="btn-nav btn-primary">
          <Plus size={16} /> Novo Elemento
        </button>

        <button onClick={handleLogout} className="btn-nav btn-logout" title="Sair">
          <Power size={18} />
        </button>
      </div>
    </nav>
  );
}