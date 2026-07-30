import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { Search, Power, Loader2, FileText, MapPin, CheckCircle, Clock, ExternalLink, ShieldAlert, AlertTriangle, SearchX } from 'lucide-react';


import logoEgaplast from '../img/egaplast.png';

export default function Navbar({ user, isAdmin }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  
  // ==========================================
  // ESTADOS DOS MODAIS 
  // ==========================================
  const [searchResult, setSearchResult] = useState(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // NOVO: Estado de Confirmação de Saída

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('justLoggedIn');
      navigate('/');
    } catch (error) {
      console.error("Erro ao desconectar: ", error);
    }
  };

  const fecharModal = () => {
    setSearchResult(null);
    setShowAccessDenied(false);
    setSearchError(null); 
    setShowLogoutConfirm(false);
  };

  // ==========================================
  // MOTOR DE BUSCA GLOBAL
  // ==========================================
  const handleSearch = async (e) => {
    e.preventDefault(); 
    if (searchTerm.trim() === '') return;

    setIsSearching(true);
    const termoExato = searchTerm.trim();

    try {
      const qPedidosMulti = query(collectionGroup(db, 'pedidosMultiDocumento'), where('romaneio', '==', termoExato));
      const snapMulti = await getDocs(qPedidosMulti);

      if (!snapMulti.empty) {
        const docEncontrado = snapMulti.docs[0];
        setSearchResult({
          tipo: 'Pedido de Separação',
          id: docEncontrado.id,
          elementoId: docEncontrado.ref.path.split('/')[3],
          ...docEncontrado.data()
        });
        setIsSearching(false);
        setSearchTerm('');
        return;
      }

      const qPedidosLegados = query(collectionGroup(db, 'pedidos'), where('romaneio', '==', termoExato));
      const snapLegados = await getDocs(qPedidosLegados);

      if (!snapLegados.empty) {
        const docEncontrado = snapLegados.docs[0];
        setSearchResult({
          tipo: 'Pedido Legado',
          id: docEncontrado.id,
          elementoId: docEncontrado.ref.path.split('/')[3],
          ...docEncontrado.data()
        });
        setIsSearching(false);
        setSearchTerm('');
        return;
      }

      const qOrdens = query(collectionGroup(db, 'ordens'), where('romaneio', '==', termoExato));
      const snapOrdens = await getDocs(qOrdens);

      if (!snapOrdens.empty) {
        const docEncontrado = snapOrdens.docs[0];
        setSearchResult({
          tipo: 'Ordem de Produção',
          id: docEncontrado.id,
          elementoId: docEncontrado.ref.path.split('/')[3],
          ...docEncontrado.data()
        });
        setIsSearching(false);
        setSearchTerm('');
        return;
      }

      setSearchError({
        tipo: 'not_found',
        titulo: 'Não Encontrado',
        mensagem: `O documento "${termoExato}" não foi encontrado. Lembre-se de digitar a numeração exatamente como foi cadastrada.`
      });

    } catch (error) {
      console.error("Erro na busca global:", error);
      setSearchError({
        tipo: 'firebase_error',
        titulo: 'Erro de Busca',
        mensagem: 'A busca falhou porque o Firebase exige a criação de um Índice para esta pesquisa. Abra o Console (F12) e clique no link azul para autorizar.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
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
          
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="btn-nav btn-logout" 
            title="Sair"
          >
            <Power size={18} />
          </button>
        </div>
      </nav>

      {/* ==========================================
          MODAIS (RESULTADOS, LOGOUT E ERROS)
          ========================================== */}
      {(searchResult || searchError || showLogoutConfirm) && (
        <div className="modal-overlay-search" onClick={fecharModal}>
          <div className="modal-content-search" onClick={(e) => e.stopPropagation()}>
            
            {showLogoutConfirm ? (
              // --- TELA DE CONFIRMAÇÃO DE LOGOUT ---
              <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: '1px solid #ffebeb' }}>
                  <Power size={48} color="#dc3545" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: '#1e293b', margin: '0 0 10px 0', fontWeight: '800' }}>
                  Sair do Sistema?
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
                  Tem certeza que deseja desconectar sua conta? Você precisará realizar o login novamente para continuar operando.
                </p>
                
                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                  <button 
                    className="btn-cancel-search" 
                    style={{ flex: 1, display: 'flex', justifyContent: 'center' }} 
                    onClick={fecharModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-access-search" 
                    style={{ flex: 1, background: '#dc3545', boxShadow: '0 4px 12px rgba(220, 53, 69, 0.2)', display: 'flex', justifyContent: 'center' }} 
                    onClick={handleLogout}
                  >
                    Sim, Sair
                  </button>
                </div>
              </div>

            ) : searchError ? (
              // --- TELA DE ERRO ---
              <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: searchError.tipo === 'not_found' ? '#fff8e6' : '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: `1px solid ${searchError.tipo === 'not_found' ? '#ffecb3' : '#ffebeb'}` }}>
                  {searchError.tipo === 'not_found' ? (
                    <SearchX size={48} color="#ffc107" />
                  ) : (
                    <AlertTriangle size={48} color="#dc3545" />
                  )}
                </div>
                <h3 style={{ fontSize: '1.6rem', color: searchError.tipo === 'not_found' ? '#b8860b' : '#dc3545', margin: '0 0 10px 0', fontWeight: '800' }}>
                  {searchError.titulo}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
                  {searchError.mensagem}
                </p>
                
                <div style={{ display: 'flex', width: '100%' }}>
                  <button 
                    className="btn-cancel-search" 
                    style={{ flex: 1, display: 'flex', justifyContent: 'center' }} 
                    onClick={fecharModal}
                  >
                    Entendi e Fechar
                  </button>
                </div>
              </div>

            ) : showAccessDenied ? (
              // --- TELA DE ACESSO NEGADO ---
              <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: '1px solid #ffebeb' }}>
                  <ShieldAlert size={48} color="#dc3545" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: '#dc3545', margin: '0 0 10px 0', fontWeight: '800' }}>Acesso Restrito</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
                  Este romaneio está sob a responsabilidade de outro setor ou usuário.<br/><br/>
                  Você pode visualizar o status da separação nesta tela, mas não possui permissão para acessar ou alterar a operação.
                </p>
                
                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                  <button 
                    className="btn-cancel-search" 
                    style={{ flex: 1, display: 'flex', justifyContent: 'center' }} 
                    onClick={fecharModal}
                  >
                    Fechar
                  </button>
                  <button 
                    className="btn-access-search" 
                    style={{ flex: 1, background: '#e2e8f0', color: '#475569', boxShadow: 'none', display: 'flex', justifyContent: 'center' }} 
                    onClick={() => setShowAccessDenied(false)}
                  >
                    Voltar aos Detalhes
                  </button>
                </div>
              </div>
              
            ) : (
              // --- TELA NORMAL DO PEDIDO (QUICK VIEW) ---
              <>
                <div className="search-modal-header">
                  <div className="search-badge">{searchResult.tipo}</div>
                  <h2 className="search-title">{searchResult.romaneio}</h2>
                  <button className="btn-close-search" onClick={fecharModal}>×</button>
                </div>

                <div className="search-modal-body">
                  {searchResult.loja && (
                    <div className="info-row">
                      <MapPin size={18} className="info-icon" />
                      <div>
                        <span className="info-label">Loja / Destino</span>
                        <strong className="info-value">{searchResult.loja} {searchResult.local ? `- ${searchResult.local}` : ''}</strong>
                      </div>
                    </div>
                  )}

                  <div className="info-row">
                    <FileText size={18} className="info-icon" />
                    <div>
                      <span className="info-label">Criado por</span>
                      <strong className="info-value">{searchResult.criadorEmail ? searchResult.criadorEmail.split('@')[0].toUpperCase() : 'Sistema'}</strong>
                    </div>
                  </div>

                  <div className="info-row">
                    {searchResult.efetivado ? (
                      <CheckCircle size={18} style={{ color: '#28a745' }} className="info-icon" />
                    ) : (
                      <Clock size={18} style={{ color: 'var(--secondary)' }} className="info-icon" />
                    )}
                    <div>
                      <span className="info-label">Status da Separação</span>
                      <strong className="info-value" style={{ color: searchResult.efetivado ? '#28a745' : 'var(--secondary)' }}>
                        {searchResult.efetivado ? 'Finalizado' : 'Em andamento'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="search-modal-footer">
                  <button className="btn-cancel-search" onClick={fecharModal}>
                    Fechar
                  </button>
                  
                  <button 
                    className="btn-access-search" 
                    onClick={() => {
                      // TRAVA DE SEGURANÇA COM BYPASS PARA ADMIN
                      const isOwner = searchResult.criadorUid === user.uid;
                      const isLinked = searchResult.uidsVinculados && searchResult.uidsVinculados.includes(user.uid);
                      
                      // O Admin ignora as amarras e pode acessar qualquer documento
                      const canAccess = isAdmin || isOwner || isLinked;

                      if (!canAccess) {
                        setShowAccessDenied(true); 
                        return;
                      }

                      navigate(`/elemento?id=${searchResult.elementoId}`);
                    }} 
                  >
                    Acessar Operação <ExternalLink size={16} />
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}