import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { Search, Tv, Plus, Power, Loader2 } from 'lucide-react';

// Importação da logo
import logoEgaplast from '../img/egaplast.png';

export default function Navbar({ user, isAdmin }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('justLoggedIn');
      navigate('/');
    } catch (error) {
      console.error("Erro ao desconectar: ", error);
    }
  };

// ==========================================
  // MOTOR DE BUSCA GLOBAL (BLINDADO COM FORM)
  // ==========================================
  const handleSearch = async (e) => {
    e.preventDefault(); // Impede o navegador de recarregar a página ao dar Enter

    if (searchTerm.trim() === '') return;

    setIsSearching(true);
    const termoExato = searchTerm.trim();
    console.log(`[Busca Navbar] Iniciando busca profunda por: ${termoExato}`);

    try {
      // 1. Busca nos Pedidos Múltiplos
      const qPedidosMulti = query(
        collectionGroup(db, 'pedidosMultiDocumento'),
        where('romaneio', '==', termoExato)
      );
      const snapMulti = await getDocs(qPedidosMulti);

      if (!snapMulti.empty) {
        const elementoId = snapMulti.docs[0].ref.path.split('/')[3];
        navigate(`/elemento?id=${elementoId}`);
        setSearchTerm('');
        setIsSearching(false);
        return;
      }

      // 2. Busca nos Pedidos Legados
      const qPedidosLegados = query(
        collectionGroup(db, 'pedidos'),
        where('romaneio', '==', termoExato)
      );
      const snapLegados = await getDocs(qPedidosLegados);

      if (!snapLegados.empty) {
        const elementoId = snapLegados.docs[0].ref.path.split('/')[3];
        navigate(`/elemento?id=${elementoId}`);
        setSearchTerm('');
        setIsSearching(false);
        return;
      }

      // 3. Busca nas Ordens
      const qOrdens = query(
        collectionGroup(db, 'ordens'),
        where('romaneio', '==', termoExato)
      );
      const snapOrdens = await getDocs(qOrdens);

      if (!snapOrdens.empty) {
          const elementoId = snapOrdens.docs[0].ref.path.split('/')[3];
          navigate(`/elemento?id=${elementoId}`);
          setSearchTerm('');
          setIsSearching(false);
          return;
      }

      // 4. Se não achou
      alert(`O pedido "${termoExato}" não foi encontrado. Lembre-se de digitar as letras exatamente como estão salvas.`);

    } catch (error) {
      console.error("Erro na busca global:", error);
      alert("A busca falhou. Abra o Console (F12) e clique no link azul para criar o Índice no Firebase.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <nav className="modern-navbar">
      <div className="nav-brand">
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
        
        {/* BARRA DE BUSCA EXPANSÍVEL (AGORA É UM FORMULÁRIO) */}
        <form className="search-container" onSubmit={handleSearch}>
          <input 
            type="text" 
            className="search-expandable" 
            placeholder="Buscar OP e dar Enter..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isSearching}
          />
          {isSearching ? (
            <Loader2 className="search-icon-overlay" size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search className="search-icon-overlay" size={16} />
          )}
        </form>
        
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