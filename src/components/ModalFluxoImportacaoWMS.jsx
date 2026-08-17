// src/components/ModalFluxoImportacaoWMS.jsx
import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Boxes, PackageCheck, CheckCircle2, 
  Copy, ArrowRight, Loader2, X, Check, AlertTriangle
} from 'lucide-react';

export default function ModalFluxoImportacaoWMS({
  etapa,
  dadosPrevia,
  resumoTexto,
  onConfirmarGravacao,
  onConcluirFluxo,
  onCancelar
}) {
  const [copiado, setCopiado] = useState(false);

  const tipo = dadosPrevia?.tipo || 'comum';

  // 1. A auditoria é calculada estritamente para pedidos de Caixa Master (master_auditoria)
  const relatorioAuditoria = useMemo(() => {
    if (!dadosPrevia || tipo !== 'master_auditoria' || !dadosPrevia.auditoriaData) {
      return null;
    }
    
    const lista = dadosPrevia.auditoriaData || [];
    let planTotal = 0;
    let realTotal = 0;
    let planPesoTotal = 0;
    let realPesoTotal = 0;
    let divs = 0;

    lista.forEach(i => {
      planTotal += Number(i.qtdPlanejada || 0);
      realTotal += Number(i.qtdEfetivada || 0);
      planPesoTotal += Number(i.pesoPlanejado || 0);
      realPesoTotal += Number(i.pesoEfetivado || 0);
      if (i.diffQtd !== 0) divs++;
    });

    return {
      lista,
      planTotal,
      realTotal,
      planPesoTotal,
      realPesoTotal,
      divergencias: divs
    };
  }, [dadosPrevia, tipo]);

  if (!etapa || !dadosPrevia) return null;

  const handleCopiarResumo = () => {
    if (resumoTexto) {
      navigator.clipboard.writeText(resumoTexto);
      setCopiado(true);
      setTimeout(() => onConcluirFluxo(), 1000);
    } else {
      onConcluirFluxo();
    }
  };

  const getTituloHeader = () => {
    if (etapa === 'lendo') return 'Analisando Arquivo CSV...';
    if (etapa === 'gravando') return 'Gravando no Banco de Dados...';
    if (etapa === 'sucesso') {
      if (tipo === 'master_planejamento') return 'Planejamento Carregado!';
      if (tipo === 'master_auditoria') return 'Auditoria & Importação Concluída!';
      return 'Importação Concluída!';
    }
    if (tipo === 'master_planejamento') return 'Prévia do Planejamento Master';
    if (tipo === 'master_auditoria') return 'Prévia da Auditoria WMS';
    return 'Prévia da Importação WMS';
  };

  const isModalLargo = etapa === 'sucesso' && tipo === 'master_auditoria' && relatorioAuditoria && relatorioAuditoria.lista.length > 0;

  return (
    <div className="op-modal-overlay" style={{ zIndex: 1000002 }}>
      <div 
        className="op-modal-content animate-modal" 
        style={{ 
          maxWidth: isModalLargo ? '820px' : '540px', 
          width: '95%',
          maxHeight: '92vh',
          borderRadius: '20px', 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #cbd5e1)',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '38px', height: '38px', borderRadius: '10px', 
              background: etapa === 'sucesso' 
                ? (tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)') 
                : (tipo === 'master_planejamento' ? 'rgba(219, 39, 119, 0.15)' : 'rgba(14, 165, 233, 0.15)'), 
              color: etapa === 'sucesso' 
                ? (tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0 ? '#f59e0b' : '#10b981') 
                : (tipo === 'master_planejamento' ? '#db2777' : 'var(--text-highlight, #0ea5e9)'), 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {etapa === 'sucesso' ? (
                tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />
              ) : (
                <FileSpreadsheet size={20} />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {getTituloHeader()}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{dadosPrevia.fileName}</span>
            </div>
          </div>
          {(etapa === 'previa' || etapa === 'sucesso') && (
            <button onClick={onCancelar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* CORPO */}
        <div style={{ padding: '24px', background: 'var(--bg-main)', overflowY: 'auto', flex: 1 }}>
          
          {/* ETAPA 1: LENDO */}
          {etapa === 'lendo' && (
            <div style={{ textAlign: 'center', padding: '25px 10px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 18px auto' }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--border-color)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--text-highlight)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <Boxes size={24} color="var(--text-highlight)" style={{ position: 'absolute', inset: '18px' }} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {tipo === 'master_planejamento' 
                  ? 'Cruzando com Dicionário Master' 
                  : (tipo === 'master_auditoria' ? 'Cruzando Caixas com Planejamento' : 'Processando Carga de Dados')}
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {tipo === 'master_planejamento' 
                  ? 'Verificando divisões perfeitas de caixas e códigos de barra cadastrados...'
                  : (tipo === 'master_auditoria' ? 'Comparando tipos de embalagem, pesos e volumes conferidos...' : 'Indexando caixas conferidas, status e produtos vinculados...')}
              </p>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden', marginTop: '20px' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #0ea5e9, #10b981)', animation: 'progressPulse 1.2s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* ETAPA 2: PRÉVIA */}
          {etapa === 'previa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {tipo === 'master_planejamento' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SKUs Lidos</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>{dadosPrevia.totalSkusCount}</div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unidades</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-highlight, #0ea5e9)', marginTop: '2px' }}>{dadosPrevia.totalUnidades}</div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Volumes</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>{dadosPrevia.volumesEstimados}</div>
                    </div>
                  </div>

                  {dadosPrevia.skusPendentes > 0 ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={20} color="#ef4444" />
                      <div style={{ fontSize: '0.82rem', color: '#f87171', lineHeight: 1.3 }}>
                        <strong>{dadosPrevia.skusPendentes} SKU(s) sem variação cadastrada.</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-muted)' }}>Cadastre as variações diretamente na tabela do planejamento.</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>Todos os SKUs possuem correspondência no dicionário Master!</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caixas Lidas</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>{dadosPrevia.totalCaixas}</div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Itens / SKUs</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-highlight, #0ea5e9)', marginTop: '2px' }}>{dadosPrevia.totalSkus}</div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peso Bruto</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>{dadosPrevia.pesoTotal?.toFixed(1) || '0.0'}kg</div>
                    </div>
                  </div>

                  {/* Aviso de divergência apenas para auditoria master */}
                  {tipo === 'master_auditoria' && relatorioAuditoria && (
                    relatorioAuditoria.divergencias > 0 ? (
                      <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={22} color="#f59e0b" />
                        <div style={{ fontSize: '0.82rem', color: '#f59e0b', lineHeight: 1.3 }}>
                          <strong>Atenção: {relatorioAuditoria.divergencias} tipo(s) de caixa com divergência.</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-muted)' }}>O relatório detalhado será gerado após confirmar a gravação.</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={20} color="#10b981" />
                        <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>Conformidade total com o planejamento!</span>
                      </div>
                    )
                  )}

                  {/* Amostra visual de embalagens */}
                  {dadosPrevia.amostraNomes && dadosPrevia.amostraNomes.length > 0 && (
                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PackageCheck size={14} color="#10b981" /> Amostra das Embalagens Lidas:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                        {dadosPrevia.amostraNomes.map((nome, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '4px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {nome}
                          </span>
                        ))}
                        {dadosPrevia.totalCaixas > 8 && (
                          <span style={{ padding: '4px 6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            +{dadosPrevia.totalCaixas - 8} caixas...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ETAPA 3: GRAVANDO */}
          {etapa === 'gravando' && (
            <div style={{ textAlign: 'center', padding: '25px 10px' }}>
              <Loader2 size={32} className="fa-spin" style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Sincronizando com o Servidor
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {tipo === 'master_planejamento' 
                  ? 'Salvando estrutura de planejamento...' 
                  : 'Atualizando romaneio e gravando caixas no histórico...'}
              </p>
            </div>
          )}

          {/* ETAPA 4: SUCESSO */}
          {etapa === 'sucesso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  background: (tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0) ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                  width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', 
                  color: (tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0) ? '#f59e0b' : '#10b981'
                }}>
                  {tipo === 'master_auditoria' && relatorioAuditoria?.divergencias > 0 ? <AlertTriangle size={30} /> : <CheckCircle2 size={30} />}
                </div>
                
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                  {tipo === 'master_planejamento' 
                    ? 'Planejamento Salvo!' 
                    : (tipo === 'master_auditoria' 
                        ? (relatorioAuditoria?.divergencias === 0 ? 'Auditoria 100% Conforme!' : `Auditoria com ${relatorioAuditoria?.divergencias} Divergência(s)`) 
                        : 'Caixas Injetadas com Sucesso!')}
                </h3>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
                  {tipo === 'master_planejamento'
                    ? `Foram processados ${dadosPrevia.totalSkusCount} SKUs (${dadosPrevia.volumesEstimados} volumes estimados).`
                    : (tipo === 'master_auditoria' && relatorioAuditoria
                        ? `Planejado: ${relatorioAuditoria.planTotal} cx (${relatorioAuditoria.planPesoTotal.toFixed(1)}kg) | WMS: ${relatorioAuditoria.realTotal} cx (${relatorioAuditoria.realPesoTotal.toFixed(1)}kg)`
                        : `Foram salvas ${dadosPrevia.totalCaixas} caixas (${dadosPrevia.totalSkus} SKUs). Deseja copiar o resumo formatado?`)}
                </p>
              </div>

              {/* TABELA DE AUDITORIA EXCLUSIVA PARA PEDIDOS CAIXA MASTER */}
              {tipo === 'master_auditoria' && relatorioAuditoria && relatorioAuditoria.lista.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Boxes size={15} color="var(--text-highlight, #38bdf8)" /> Conciliação de Embalagens (Planejado x Real WMS)
                    </span>
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 5, borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.7rem' }}>TIPO CAIXA</th>
                          <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>PLANEJADO</th>
                          <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>WMS REAL</th>
                          <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>PESO (PLAN / REAL)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorioAuditoria.lista.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: item.status !== 'correto' ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <strong style={{ color: 'var(--text-highlight, #38bdf8)' }}>{item.tipoCaixa}</strong>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{item.qtdPlanejada} un</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>{item.qtdEfetivada} un</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.pesoPlanejado.toFixed(1)}kg / <strong style={{ color: 'var(--text-main)' }}>{item.pesoEfetivado.toFixed(1)}kg</strong>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {item.status === 'correto' ? (
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>OK</span>
                              ) : item.status === 'falta' ? (
                                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>{item.diffQtd} cx</span>
                              ) : (
                                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>+{item.diffQtd} cx</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AÇÕES DE CONCLUSÃO */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '6px' }}>
                <button
                  onClick={onConcluirFluxo}
                  style={{
                    flex: 1, padding: '11px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                    borderRadius: '10px', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.88rem',
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
                      boxShadow: '0 4px 12px rgba(13, 50, 105, 0.25)'
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

        {/* FOOTER */}
        {etapa === 'previa' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
            <button onClick={onCancelar} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Descartar
            </button>
            <button onClick={onConfirmarGravacao} style={{ padding: '10px 20px', background: 'var(--primary, #0d3269)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> Confirmar & Injetar Caixas
            </button>
          </div>
        )}

      </div>
    </div>
  );
}