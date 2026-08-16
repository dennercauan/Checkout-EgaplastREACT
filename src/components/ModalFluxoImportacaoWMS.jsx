// src/components/ModalFluxoImportacaoWMS.jsx
import React, { useState } from 'react';
import { 
  FileSpreadsheet, Boxes, PackageCheck, CheckCircle2, 
  Copy, ArrowRight, Loader2, X, Check, AlertTriangle, Layers
} from 'lucide-react';

export default function ModalFluxoImportacaoWMS({
  etapa, // 'lendo' | 'previa' | 'gravando' | 'sucesso'
  dadosPrevia,
  resumoTexto,
  onConfirmarGravacao,
  onConcluirFluxo,
  onCancelar
}) {
  const [copiado, setCopiado] = useState(false);

  if (!etapa || !dadosPrevia) return null;

  const tipo = dadosPrevia.tipo || 'comum'; // 'comum' | 'master_planejamento' | 'master_auditoria'

  const handleCopiarResumo = () => {
    if (resumoTexto) {
      navigator.clipboard.writeText(resumoTexto);
      setCopiado(true);
      setTimeout(() => {
        onConcluirFluxo();
      }, 1000);
    } else {
      onConcluirFluxo();
    }
  };

  const getTituloHeader = () => {
    if (etapa === 'lendo') return 'Analisando Arquivo CSV...';
    if (etapa === 'gravando') return 'Gravando no Banco de Dados...';
    if (etapa === 'sucesso') {
      if (tipo === 'master_planejamento') return 'Planejamento Carregado!';
      return 'Importação Concluída!';
    }
    // Prévia
    if (tipo === 'master_planejamento') return 'Prévia do Planejamento Master';
    if (tipo === 'master_auditoria') return 'Prévia da Auditoria WMS';
    return 'Prévia da Importação WMS';
  };

  return (
    <div className="op-modal-overlay" style={{ zIndex: 1000002 }}>
      <div 
        className="op-modal-content animate-modal" 
        style={{ 
          maxWidth: '540px', 
          borderRadius: '20px', 
          overflow: 'hidden',
          border: '1px solid var(--border-color, #cbd5e1)',
          background: 'var(--bg-card, #ffffff)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: etapa === 'sucesso' ? 'rgba(16, 185, 129, 0.12)' : (tipo === 'master_planejamento' ? 'rgba(219, 39, 119, 0.12)' : 'rgba(14, 165, 233, 0.12)'), 
              color: etapa === 'sucesso' ? '#10b981' : (tipo === 'master_planejamento' ? '#db2777' : '#0ea5e9'), 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {etapa === 'sucesso' ? <CheckCircle2 size={20} /> : <FileSpreadsheet size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {getTituloHeader()}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{dadosPrevia.fileName}</span>
            </div>
          </div>
          {(etapa === 'previa' || etapa === 'sucesso') && (
            <button onClick={onCancelar} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* CORPO */}
        <div style={{ padding: '24px' }}>
          
          {/* ETAPA 1: LENDO */}
          {etapa === 'lendo' && (
            <div style={{ textAlign: 'center', padding: '25px 10px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 18px auto' }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid #e2e8f0', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '3px solid #0ea5e9', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <Boxes size={24} color="#0ea5e9" style={{ position: 'absolute', inset: '18px' }} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {tipo === 'master_planejamento' ? 'Cruzando com Dicionário Master' : 'Processando Carga de Dados'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                {tipo === 'master_planejamento' 
                  ? 'Verificando divisões perfeitas de caixas e códigos de barra cadastrados...'
                  : 'Indexando caixas conferidas, status e produtos vinculados...'}
              </p>
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginTop: '20px' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #0ea5e9, #10b981)', animation: 'progressPulse 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* ETAPA 2: PRÉVIA */}
          {etapa === 'previa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Cards de Métricas para Planejamento Master */}
              {tipo === 'master_planejamento' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SKUs Lidos</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0d3269', marginTop: '2px' }}>
                        {dadosPrevia.totalSkusCount}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unidades</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0ea5e9', marginTop: '2px' }}>
                        {dadosPrevia.totalUnidades}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Est. Volumes</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {dadosPrevia.volumesEstimados}
                      </div>
                    </div>
                  </div>

                  {dadosPrevia.skusPendentes > 0 ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={20} color="#ef4444" />
                      <div style={{ fontSize: '0.82rem', color: '#991b1b', lineHeight: 1.3 }}>
                        <strong>{dadosPrevia.skusPendentes} SKU(s) sem variação cadastrada.</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>Você poderá cadastrar as variações faltantes diretamente na tabela.</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={20} color="#16a34a" />
                      <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>Todos os SKUs possuem correspondência no dicionário Master!</span>
                    </div>
                  )}
                </>
              ) : (
                /* Cards de Métricas para Auditoria e Pedidos Comuns */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Caixas Lidas</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0d3269', marginTop: '2px' }}>
                        {dadosPrevia.totalCaixas}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Itens / SKUs</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0ea5e9', marginTop: '2px' }}>
                        {dadosPrevia.totalSkus}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Peso Bruto</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {dadosPrevia.pesoTotal.toFixed(1)}<span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>kg</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PackageCheck size={14} color="#10b981" /> Amostra das Embalagens Lidas:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                      {dadosPrevia.amostraNomes.map((nome, idx) => (
                        <span key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                          {nome}
                        </span>
                      ))}
                      {dadosPrevia.totalCaixas > 8 && (
                        <span style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          +{dadosPrevia.totalCaixas - 8} caixas...
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ETAPA 3: GRAVANDO */}
          {etapa === 'gravando' && (
            <div style={{ textAlign: 'center', padding: '25px 10px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#10b981' }}>
                <Loader2 size={30} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Sincronizando com o Servidor
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                {tipo === 'master_planejamento' 
                  ? 'Salvando estrutura de planejamento na sessão do documento...'
                  : 'Atualizando romaneio, consolidando auditoria e finalizando pedido...'}
              </p>
            </div>
          )}

          {/* ETAPA 4: SUCESSO & PERGUNTA DE CÓPIA */}
          {etapa === 'sucesso' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ background: '#ecfdf5', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#10b981', boxShadow: '0 0 0 8px #f0fdf4' }}>
                <CheckCircle2 size={36} />
              </div>
              
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                {tipo === 'master_planejamento' ? 'Planejamento Salvo!' : 'Caixas Injetadas com Sucesso!'}
              </h3>
              
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                {tipo === 'master_planejamento'
                  ? `Foram processados ${dadosPrevia.totalSkusCount} SKUs (${dadosPrevia.volumesEstimados} volumes estimados). A estação de trabalho já está pronta.`
                  : `Foram salvas ${dadosPrevia.totalCaixas} caixas (${dadosPrevia.totalSkus} SKUs). Deseja copiar o resumo formatado para a expedição?`}
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={onConcluirFluxo}
                  style={{
                    flex: 1, padding: '11px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                    borderRadius: '10px', color: '#475569', fontWeight: 700, fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  {tipo === 'master_planejamento' ? 'Abrir Estação Master' : 'Ir para as Caixas'} <ArrowRight size={15} />
                </button>

                {tipo !== 'master_planejamento' && (
                  <button
                    onClick={handleCopiarResumo}
                    style={{
                      flex: 1.2, padding: '11px 16px', background: copiado ? '#10b981' : 'var(--primary, #0d3269)',
                      color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      boxShadow: '0 4px 12px rgba(13, 50, 105, 0.2)', transition: 'all 0.2s'
                    }}
                  >
                    {copiado ? <Check size={16} /> : <Copy size={16} />}
                    {copiado ? 'Copiado!' : 'Copiar Resumo'}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER PARA CONFIRMAÇÃO DA PRÉVIA */}
        {etapa === 'previa' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: 'rgba(0,0,0,0.01)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              onClick={onCancelar} 
              style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}
            >
              Descartar
            </button>

            <button 
              onClick={onConfirmarGravacao} 
              style={{ padding: '9px 20px', background: 'var(--primary, #0d3269)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13, 50, 105, 0.2)' }}
            >
              <CheckCircle2 size={16} /> 
              {tipo === 'master_planejamento' ? 'Confirmar Planejamento' : 'Confirmar & Injetar Caixas'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}