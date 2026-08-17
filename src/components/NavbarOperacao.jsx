// src/components/NavbarOperacao.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Search, Power, ArrowLeft, Calendar, UserCircle, Settings, 
  Palette, Camera, CheckCircle, SearchX, Loader2, Plus, CalendarIcon
} from 'lucide-react';

import logoEgaplast from '../img/egaplast.png';

export default function NavbarOperacao({ 
  user, 
  isAdmin, 
  dataOperacaoAtiva, 
  buscaRomaneio, 
  setBuscaRomaneio 
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  const temaPersistido = localStorage.getItem('egaplast_theme') || 'light';

  // 1. Controle de bloqueio duplo
  const [isSaindo, setIsSaindo] = useState(false);

  // ==========================================
  // CORTINA GLOBAL ABSOLUTA (ANTI-FLASH BRANCO)
  // ==========================================
  const handleVoltarDashboard = () => {
    if (isSaindo) return;
    setIsSaindo(true); 

    const tema = document.documentElement.getAttribute('data-theme') || 'light';
    let bgColors = {
      'light': '#f8fafc',
      'dark-blue': '#030814',
      'dark': '#050507'
    };
    
    // Cria uma div bruta no navegador, protegida contra as montagens do React
    const curtain = document.createElement('div');
    curtain.id = 'global-transition-curtain';
    curtain.style.cssText = `
      position: fixed; inset: 0; z-index: 99999999;
      background: ${bgColors[tema] || '#0f172a'};
      opacity: 0; transition: opacity 0.25s ease-out; pointer-events: all;
    `;
    document.body.appendChild(curtain);
    
    // Força o browser a processar a div antes de animá-la
    void curtain.offsetWidth;
    curtain.style.opacity = '1';

    // Aguarda a tela escurecer antes de mandar o Router trocar a rota
    setTimeout(() => {
      navigate('/dashboard', { state: { fromTransition: true } });
      
      // Destrói a cortina suavemente somente após a Dashboard nova já estar fluída na tela
      setTimeout(() => {
        const c = document.getElementById('global-transition-curtain');
        if (c) {
           c.style.opacity = '0';
           setTimeout(() => c.remove(), 300);
        }
      }, 200); 
    }, 300);
  };
  
  const [userProfile, setUserProfile] = useState({ nickname: '', photoURL: '', theme: temaPersistido });
  const [formProfile, setFormProfile] = useState({ nickname: '', photoURL: '', theme: temaPersistido });

  const aplicarTemaGlobal = (tema) => {
    const root = document.documentElement;
    const temaFinal = tema || localStorage.getItem('egaplast_theme') || 'light';
    
    root.setAttribute('data-theme', temaFinal);
    localStorage.setItem('egaplast_theme', temaFinal);

    if (temaFinal === 'dark') {
      root.style.setProperty('--bg-main', 'radial-gradient(circle at 10% 10%, #181820 0%, #0c0c10 45%, #050507 100%)');
      root.style.setProperty('--bg-card', 'linear-gradient(160deg, rgba(28, 28, 36, 0.85) 0%, rgba(16, 16, 22, 0.95) 100%)');
      root.style.setProperty('--bg-card-hover', 'linear-gradient(160deg, rgba(38, 38, 50, 0.9) 0%, rgba(22, 22, 30, 0.98) 100%)');
      root.style.setProperty('--bg-input', 'linear-gradient(145deg, rgba(20, 20, 26, 0.8) 0%, rgba(12, 12, 16, 0.9) 100%)');
      root.style.setProperty('--text-main', '#f4f4f6');
      root.style.setProperty('--text-muted', '#8f909e');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.09)');
      root.style.setProperty('--border-color-hover', 'rgba(255, 255, 255, 0.22)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)');
      root.style.setProperty('--text-highlight', '#ffffff');
      root.style.setProperty('--row-bg', 'linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.01) 100%)');
      root.style.setProperty('--row-hover', 'linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.025) 100%)');
      root.style.setProperty('--btn-action-bg', 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)');
      root.style.setProperty('--btn-action-hover', 'linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.06) 100%)');
      root.style.setProperty('--kpi-bg', 'linear-gradient(160deg, rgba(24, 24, 32, 0.9) 0%, rgba(14, 14, 18, 0.95) 100%)');
      root.style.setProperty('--glow-accent', 'rgba(255, 255, 255, 0.05)');
      document.body.style.background = '#050507';

    } else if (temaFinal === 'dark-blue') {
      root.style.setProperty('--bg-main', 'radial-gradient(ellipse at 15% 15%, #0c1e3f 0%, #071228 45%, #030814 100%)');
      root.style.setProperty('--bg-card', 'linear-gradient(160deg, rgba(14, 30, 62, 0.75) 0%, rgba(7, 18, 40, 0.95) 100%)');
      root.style.setProperty('--bg-card-hover', 'linear-gradient(160deg, rgba(20, 42, 85, 0.85) 0%, rgba(10, 24, 52, 0.98) 100%)');
      root.style.setProperty('--bg-input', 'linear-gradient(145deg, rgba(8, 22, 48, 0.8) 0%, rgba(4, 12, 28, 0.9) 100%)');
      root.style.setProperty('--text-main', '#f0f9ff');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(56, 189, 248, 0.16)');
      root.style.setProperty('--border-color-hover', 'rgba(56, 189, 248, 0.35)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)');
      root.style.setProperty('--text-highlight', '#38bdf8');
      root.style.setProperty('--row-bg', 'linear-gradient(90deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.01) 100%)');
      root.style.setProperty('--row-hover', 'linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.02) 100%)');
      root.style.setProperty('--btn-action-bg', 'linear-gradient(145deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.04) 100%)');
      root.style.setProperty('--btn-action-hover', 'linear-gradient(145deg, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0.08) 100%)');
      root.style.setProperty('--kpi-bg', 'linear-gradient(160deg, rgba(14, 30, 62, 0.85) 0%, rgba(6, 16, 36, 0.95) 100%)');
      root.style.setProperty('--glow-accent', 'rgba(56, 189, 248, 0.15)');
      document.body.style.background = '#030814';

    } else {
      root.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #e0e7ff 0%, #edf2f7 40%, #f8fafc 100%)');
      root.style.setProperty('--bg-card', 'linear-gradient(160deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)');
      root.style.setProperty('--bg-card-hover', 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)');
      root.style.setProperty('--bg-input', 'linear-gradient(145deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.5) 100%)');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(203, 213, 225, 0.7)');
      root.style.setProperty('--border-color-hover', 'rgba(148, 163, 184, 0.8)');
      root.style.setProperty('--logo-filter', 'none');
      root.style.setProperty('--text-highlight', 'var(--primary)');
      root.style.setProperty('--row-bg', 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.4) 100%)');
      root.style.setProperty('--row-hover', 'linear-gradient(90deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.4) 100%)');
      root.style.setProperty('--btn-action-bg', 'linear-gradient(145deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.5) 100%)');
      root.style.setProperty('--btn-action-hover', 'linear-gradient(145deg, rgba(226, 232, 240, 0.9) 0%, rgba(203, 213, 225, 0.7) 100%)');
      root.style.setProperty('--kpi-bg', 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)');
      root.style.setProperty('--glow-accent', 'rgba(13, 50, 105, 0.04)');
      document.body.style.background = '#f8fafc';
    }
  };
  
  useEffect(() => {
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
    if (file.size > 1024 * 1024) return alert("A imagem é muito pesada. Escolha uma imagem de até 1MB.");
    
    const reader = new FileReader();
    reader.onloadend = () => setFormProfile(prev => ({ ...prev, photoURL: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
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

  const displayName = userProfile.nickname || (user?.email ? user.email.split('@')[0] : 'Usuário');

  return (
    <>
      <nav style={{ 
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-card)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '12px 24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={handleVoltarDashboard} 
              style={{ 
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                width: '38px', 
                height: '38px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--text-muted)', 
                cursor: 'pointer', 
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.color = 'var(--primary)'; 
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.color = 'var(--text-muted)'; 
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              title="Voltar ao Painel"
            >
              <ArrowLeft size={18} />
            </button>
            
            <img 
              src={logoEgaplast} 
              alt="Egaplast Logo" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'var(--logo-filter, none)', cursor: 'pointer' }} 
              onClick={handleVoltarDashboard} 
            />
            
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Olá, <span style={{ color: 'var(--text-highlight, #38bdf8)' }}>{displayName}</span>
              </span>
            </div>
          </div>

          {/* ... restante dos controles de Data, Conta e Settings permanecem inalterados no Lado Direito ... */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            <div 
              style={{ 
                position: 'relative',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--bg-card, rgba(255, 255, 255, 0.05))', 
                padding: '8px 14px', 
                borderRadius: '10px', 
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                color: 'var(--text-main, #f8fafc)',
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '0.3px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-highlight, #38bdf8)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color, rgba(255, 255, 255, 0.15))'}
            >
              <CalendarIcon size={16} style={{ color: 'var(--text-highlight, #38bdf8)', pointerEvents: 'none' }} />
              
              <span style={{ pointerEvents: 'none' }}>
                {dataOperacaoAtiva.split('-').reverse().join('/')}
              </span>

              <input 
                type="date" 
                value={dataOperacaoAtiva} 
                onChange={(e) => {
                  if (e.target.value) {
                    navigate(`${location.pathname}?date=${e.target.value}`, { 
                      state: { fromTransition: true } 
                    });
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
            </div>

            <div className="user-profile-section" ref={dropdownRef} style={{ position: 'relative' }}>
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer', 
                  padding: '4px 8px', 
                  borderRadius: '10px', 
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-highlight)', fontSize: '0.85rem', lineHeight: '1.2' }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {isAdmin ? 'Administrador' : 'Conferente'}
                  </span>
                </div>

                {userProfile.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt="Perfil" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                  />
                ) : (
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'var(--primary)', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '0.95rem' 
                  }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {isProfileMenuOpen && (
                <div style={{ 
                  position: 'absolute', 
                  top: 'calc(100% + 8px)', 
                  right: 0, 
                  background: 'var(--bg-card, #ffffff)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  width: '210px', 
                  boxShadow: '0 15px 35px rgba(0,0,0,0.15)', 
                  overflow: 'hidden', 
                  zIndex: 100, 
                  animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sessão Ativa</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all', fontWeight: 500 }}>{user?.email}</span>
                  </div>
                  
                  <div style={{ padding: '4px' }}>
                    <button 
                      onClick={handleOpenSettings} 
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '9px 12px', 
                        background: 'transparent', 
                        border: 'none', 
                        textAlign: 'left', 
                        color: 'var(--text-main)', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        cursor: 'pointer', 
                        borderRadius: '8px', 
                        fontFamily: 'inherit',
                        transition: 'background 0.2s ease'
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} 
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <UserCircle size={16} /> Meu Perfil e Tema
                    </button>
                    <button 
                      onClick={() => { setIsProfileMenuOpen(false); setShowLogoutConfirm(true); }} 
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '9px 12px', 
                        background: 'transparent', 
                        border: 'none', 
                        textAlign: 'left', 
                        color: '#ef4444', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        cursor: 'pointer', 
                        borderRadius: '8px', 
                        fontFamily: 'inherit',
                        transition: 'background 0.2s ease'
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'} 
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Power size={16} /> Sair da Conta
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>

      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', fontFamily: "'Inter', sans-serif" }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '480px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: '#f8fafc', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15rem', fontWeight: 800 }}>
                <Settings size={20} color="var(--primary)"/> Configurações da Conta
              </h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><SearchX size={22}/></button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  {formProfile.photoURL ? (
                    <img src={formProfile.photoURL} alt="Preview" style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                  ) : (
                    <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCircle size={38} />
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--primary)', color: '#fff', padding: '7px', borderRadius: '50%', cursor: 'pointer', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Importar imagem">
                    <Camera size={14} />
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                {formProfile.photoURL && (
                  <button onClick={() => setFormProfile(prev => ({ ...prev, photoURL: '' }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}>Remover Foto</button>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Como quer ser chamado?</label>
                <input type="text" value={formProfile.nickname} onChange={e => setFormProfile({...formProfile, nickname: e.target.value})} placeholder="Ex: João Silva" style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}><Palette size={13} style={{ display: 'inline', marginRight: '4px' }}/> Tema da Plataforma</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'light'})} style={{ border: `2px solid ${formProfile.theme === 'light' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'light' ? '#f0f9ff' : '#fff' }}>
                    <div style={{ width: '100%', height: '36px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '6px' }}></div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Claro</span>
                  </div>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'dark-blue'})} style={{ border: `2px solid ${formProfile.theme === 'dark-blue' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'dark-blue' ? '#eff6ff' : '#fff' }}>
                    <div style={{ width: '100%', height: '36px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', marginBottom: '6px' }}></div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Navy</span>
                  </div>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'dark'})} style={{ border: `2px solid ${formProfile.theme === 'dark' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'dark' ? '#f8fafc' : '#fff' }}>
                    <div style={{ width: '100%', height: '36px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', marginBottom: '6px' }}></div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Escuro</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowSettingsModal(false)} disabled={isSavingProfile} style={{ padding: '9px 16px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={handleSaveProfile} disabled={isSavingProfile} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {isSavingProfile ? <Loader2 size={16} className="fa-spin"/> : <CheckCircle size={16}/>} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', fontFamily: "'Inter', sans-serif" }} onClick={() => setShowLogoutConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', maxWidth: '380px', width: '90%', padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#fff5f5', padding: '16px', borderRadius: '50%', marginBottom: '16px', border: '1px solid #ffebeb' }}>
              <Power size={36} color="#dc3545" />
            </div>
            <h3 style={{ fontSize: '1.35rem', color: '#0f172a', margin: '0 0 8px 0', fontWeight: 800 }}>Sair do Sistema?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.4', margin: '0 0 24px 0' }}>Tem certeza que deseja desconectar sua conta agora?</p>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowLogoutConfirm(false)}>Cancelar</button>
              <button style={{ flex: 1, padding: '10px', background: '#dc3545', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} onClick={handleLogout}>Sim, Sair</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}