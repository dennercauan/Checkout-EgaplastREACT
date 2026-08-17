// src/components/TransicaoOperacaoOverlay.jsx
import React from 'react';
import { Boxes } from 'lucide-react';

export default function TransicaoOperacaoOverlay({ isVisible, isExiting }) {
  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'var(--bg-main, #09090b)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div style={{ position: 'relative', width: '70px', height: '70px', marginBottom: '22px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--border-color, rgba(255,255,255,0.1))', borderRadius: '50%' }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '3px solid var(--primary, #0ea5e9)',
          borderRadius: '50%',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite'
        }} />
        <Boxes size={28} color="var(--text-highlight, #0ea5e9)" style={{ position: 'absolute', inset: '21px' }} />
      </div>

      <h3 style={{
        margin: '0 0 6px 0',
        fontSize: '1.2rem',
        fontWeight: 800,
        color: 'var(--text-main, #ffffff)',
        letterSpacing: '-0.3px'
      }}>
        Sintonizando Estação de Operação...
      </h3>
      <p style={{
        margin: 0,
        fontSize: '0.85rem',
        color: 'var(--text-muted, #94a3b8)',
        fontWeight: 500
      }}>
        Carregando romaneios, métricas de conferência e status ao vivo.
      </p>

      <div style={{ width: '220px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', marginTop: '24px' }}>
        <div style={{
          height: '100%',
          width: '100%',
          background: 'linear-gradient(90deg, #0ea5e9, #10b981)',
          animation: 'progressPulse 1.1s ease-in-out infinite'
        }} />
      </div>
    </div>
  );
}