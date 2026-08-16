// src/components/ModalConfirmarExclusao.jsx
import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ModalConfirmarExclusao({
  pedidoParaExcluir,
  onConfirmar,
  onCancelar,
  isExcluindo
}) {
  if (!pedidoParaExcluir) return null;

  return (
    <div 
      className="animate-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 15, 29, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      onClick={() => !isExcluindo && onCancelar()}
    >
      <div 
        className="animate-modal"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '20px',
          maxWidth: '440px',
          width: '100%',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar no Topo */}
        {!isExcluindo && (
          <button
            onClick={onCancelar}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '6px',
              transition: 'color 0.2s'
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Halo e Ícone de Alerta */}
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          marginBottom: '20px',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.2)'
        }}>
          <Trash2 size={34} />
        </div>

        {/* Título e Textos Informativos */}
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: 900,
          color: 'var(--text-main, #0f172a)',
          margin: '0 0 8px 0',
          letterSpacing: '-0.4px'
        }}>
          Excluir Pedido?
        </h3>

        <p style={{
          fontSize: '0.88rem',
          color: 'var(--text-muted, #64748b)',
          lineHeight: '1.5',
          margin: '0 0 20px 0'
        }}>
          Você está prestes a remover o romaneio <strong style={{ color: 'var(--text-main, #0f172a)' }}>{pedidoParaExcluir.romaneio || 'S/N'}</strong> ({pedidoParaExcluir.loja || 'Destino'}). Esta ação é permanente e não poderá ser desfeita.
        </p>

        {/* Tag de Alerta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          padding: '8px 14px',
          borderRadius: '10px',
          marginBottom: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, textAlign: 'left' }}>
            Todas as caixas, documentos e contagens de SKUs vinculados serão apagados do banco de dados.
          </span>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={onCancelar}
            disabled={isExcluindo}
            style={{
              flex: 1,
              padding: '11px 16px',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '10px',
              color: 'var(--text-main, #475569)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: isExcluindo ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              fontFamily: 'inherit'
            }}
          >
            Cancelar
          </button>

          <button
            onClick={onConfirmar}
            disabled={isExcluindo}
            style={{
              flex: 1.2,
              padding: '11px 18px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: isExcluindo ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            {isExcluindo ? <Loader2 size={16} className="fa-spin" /> : <Trash2 size={16} />}
            {isExcluindo ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}