import React from 'react';
import { Download, Monitor, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoEgaplast from '../img/egaplast.png';

export default function DownloadApp() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #09090b 0%, #0f172a 50%, #020617 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
      color: '#f8fafc'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        <img 
          src={logoEgaplast} 
          alt="Egaplast" 
          style={{ height: '48px', marginBottom: '20px', objectFit: 'contain' }} 
        />
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0' }}>
          Instalador Oficial
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 28px 0', lineHeight: 1.5 }}>
          Baixe o software do checkout com execução em tela cheia e performance otimizada para a expedição.
        </p>

        {/* Card de informações do executável */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
            <Monitor size={16} color="#38bdf8" /> <span>Versão Desktop: <strong>1.0.0 (Windows 64-bit)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
            <CheckCircle2 size={16} color="#10b981" /> <span>Modo Kiosk (Tela Cheia Nativa)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
            <ShieldCheck size={16} color="#3b82f6" /> <span>Ambiente: <strong>Produção / Beta</strong></span>
          </div>
        </div>

        {/* Botão de Download Direto sem a propriedade download */}
<a 
  href="https://github.com/dennercauan/Checkout-EgaplastREACT/releases/download/beta/Checkout.Egaplast.Setup.1.0.0.exe" 
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#3b82f6',
    color: '#fff',
    textDecoration: 'none',
    padding: '14px 20px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
    transition: 'transform 0.2s, background 0.2s',
    marginBottom: '16px'
  }}
>
  <Download size={20} /> Baixar Instalador (.exe)
</a>

        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '0 auto',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={14} /> Voltar para o Login Web
        </button>
      </div>
    </div>
  );
}