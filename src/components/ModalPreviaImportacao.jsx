// src/components/ModalPreviaImportacao.jsx
import React from 'react';
import { PackageCheck, Boxes, FileSpreadsheet, Loader2, CheckCircle2, X, ArrowRight } from 'lucide-react';

export default function ModalPreviaImportacao({
  dadosPrevia,
  isLoading,
  onConfirmar,
  onCancelar,
  isSaving
}) {
  if (!dadosPrevia) return null;

  return (
    <div className="op-modal-overlay" style={{ zIndex: 1000002 }}>
      <div 
        className="op-modal-content" 
        style={{ 
          maxWidth: '520px', 
          width: '95%',
          borderRadius: '20px', 
          overflow: 'hidden',
          border: '1px solid var(--border-color, #cbd5e1)',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--text-highlight, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {isLoading ? 'Analisando Arquivo...' : 'Prévia da Importação WMS'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{dadosPrevia.fileName}</span>
            </div>
          </div>
          {!isLoading && !isSaving && (
            <button onClick={onCancelar} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* CORPO */}
        <div style={{ padding: '24px', background: 'var(--bg-main, #f8fafc)' }}>
          {isLoading ? (
            /* ESTADO 1: FAKE LOADING ANALÍTICO */
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 20px auto' }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--border-color, #e2e8f0)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--text-highlight, #0ea5e9)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <Boxes size={24} color="var(--text-highlight, #0ea5e9)" style={{ position: 'absolute', inset: '18px' }} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Processando Carga de Dados
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                Indexando embalagens físicas, pesos e referências de SKU...
              </p>
              
              {/* Barra de Progresso Animada */}
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-input, #f1f5f9)', borderRadius: '10px', overflow: 'hidden', marginTop: '20px' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #0ea5e9, #10b981)', animation: 'progressPulse 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          ) : (
            /* ESTADO 2: RESUMO CONFIRMATÓRIO */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-card, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Caixas</span>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main, #0d3269)', marginTop: '2px' }}>
                    {dadosPrevia.totalCaixas}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Itens / SKUs</span>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-highlight, #0ea5e9)', marginTop: '2px' }}>
                    {dadosPrevia.totalSkus}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Peso Total</span>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                    {dadosPrevia.pesoTotal.toFixed(1)}<span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>kg</span>
                  </div>
                </div>
              </div>

              {/* Lista dos primeiros volumes identificados */}
              <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.05))', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #475569)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PackageCheck size={14} color="#10b981" /> Amostra das Embalagens Lidas:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                  {dadosPrevia.amostraNomes.map((nome, idx) => (
                    <span key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color, #cbd5e1)', padding: '4px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main, #334155)' }}>
                      {nome}
                    </span>
                  ))}
                  {dadosPrevia.totalCaixas > 8 && (
                    <span style={{ padding: '4px 6px', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                      +{dadosPrevia.totalCaixas - 8} caixas...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {!isLoading && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              onClick={onCancelar} 
              disabled={isSaving}
              style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Descartar
            </button>

            <button 
              onClick={onConfirmar} 
              disabled={isSaving}
              style={{ padding: '10px 20px', background: 'var(--primary, #0d3269)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13, 50, 105, 0.25)' }}
            >
              {isSaving ? <Loader2 size={16} className="fa-spin" /> : <CheckCircle2 size={16} />}
              Confirmar & Injetar Caixas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}