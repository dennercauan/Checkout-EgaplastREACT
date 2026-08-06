// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collectionGroup, query, where, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Search, Power, Loader2, MapPin, CheckCircle, Clock, ExternalLink, ShieldAlert, AlertTriangle, SearchX, UserCircle, Settings, Palette, Image as ImageIcon, Camera } from 'lucide-react';

import logoEgaplast from '../img/egaplast.png';

export default function Navbar({ user, isAdmin }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // ==========================================
  // ESTADOS DE PESQUISA E LOGOUT
  // ==========================================
  const [searchResult, setSearchResult] = useState(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ==========================================
  // ESTADOS DO PERFIL E TEMAS
  // ==========================================
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const dropdownRef = useRef(null);
  
  const [userProfile, setUserProfile] = useState({ nickname: '', photoURL: '', theme: 'light' });
  const [formProfile, setFormProfile] = useState({ nickname: '', photoURL: '', theme: 'light' });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          nickname: data.nickname || '',
          photoURL: data.photoURL || '',
          theme: data.theme || 'light'
        };
        setUserProfile(profileData);
        aplicarTemaGlobal(profileData.theme);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

 const aplicarTemaGlobal = (tema) => {
    const root = document.documentElement;
    if (tema === 'dark') {
      // MODO ESCURO (Gradiente Dark Premium)
      root.style.setProperty('--bg-main', 'linear-gradient(135deg, #000000 0%, #18181b 50%, #000000 100%)');
      root.style.setProperty('--bg-card', '#121212');
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--text-muted', '#a1a1aa');
      root.style.setProperty('--border-color', '#27272a');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('color-scheme', 'dark');
      
      root.style.setProperty('--text-highlight', '#ffffff'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #18181b 0%, #09090b 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.08)'); 
    } else if (tema === 'dark-blue') {
      // AZUL ESCURO (Gradiente Midnight Blue)
      root.style.setProperty('--bg-main', 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #020617 100%)');
      root.style.setProperty('--bg-card', '#0f172a');
      root.style.setProperty('--text-main', '#f1f5f9');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', '#1e293b');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('color-scheme', 'dark');
      
      root.style.setProperty('--text-highlight', '#f1f5f9'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.1)');
    } else {
      // MODO CLARO (Gradiente Cinza Muito Suave)
      root.style.setProperty('--bg-main', 'linear-gradient(135deg, #f0f2f5 0%, #e2e8f0 100%)');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-main', '#334155');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', '#e2e8f0');
      root.style.setProperty('--logo-filter', 'none'); 
      root.style.setProperty('color-scheme', 'light');
      
      root.style.setProperty('--text-highlight', 'var(--primary)'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.2)');
    }
  };
  
  const handleOpenSettings = () => {
    setFormProfile(userProfile);
    setShowSettingsModal(true);
    setIsProfileMenuOpen(false);
  };

  // Transforma a imagem em texto (Base64) para salvar direto no Firestore
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Trava de segurança: Limita a imagem a 1MB para não estourar o limite do Firestore
    if (file.size > 1024 * 1024) {
      alert("A imagem é muito pesada. Escolha uma imagem de até 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormProfile(prev => ({ ...prev, photoURL: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormProfile(prev => ({ ...prev, photoURL: '' }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nickname: formProfile.nickname,
        photoURL: formProfile.photoURL,
        theme: formProfile.theme
      });
      setShowSettingsModal(false);
    } catch (error) {
      alert("Erro ao salvar o perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
        setSearchResult({ tipo: 'Pedido de Separação', id: docEncontrado.id, elementoId: docEncontrado.ref.path.split('/')[3], ...docEncontrado.data() });
        setIsSearching(false); setSearchTerm(''); return;
      }

      const qPedidosLegados = query(collectionGroup(db, 'pedidos'), where('romaneio', '==', termoExato));
      const snapLegados = await getDocs(qPedidosLegados);

      if (!snapLegados.empty) {
        const docEncontrado = snapLegados.docs[0];
        setSearchResult({ tipo: 'Pedido Legado', id: docEncontrado.id, elementoId: docEncontrado.ref.path.split('/')[3], ...docEncontrado.data() });
        setIsSearching(false); setSearchTerm(''); return;
      }

      const qOrdens = query(collectionGroup(db, 'ordens'), where('romaneio', '==', termoExato));
      const snapOrdens = await getDocs(qOrdens);

      if (!snapOrdens.empty) {
        const docEncontrado = snapOrdens.docs[0];
        setSearchResult({ tipo: 'Ordem de Produção', id: docEncontrado.id, elementoId: docEncontrado.ref.path.split('/')[3], ...docEncontrado.data() });
        setIsSearching(false); setSearchTerm(''); return;
      }

      setSearchError({ tipo: 'not_found', titulo: 'Não Encontrado', mensagem: `O documento "${termoExato}" não foi encontrado. Lembre-se de digitar a numeração exatamente como foi cadastrada.` });

    } catch (error) {
      console.error("Erro na busca global:", error);
      setSearchError({ tipo: 'firebase_error', titulo: 'Erro de Busca', mensagem: 'A busca falhou porque o Firebase exige a criação de um Índice para esta pesquisa. Abra o Console (F12) e clique no link azul para autorizar.' });
    } finally {
      setIsSearching(false);
    }
  };

  const displayName = userProfile.nickname || (user?.email ? user.email.split('@')[0] : 'Usuário');

  return (
    <>
      <nav className="modern-navbar">
        {/* LADO ESQUERDO: LOGO APENAS */}
        <div className="nav-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoEgaplast} 
            alt="Egaplast Logo" 
            className="nav-logo" 
            onClick={() => window.location.reload()}
            style={{ 
              cursor: 'pointer', 
              filter: 'var(--logo-filter, none)', // A mágica da logo branca acontece aqui!
              transition: 'filter 0.3s ease' 
            }}
          />
        </div>

        {/* LADO DIREITO: PESQUISA + DROPDOWN DE PERFIL */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <form className="search-container" onSubmit={handleSearch} style={{ margin: 0 }}>
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

          {/* NOVO MENU DROPDOWN DE PERFIL POSICIONADO À DIREITA */}
          <div className="user-profile-section" ref={dropdownRef} style={{ position: 'relative' }}>
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                {/* 👇 A cor aqui agora é var(--text-highlight) */}
                <span style={{ fontWeight: 'bold', color: 'var(--text-highlight)', fontSize: '0.95rem', lineHeight: '1.2' }}>{displayName}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAdmin ? 'Administrador' : 'Conferente'}</span>
              </div>

              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Perfil" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {isProfileMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', width: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Sessão Ativa</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#334155', wordBreak: 'break-all' }}>{user?.email}</span>
                </div>
                
                <div style={{ padding: '5px' }}>
                  <button 
                    onClick={handleOpenSettings}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <UserCircle size={18} /> Meu Perfil e Tema
                  </button>
                  
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setShowLogoutConfirm(true); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Power size={18} /> Sair da Conta
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* ==========================================
          MODAL DE CONFIGURAÇÃO (PERFIL E TEMA)
          ========================================== */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '500px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out' }}>
            
            <div style={{ background: '#f8fafc', padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                <Settings size={22} color="var(--primary)"/> Configurações da Conta
              </h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><SearchX size={24}/></button>
            </div>

            <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ÁREA DE FOTO DE PERFIL (COM UPLOAD DE ARQUIVO) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  {formProfile.photoURL ? (
                    <img src={formProfile.photoURL} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCircle size={40} />
                    </div>
                  )}
                  
                  <label 
                    style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--primary)', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    title="Importar imagem do computador"
                  >
                    <Camera size={16} />
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                
                {formProfile.photoURL && (
                  <button onClick={handleRemoveImage} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>Remover Foto</button>
                )}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>JPG ou PNG (Max 1MB)</span>
              </div>

              {/* NICKNAME */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                  Como quer ser chamado? (Nickname)
                </label>
                <input 
                  type="text" 
                  value={formProfile.nickname} 
                  onChange={e => setFormProfile({...formProfile, nickname: e.target.value})}
                  placeholder="Ex: João Silva"
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* SELEÇÃO DE TEMA */}
              <div style={{ marginTop: '5px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '12px' }}>
                  <Palette size={14} style={{ display: 'inline', marginRight: '4px' }}/> Personalizar Cores da Plataforma
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  
                  {/* Option: Light */}
                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'light'})}
                    style={{ border: `2px solid ${formProfile.theme === 'light' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'light' ? '#f0f9ff' : '#fff' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Claro (Padrão)</span>
                  </div>

                  {/* Option: Dark Blue */}
                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'dark-blue'})}
                    style={{ border: `2px solid ${formProfile.theme === 'dark-blue' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'dark-blue' ? '#eff6ff' : '#fff' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Azul Escuro</span>
                  </div>

                  {/* Option: Dark */}
                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'dark'})}
                    style={{ border: `2px solid ${formProfile.theme === 'dark' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'dark' ? '#f8fafc' : '#fff' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Modo Escuro</span>
                  </div>

                </div>
              </div>

            </div>

            <div style={{ padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button onClick={() => setShowSettingsModal(false)} disabled={isSavingProfile} style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 25px', border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                {isSavingProfile ? <Loader2 size={18} className="fa-spin"/> : <CheckCircle size={18}/>}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAIS (RESULTADOS, LOGOUT E ERROS) - MANTIDOS DA VERSÃO ANTERIOR
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
                <h3 style={{ fontSize: '1.6rem', color: '#a0a8b6', margin: '0 0 10px 0', fontWeight: '800' }}>
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
                      const isOwner = searchResult.criadorUid === user.uid;
                      const isLinked = searchResult.uidsVinculados && searchResult.uidsVinculados.includes(user.uid);
                      
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
      
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        `}
      </style>
    </>
  );
}