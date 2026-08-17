// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, collectionGroup, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Search, Power, Loader2, MapPin, CheckCircle, Clock, ExternalLink, 
  ShieldAlert, AlertTriangle, SearchX, UserCircle, Settings, Palette, 
  Camera, FileText 
} from 'lucide-react';

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
  // ESTADOS DO PERFIL E TEMAS (COM PERSISTÊNCIA SÍNCRONA)
  // ==========================================
  const dropdownRef = useRef(null);
  const temaPersistido = localStorage.getItem('egaplast_theme') || 'light';
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [userProfile, setUserProfile] = useState({ nickname: '', photoURL: '', theme: temaPersistido });
  const [formProfile, setFormProfile] = useState({ nickname: '', photoURL: '', theme: temaPersistido });

  const aplicarTemaGlobal = (tema) => {
    const root = document.documentElement;
    const temaFinal = tema || localStorage.getItem('egaplast_theme') || 'light';

    root.setAttribute('data-theme', temaFinal);
    localStorage.setItem('egaplast_theme', temaFinal);

    if (temaFinal === 'dark') {
      root.style.setProperty('--bg-main', 'radial-gradient(circle at 10% 10%, #181820 0%, #0c0c10 45%, #050507 100%)');
      root.style.setProperty('--bg-card', '#0e0e11');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#a1a1aa');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--checkout-logo-filter', 'invert(1)');
      root.style.setProperty('--checkout-logo-blend', 'screen');
      root.style.setProperty('color-scheme', 'dark');
      root.style.setProperty('--text-highlight', '#ffffff'); 

      root.style.setProperty('--bg-hero', 'linear-gradient(140deg, #3f3f46 0%, #27272a 45%, #141417 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.12)'); 
      root.style.setProperty('--hero-border', 'rgba(255, 255, 255, 0.22)');
      root.style.setProperty('--hero-shadow', '0 20px 45px -10px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.25)');
      document.body.style.background = '#050507';
    } else if (temaFinal === 'dark-blue') {
      root.style.setProperty('--bg-main', 'radial-gradient(ellipse at 15% 15%, #0c1e3f 0%, #071228 45%, #030814 100%)');
      root.style.setProperty('--bg-card', '#0a1226');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(56, 189, 248, 0.12)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--checkout-logo-filter', 'invert(1)');
      root.style.setProperty('--checkout-logo-blend', 'screen');
      root.style.setProperty('color-scheme', 'dark');
      root.style.setProperty('--text-highlight', '#38bdf8'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.15)');
      root.style.setProperty('--hero-border', 'rgba(56, 189, 248, 0.25)');
      root.style.setProperty('--hero-shadow', '0 20px 40px -15px rgba(29, 78, 216, 0.4)');
      document.body.style.background = '#030814';
    } else {
      root.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #e0e7ff 0%, #edf2f7 40%, #f8fafc 100%)');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', '#cbd5e1');
      root.style.setProperty('--logo-filter', 'none'); 
      root.style.setProperty('--checkout-logo-filter', 'none'); 
      root.style.setProperty('--checkout-logo-blend', 'multiply');
      root.style.setProperty('color-scheme', 'light');
      root.style.setProperty('--text-highlight', 'var(--primary)'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #0d3269 0%, #1d4ed8 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.25)');
      root.style.setProperty('--hero-border', 'transparent');
      root.style.setProperty('--hero-shadow', '0 15px 30px -10px rgba(13, 50, 105, 0.3)');
      document.body.style.background = '#f8fafc';
    }
  };

  useEffect(() => {
    // Aplicação imediata no ciclo de montagem
    aplicarTemaGlobal(temaPersistido);

    if (!user) return;
    const unsub = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          nickname: data.nickname || '',
          photoURL: data.photoURL || '',
          theme: data.theme || temaPersistido
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
  
  const handleOpenSettings = () => {
    setFormProfile(userProfile);
    setShowSettingsModal(true);
    setIsProfileMenuOpen(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
      // Salva imediatamente no localStorage antes do banco para resposta instantânea
      aplicarTemaGlobal(formProfile.theme);

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

  // ==========================================
  // EXTRAÇÃO PRECISA DA DATA DA OPERAÇÃO
  // ==========================================
  const extrairDataIso = (docData) => {
    if (docData.dataOperacao && typeof docData.dataOperacao === 'string' && docData.dataOperacao.length >= 10) {
      return docData.dataOperacao.substring(0, 10);
    }

    const ts = docData.createdAt || docData.completedAt || docData.primeiraEfetivacao || docData.updatedAt;
    if (ts) {
      let dateObj = null;
      if (typeof ts.toDate === 'function') {
        dateObj = ts.toDate();
      } else if (ts.seconds) {
        dateObj = new Date(ts.seconds * 1000);
      } else if (typeof ts === 'string' || typeof ts === 'number') {
        dateObj = new Date(ts);
      }

      if (dateObj && !isNaN(dateObj.getTime())) {
        const ano = dateObj.getFullYear();
        const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dia = String(dateObj.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      }
    }

    return null;
  };

  const handleSearch = async (e) => {
    e.preventDefault(); 
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    const termoExato = searchTerm.trim();
    const termoNumero = Number(termoExato);

    try {
      // 1. Busca na coleção principal 'pedidos'
      const qPedidos = query(collection(db, 'pedidos'), where('romaneio', 'in', isNaN(termoNumero) ? [termoExato] : [termoExato, termoNumero]));
      const snapPedidos = await getDocs(qPedidos);

      if (!snapPedidos.empty) {
        const docEncontrado = snapPedidos.docs[0];
        const data = docEncontrado.data();
        let dataFinal = extrairDataIso(data);

        setSearchResult({
          tipo: 'Romaneio / Pedido',
          id: docEncontrado.id,
          isRoot: true,
          dataCalculada: dataFinal,
          ...data
        });
        setIsSearching(false);
        setSearchTerm('');
        return;
      }

      // 2. Busca nas Ordens de Produção 'ordensProducao'
      const qOps = query(collection(db, 'ordensProducao'), where('numero', 'in', isNaN(termoNumero) ? [termoExato] : [termoExato, termoNumero]));
      const snapOps = await getDocs(qOps);

      if (!snapOps.empty) {
        const docEncontrado = snapOps.docs[0];
        const dataOp = docEncontrado.data();
        let dataFinal = extrairDataIso(dataOp);

        setSearchResult({
          tipo: 'Ordem de Produção (O.P.)',
          id: docEncontrado.id,
          isOp: true,
          romaneio: dataOp.numero,
          criadorEmail: dataOp.responsavelEmail,
          criadorUid: dataOp.responsavelUid || dataOp.criadorUid,
          efetivado: true,
          dataCalculada: dataFinal,
          ...dataOp
        });
        setIsSearching(false);
        setSearchTerm('');
        return;
      }

      // 3. Busca nas Pastas Legadas (pedidosMultiDocumento)
      const qPedidosMulti = query(collectionGroup(db, 'pedidosMultiDocumento'), where('romaneio', 'in', isNaN(termoNumero) ? [termoExato] : [termoExato, termoNumero]));
      const snapMulti = await getDocs(qPedidosMulti);

      if (!snapMulti.empty) {
        const docEncontrado = snapMulti.docs[0];
        const dataLegada = docEncontrado.data();
        const pathSegments = docEncontrado.ref.path.split('/');
        const uidDono = pathSegments[1];
        const elemIdOriginal = pathSegments[3];

        let dataFinal = extrairDataIso(dataLegada);

        if (!dataFinal && uidDono && elemIdOriginal) {
          try {
            const elemSnap = await getDoc(doc(db, 'usuarios', uidDono, 'elementos', elemIdOriginal));
            if (elemSnap.exists()) {
              const tituloElem = elemSnap.data().titulo;
              if (tituloElem && tituloElem.includes('/')) {
                const [d, m] = tituloElem.split('/');
                const anoAtual = new Date().getFullYear();
                dataFinal = `${anoAtual}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
            }
          } catch (errElem) {
            console.error("Erro ao buscar elemento pai:", errElem);
          }
        }

        setSearchResult({ 
          tipo: 'Pedido (Legado)', 
          id: docEncontrado.id, 
          elementoId: elemIdOriginal, 
          criadorUid: uidDono,
          _isLegacy: true,
          dataCalculada: dataFinal,
          ...dataLegada 
        });
        setIsSearching(false); 
        setSearchTerm(''); 
        return;
      }

      setSearchError({ 
        tipo: 'not_found', 
        titulo: 'Não Encontrado', 
        mensagem: `O romaneio ou O.P. "${termoExato}" não foi encontrado.` 
      });

    } catch (error) {
      console.error("Erro na busca global:", error);
      setSearchError({ 
        tipo: 'firebase_error', 
        titulo: 'Falha na Busca', 
        mensagem: error.message || 'Ocorreu um erro ao consultar os dados.' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const displayName = userProfile.nickname || (user?.email ? user.email.split('@')[0] : 'Usuário');

  return (
    <>
      <nav className="modern-navbar">
        <div className="nav-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoEgaplast} 
            alt="Egaplast Logo" 
            className="nav-logo" 
            onClick={() => window.location.reload()}
            style={{ 
              height: '60px',
              width: 'auto',
              objectFit: 'contain',
              cursor: 'pointer', 
              filter: 'var(--logo-filter, none)',
              transition: 'filter 0.3s ease, transform 0.2s ease' 
            }}
          />
        </div>
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <form className="search-container" onSubmit={handleSearch} style={{ margin: 0 }}>
            <input 
              type="text" 
              className="search-expandable" 
              placeholder="Buscar Romaneio ou O.P..." 
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

          {/* MENU DROPDOWN DE PERFIL */}
          <div className="user-profile-section" ref={dropdownRef} style={{ position: 'relative' }}>
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-highlight)', fontSize: '0.95rem', lineHeight: '1.2' }}>{displayName}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAdmin ? 'Administrador' : 'Conferente'}</span>
              </div>

              {userProfile.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="Perfil" 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    objectFit: 'cover', 
                    border: '2px solid var(--primary)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                    flexShrink: 0
                  }} 
                />
              ) : (
                <div 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'var(--primary)', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '1.25rem',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                    flexShrink: 0
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {isProfileMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', width: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color, #f1f5f9)', background: 'rgba(0,0,0,0.02)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 'bold', textTransform: 'uppercase' }}>Sessão Ativa</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main, #334155)', wordBreak: 'break-all' }}>{user?.email}</span>
                </div>
                
                <div style={{ padding: '5px' }}>
                  <button 
                    onClick={handleOpenSettings}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-main, #475569)', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <UserCircle size={18} /> Meu Perfil e Tema
                  </button>
                  
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); setShowLogoutConfirm(true); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
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
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', width: '500px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)', animation: 'fadeIn 0.3s ease-out' }}>
            
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '20px 25px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                <Settings size={22} color="var(--primary)"/> Configurações da Conta
              </h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)' }}><SearchX size={24}/></button>
            </div>

            <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>JPG ou PNG (Max 1MB)</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted, #64748b)', marginBottom: '8px' }}>
                  Como quer ser chamado? (Nickname)
                </label>
                <input 
                  type="text" 
                  value={formProfile.nickname} 
                  onChange={e => setFormProfile({...formProfile, nickname: e.target.value})}
                  placeholder="Ex: João Silva"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input, #fff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginTop: '5px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted, #64748b)', marginBottom: '12px' }}>
                  <Palette size={14} style={{ display: 'inline', marginRight: '4px' }}/> Personalizar Cores da Plataforma
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'light'})}
                    style={{ border: `2px solid ${formProfile.theme === 'light' ? 'var(--primary)' : 'var(--border-color, #e2e8f0)'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'light' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-card, #fff)' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main, #334155)' }}>Claro (Padrão)</span>
                  </div>

                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'dark-blue'})}
                    style={{ border: `2px solid ${formProfile.theme === 'dark-blue' ? 'var(--primary)' : 'var(--border-color, #e2e8f0)'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'dark-blue' ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-card, #fff)' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main, #334155)' }}>Azul Escuro</span>
                  </div>

                  <div 
                    onClick={() => setFormProfile({...formProfile, theme: 'dark'})}
                    style={{ border: `2px solid ${formProfile.theme === 'dark' ? 'var(--primary)' : 'var(--border-color, #e2e8f0)'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: formProfile.theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-card, #fff)' }}
                  >
                    <div style={{ width: '100%', height: '40px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main, #334155)' }}>Modo Escuro</span>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ padding: '20px 25px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button onClick={() => setShowSettingsModal(false)} disabled={isSavingProfile} style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: 'var(--text-muted, #64748b)', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
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
          MODAIS (RESULTADOS, LOGOUT E ERROS)
          ========================================== */}
      {(searchResult || searchError || showLogoutConfirm) && (
        <div className="modal-overlay-search" onClick={fecharModal}>
          <div className="modal-content-search" onClick={(e) => e.stopPropagation()}>
            
            {showLogoutConfirm ? (
              <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: '1px solid #ffebeb' }}>
                  <Power size={48} color="#dc3545" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--text-main, #a0a8b6)', margin: '0 0 10px 0', fontWeight: '800' }}>
                  Sair do Sistema?
                </h3>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
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
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
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
              <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: '1px solid #ffebeb' }}>
                  <ShieldAlert size={48} color="#dc3545" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: '#dc3545', margin: '0 0 10px 0', fontWeight: '800' }}>Acesso Restrito</h3>
                <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>
                  Este romaneio está sob a responsabilidade de outro conferente.<br/><br/>
                  Você pode visualizar o status da separação, mas não possui permissão para acessá-lo.
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
              <>
                <div className="search-modal-header">
                  <div className="search-badge" style={{ background: searchResult.isOp ? '#e0e7ff' : 'var(--primary)', color: searchResult.isOp ? '#4f46e5' : '#fff' }}>
                    {searchResult.tipo}
                  </div>
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
                      <span className="info-label">Responsável</span>
                      <strong className="info-value">
                        {searchResult.criadorEmail ? searchResult.criadorEmail.split('@')[0].toUpperCase() : 'SISTEMA'}
                      </strong>
                    </div>
                  </div>

                  <div className="info-row">
                    {searchResult.efetivado ? (
                      <CheckCircle size={18} style={{ color: '#28a745' }} className="info-icon" />
                    ) : (
                      <Clock size={18} style={{ color: 'var(--secondary)' }} className="info-icon" />
                    )}
                    <div>
                      <span className="info-label">Status</span>
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
                      const dataStr = searchResult.dataCalculada; 
                      const numRomaneio = String(searchResult.romaneio || searchResult.numero || '').trim();

                      fecharModal();

                      const destinoUrl = isAdmin 
                        ? `/operacao-adm?date=${dataStr}&openRomaneio=${encodeURIComponent(numRomaneio)}`
                        : `/operacao?date=${dataStr}&openRomaneio=${encodeURIComponent(numRomaneio)}`;

                      if (isAdmin) {
                        navigate(destinoUrl, { state: { fromTransition: true } });
                        return;
                      }

                      // Bloqueios de Segurança para Conferentes
                      const isOwner = searchResult.criadorUid === user.uid;
                      const isLinked = searchResult.uidsVinculados && searchResult.uidsVinculados.includes(user.uid);
                      
                      if (!isOwner && !isLinked && !searchResult.isOp) {
                        setShowAccessDenied(true); 
                        return;
                      }

                      navigate(destinoUrl, { state: { fromTransition: true } });
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