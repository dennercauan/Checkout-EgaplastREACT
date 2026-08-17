// src/components/ModalDetalhesPedido.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, Info, X, Layers, Search, Loader2, UploadCloud, 
  PieChart, CheckCircle2, ArrowUpDown, ChevronDown, Copy, 
  Package, AlignLeft, Edit, FileText, Plus, Trash2, User,
  Scale, AlertTriangle, Check
} from 'lucide-react';

export default function ModalDetalhesPedido({
  showDetalhesModal,
  setShowDetalhesModal,
  pedidoModal,
  isSaving,
  isUploading,
  activeTab,
  setActiveTab,
  wmsSessions,
  setWmsSessions,
  buscasDocumentos,
  handleBuscaDocumento,
  wmsPreResumoAberto,
  setWmsPreResumoAberto,
  setShowCaixasEfetivadasModal,
  setAuditModalData,
  handlePlanejamentoUpload,
  handleUploadWMSComum,
  handleAuditoriaUpload,
  docIndexSelecionado,
  setDocIndexSelecionado,
  skusExpandidos,
  setSkusExpandidos,
  skusExpandidosComum,
  setSkusExpandidosComum,
  handleInputManual,
  abrirModalSalvarManual,
  handleMudarVariacao,
  isEditingObs,
  setIsEditingObs,
  observacoes,
  setObservacoes,
  docTipo,
  setDocTipo,
  docResponsavel,
  setDocResponsavel,
  localUser,
  usuarios,
  handleAddDoc,
  docsTemporarios,
  handleRemoveDoc,
  handleAddResponsavelToDoc,
  handleRemoveResponsavelFromDoc,
  handleSalvarEdicaoTab1
}) {
  const [dropdownPrincipalAberto, setDropdownPrincipalAberto] = useState(false);
  const [dropdownParceiroAberto, setDropdownParceiroAberto] = useState(null);

  const refDropdownPrincipal = useRef(null);
  const refDropdownParceiro = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (refDropdownPrincipal.current && !refDropdownPrincipal.current.contains(event.target)) {
        setDropdownPrincipalAberto(false);
      }
      if (refDropdownParceiro.current && !refDropdownParceiro.current.contains(event.target)) {
        setDropdownParceiroAberto(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!showDetalhesModal || !pedidoModal) return null;

  const listaUsuarios = [];
  if (localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim())) {
    listaUsuarios.push({
      email: String(localUser.email).toLowerCase().trim(),
      nome: String(localUser.email).split('@')[0].toLowerCase()
    });
  }
  usuarios.forEach(u => {
    listaUsuarios.push({
      email: u.email,
      nome: u.email.split('@')[0]
    });
  });

  const usuarioPrincipalSelecionado = listaUsuarios.find(u => u.email === docResponsavel);

  let detalheSkus = 0;
  const cxMapDetalhe = {};
  
  (pedidoModal.documentos || []).forEach(d => {
    const isBonifDoc = String(d.tipo || '').toUpperCase().includes('BONIF');
    (d.caixas || []).forEach(cx => {
       (cx.produtos || []).forEach(p => detalheSkus += parseInt(p.quantidade) || 0);
       
       const isBoxBonif = isBonifDoc || cx.isBonificacao;
       let n = String(cx.num || "CX").toUpperCase();
       
       if (isBoxBonif && !n.includes('BONIF')) n = `${n} BONIF`;

       if(!cxMapDetalhe[n]) cxMapDetalhe[n] = { qtd: 0, peso: 0, originalName: n, isBonif: isBoxBonif };
       cxMapDetalhe[n].qtd++; 
       cxMapDetalhe[n].peso += parseFloat(cx.peso) || 0;
    });
  });

  const resumoOrdenadoComum = Object.values(cxMapDetalhe).sort((a, b) => {
    const isBonifA = Boolean(a.isBonif);
    const isBonifB = Boolean(b.isBonif);
    if (isBonifA !== isBonifB) return isBonifA ? 1 : -1;
    
    const matchA = a.originalName.match(/\d+/);
    const matchB = b.originalName.match(/\d+/);
    const numA = matchA ? parseInt(matchA[0]) : 0;
    const numB = matchB ? parseInt(matchB[0]) : 0;
    
    if (numA === numB) return a.originalName.localeCompare(b.originalName);
    return numA - numB;
  });

  return (
    <div className="op-modal-overlay" onClick={() => !isSaving && setShowDetalhesModal(false)}>
      <div 
        className="op-modal-content" 
        style={{
          width: '98vw', 
          height: '95vh', 
          maxWidth: '1600px', 
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          borderRadius: '16px',
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER FIXO */}
        <div 
          className="op-modal-header" 
          style={{
            flexShrink: 0, 
            padding: '20px 30px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {pedidoModal.isCaixaMaster ? (
                <>
                  <Boxes size={26} color="var(--text-highlight, #38bdf8)"/>
                  <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>
                    Caixas do Pedido <span style={{ color: 'var(--text-muted)', fontWeight: '300', marginLeft: '8px' }}>{pedidoModal.romaneio}</span>
                  </h2>
                </>
            ) : (
                <>
                  <div className="icon-wrap" style={{background: 'var(--btn-action-bg, rgba(255,255,255,0.08))', color: 'var(--text-highlight, #38bdf8)', border: '1px solid var(--border-color)'}}>
                    <Info size={24}/>
                  </div>
                  <div>
                    <h2 style={{ color: 'var(--text-main)', margin: '0 0 2px 0', fontSize: '1.35rem', fontWeight: 800 }}>
                      Painel do Romaneio: <span style={{ color: 'var(--text-highlight, #38bdf8)' }}>{pedidoModal.romaneio}</span>
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      {pedidoModal.loja || 'Destino Padrão'} {pedidoModal.uf ? `- ${pedidoModal.uf}` : ''}
                    </p>
                  </div>
                </>
            )}
          </div>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'color 0.2s' }} 
            onClick={() => setShowDetalhesModal(false)} 
            disabled={isSaving || isUploading}
          >
            <X size={24}/>
          </button>
        </div>
        
        {/* Sistema de Abas */}
        {!pedidoModal.isCaixaMaster && (
          <div 
            className="modal-tabs-container" 
            style={{ 
              display: 'flex', 
              borderBottom: '1px solid var(--border-color)', 
              padding: '0 25px', 
              flexShrink: 0,
              background: 'var(--bg-card)'
            }}
          >
            <button 
              className={`modal-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
              onClick={() => setActiveTab('resumo')}
              style={{ 
                padding: '14px 20px', 
                background: 'none', 
                border: 'none', 
                borderBottom: `3px solid ${activeTab === 'resumo' ? 'var(--text-highlight, #38bdf8)' : 'transparent'}`, 
                color: activeTab === 'resumo' ? 'var(--text-highlight, #38bdf8)' : 'var(--text-muted)', 
                fontWeight: 700, 
                fontSize: '0.92rem', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease' 
              }}
            >
              Resumo Geral
            </button>
            <button 
              className={`modal-tab-btn ${activeTab === 'caixas' ? 'active' : ''}`}
              onClick={() => setActiveTab('caixas')}
              style={{ 
                padding: '14px 20px', 
                background: 'none', 
                border: 'none', 
                borderBottom: `3px solid ${activeTab === 'caixas' ? 'var(--text-highlight, #38bdf8)' : 'transparent'}`, 
                color: activeTab === 'caixas' ? 'var(--text-highlight, #38bdf8)' : 'var(--text-muted)', 
                fontWeight: 700, 
                fontSize: '0.92rem', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease' 
              }}
            >
              Detalhamento Completo & WMS
            </button>
          </div>
        )}
        
        {/* Corpo do Modal */}
        <div 
          className="op-modal-body" 
          style={{ 
            flex: 1, 
            padding: '25px', 
            overflowY: 'auto', 
            background: 'var(--bg-main)',
            color: 'var(--text-main)' 
          }}
        >
          
          {pedidoModal.isCaixaMaster ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {(pedidoModal.documentos || []).map((doc, dIdx) => {
                  
                  let totalVolumesGeral = 0;
                  let resumoTiposCaixa = {};
                  const termoBuscaWms = (buscasDocumentos[dIdx] || '').toLowerCase();
                  
                  const skusFiltrados = wmsSessions[dIdx] ? wmsSessions[dIdx].skus.filter(sku => {
                    if (sku.qtdPadrao > 0) {
                      const cxsDesteSku = Math.ceil(sku.qtdTotal / sku.qtdPadrao);
                      totalVolumesGeral += cxsDesteSku;
                      let tKey = sku.caixaNome || "INDEFINIDO";
                      if (!resumoTiposCaixa[tKey]) resumoTiposCaixa[tKey] = { qtd: 0, peso: 0 };
                      resumoTiposCaixa[tKey].qtd += cxsDesteSku;
                      resumoTiposCaixa[tKey].peso += cxsDesteSku * parseFloat(sku.pesoPadrao || 0);
                    }
                    
                    if (!termoBuscaWms) return true;
                    
                    const ref = (sku.ref || '').toLowerCase();
                    const desc = (sku.desc || '').toLowerCase();
                    const caixa = (sku.caixaNome || '').toLowerCase();
                    
                    return ref.includes(termoBuscaWms) || desc.includes(termoBuscaWms) || caixa.includes(termoBuscaWms);
                  }) : [];

                  return (
                    <div key={`master-doc-${doc.id || doc.idTemp || dIdx}`} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '25px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h4 style={{ color: 'var(--text-highlight, #38bdf8)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                          <Layers size={22} color="var(--text-highlight, #38bdf8)" /> {doc.tipo} 
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'normal' }}>({doc.responsavel?.split('@')[0]})</span>
                        </h4>
                      </div>

                      {/* RELATÓRIO PERSISTENTE DE AUDITORIA */}
                      {doc.auditoria && doc.auditoria.itens && doc.auditoria.itens.length > 0 && (
                        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Boxes size={18} color="var(--text-highlight, #38bdf8)" />
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                Auditoria de Volumes Consolidada
                              </strong>
                              {doc.auditoria.data && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({new Date(doc.auditoria.data).toLocaleDateString('pt-BR')} às {new Date(doc.auditoria.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </div>
                            
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 800, 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              background: (doc.auditoria.divergencias === 0 || doc.auditoria.diferenca === 0) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                              color: (doc.auditoria.divergencias === 0 || doc.auditoria.diferenca === 0) ? '#10b981' : '#ef4444',
                              border: `1px solid ${(doc.auditoria.divergencias === 0 || doc.auditoria.diferenca === 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                              {(doc.auditoria.divergencias === 0 || doc.auditoria.diferenca === 0) 
                                ? '100% Conforme (0 Divergências)' 
                                : `${doc.auditoria.divergencias || Math.abs(doc.auditoria.diferenca)} Divergência(s) Detectada(s)`}
                            </span>
                          </div>

                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.72rem' }}>TIPO CAIXA</th>
                                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.72rem' }}>PLANEJADO</th>
                                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.72rem' }}>WMS REAL</th>
                                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.72rem' }}>PESO (PLAN / REAL)</th>
                                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.72rem' }}>DIFERENÇA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {doc.auditoria.itens.map((it, iIdx) => (
                                  <tr key={`auditoria-item-${it.tipoCaixa || iIdx}`} style={{ borderBottom: '1px dashed var(--border-color)', background: it.status !== 'correto' && it.diffQtd !== 0 ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-highlight, #38bdf8)' }}>
                                      {it.tipoCaixa}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                      {it.qtdPlanejada} cx
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>
                                      {it.qtdEfetivada} cx
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                      {Number(it.pesoPlanejado || 0).toFixed(1)}kg / <strong style={{ color: 'var(--text-main)' }}>{Number(it.pesoEfetivado || 0).toFixed(1)}kg</strong>
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                      {it.diffQtd === 0 ? (
                                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>OK</span>
                                      ) : it.diffQtd < 0 ? (
                                        <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>{it.diffQtd} cx</span>
                                      ) : (
                                        <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>+{it.diffQtd} cx</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {!wmsSessions[dIdx] ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-input, rgba(0,0,0,0.1))', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                          <FileText size={64} color="var(--text-muted)" style={{ marginBottom: '20px', opacity: 0.6 }} />
                          <h3 style={{ color: 'var(--text-main)', margin: '0 0 10px 0', fontSize: '1.5rem', fontWeight: 800 }}>Planejamento de Caixas Master</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '30px' }}>Faça o upload do arquivo CSV extraído do WMS para iniciar o cruzamento de dados de embalagem.</p>
                          
                          <input 
                            type="file" accept=".csv" id={`plan-upload-${dIdx}`} style={{ display: 'none' }} 
                            onChange={(e) => handlePlanejamentoUpload(e, dIdx)} disabled={isUploading}
                          />
                          <label htmlFor={`plan-upload-${dIdx}`} style={{ background: 'var(--primary)', color: '#fff', padding: '14px 35px', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(13, 50, 105, 0.3)' }}>
                            {isUploading ? <Loader2 size={20} className="fa-spin"/> : <UploadCloud size={20}/>}
                            {isUploading ? 'Analisando Base de Dados...' : 'Selecionar Arquivo CSV WMS'}
                          </label>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                              <div style={{ fontSize: '1.3rem', color: 'var(--text-highlight, #38bdf8)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                {wmsSessions[dIdx].loja || pedidoModal.loja || 'LOJA NÃO DEFINIDA'}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Romaneio WMS: <strong style={{ color: 'var(--secondary, #f26522)' }}>{wmsSessions[dIdx].romaneio || pedidoModal.romaneio}</strong>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}/>
                                <input type="text" 
                                  placeholder="Buscar Produto ou SKU..." 
                                  value={buscasDocumentos[dIdx] || ''} 
                                  onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                  style={{ padding: '8px 10px 8px 32px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', width: '220px', background: 'var(--bg-input)', color: 'var(--text-main)' }}/>
                              </div>
                              
                              <div style={{ position: 'relative' }}>
                                <button 
                                  onClick={() => setWmsPreResumoAberto(wmsPreResumoAberto === dIdx ? null : dIdx)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}>
                                  <FileText size={14} color="var(--secondary)"/> Pré-Resumo 
                                  <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>
                                    {totalVolumesGeral}
                                  </span>
                                </button>
                                
                                {wmsPreResumoAberto === dIdx && (
                                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', width: '320px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 50 }}>
                                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800 }}>Volumes Estimados</h4>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                      {Object.keys(resumoTiposCaixa).length === 0 ? <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Nenhuma caixa projetada.</span> : ''}
                                      {Object.keys(resumoTiposCaixa).map(k => (
                                        <div key={`master-pre-resumo-${k}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px dashed var(--border-color)' }}>
                                          <strong style={{ color: 'var(--text-main)' }}>{k}</strong>
                                          <span>{resumoTiposCaixa[k].qtd} un <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span> <strong style={{ color: '#10b981' }}>{resumoTiposCaixa[k].peso.toFixed(1)}kg</strong></span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <button onClick={() => setShowCaixasEfetivadasModal(dIdx)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }} title="Estrutura de Caixas Salvas">
                                <Boxes size={16}/>
                              </button>
                                
                              <button onClick={async () => {
                                if(!window.confirm("Deseja realmente descartar este planejamento?")) return;
                                setWmsSessions(prev => { const n = {...prev}; delete n[dIdx]; return n; });
                              }} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex' }} title="Descartar Planejamento">
                                <Trash2 size={16}/>
                              </button>
                              
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: pedidoModal.documentos[dIdx].caixas?.length > 0 ? '#0ea5e9' : '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
                                {pedidoModal.documentos[dIdx].caixas?.length > 0 ? <PieChart size={16}/> : <CheckCircle2 size={16}/>}
                                {pedidoModal.documentos[dIdx].caixas?.length > 0 ? 'Reimportar WMS' : 'Importar Caixas'}
                                <input 
                                  type="file" 
                                  accept=".csv" 
                                  style={{ display: 'none' }} 
                                  onChange={(e) => {
                                    setAuditModalData({ dIdx });
                                    handleAuditoriaUpload(e, dIdx);
                                  }}
                                  disabled={isSaving}
                                />
                              </label>
                            </div>
                          </div>
                          
                          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUTO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>QTD PEDIDO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO UC</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO CAIXA</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>PESO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>SELECIONAR VARIAÇÃO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>TOTAL CX</th>
                                </tr>
                              </thead>
                              <tbody>
                                {skusFiltrados.length === 0 ? (
                                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum SKU encontrado.</td></tr>
                                ) : (
                                  skusFiltrados.map((sku, i) => {
                                    const isExpanded = skusExpandidos[`${dIdx}-${sku.ref}`];

                                    return (
                                      <React.Fragment key={`sku-row-group-${sku.ref}-${i}`}>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: sku.isMissing ? 'rgba(239, 68, 68, 0.08)' : (isExpanded ? 'var(--bg-input)' : 'transparent'), transition: 'background 0.2s' }}>
                                          <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                              <div 
                                                onClick={() => setSkusExpandidos(prev => ({...prev, [`${dIdx}-${sku.ref}`]: !prev[`${dIdx}-${sku.ref}`]}))}
                                                style={{ marginTop: '2px', cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', padding: '2px' }}
                                                title="Ver caixas deste produto"
                                              >
                                                <ChevronDown size={18} color={isExpanded ? "var(--secondary)" : "var(--text-highlight, #38bdf8)"} />
                                              </div>
                                              
                                              <div>
                                                <strong style={{ color: 'var(--text-highlight, #38bdf8)', fontSize: '0.9rem' }}>{sku.ref}</strong><br/>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{sku.desc}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '1.05rem', color: 'var(--text-main)' }}>{sku.qtdTotal}</td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <input type="number" placeholder="Qtd" value={sku.qtdPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'qtdPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '6px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-main)' }}/>
                                            ) : (
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                CX{sku.qtdPadrao} 
                                                <span title="Copiar Código de Barras" onClick={(e) => {
                                                    const variacao = sku.variacoesDisponiveis && sku.variacoesDisponiveis[sku.variacaoSelecionadaIdx || 0];
                                                    const eanToCopy = variacao?.codigoBarras || sku.codigoBarras || variacao?.ean || sku.ean || 'EAN-NÃO-CADASTRADO';
                                                    if (eanToCopy !== 'EAN-NÃO-CADASTRADO') { navigator.clipboard.writeText(eanToCopy); } else { alert('O campo "codigoBarras" não foi encontrado nesta variação ou produto.'); }
                                                    const spanRef = e.currentTarget;
                                                    spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                                    setTimeout(() => { spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2h9a2 2 0 0 1 2 2v1"></path></svg>'; }, 1500);
                                                  }} style={{ cursor: 'pointer', display: 'flex', padding: '4px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                  <Copy size={15} color="var(--secondary)" />
                                                </span>
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <input type="text" placeholder="Ex: CAIXA 1" value={sku.caixaNome || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'caixaNome', e.target.value)} style={{ width: '90px', padding: '6px', border: '1px solid #ef4444', borderRadius: '6px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-main)' }}/>
                                            ) : (
                                              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{sku.caixaNome}</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <input type="number" step="0.1" placeholder="0.0" value={sku.pesoPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'pesoPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '6px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: 'var(--bg-card)', color: 'var(--text-main)' }}/>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>kg</span>
                                              </div>
                                            ) : (
                                              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{sku.pesoPadrao}kg</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <button 
                                                disabled={!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao}
                                                onClick={() => abrirModalSalvarManual(dIdx, sku)}
                                                style={{ background: (!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao) ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: (!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto' }}
                                              >
                                                <CheckCircle2 size={14}/> Salvar UC
                                              </button>
                                            ) : (
                                              sku.variacoesDisponiveis && sku.variacoesDisponiveis.length > 1 ? (
                                                <select value={sku.variacaoSelecionadaIdx || 0} onChange={(e) => handleMudarVariacao(dIdx, sku.ref, parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem', outline: 'none', color: 'var(--text-main)', width: '100%', maxWidth: '200px', background: 'var(--bg-input)', cursor: 'pointer' }}>
                                                  {sku.variacoesDisponiveis.map((v, vIdx) => ( <option key={`var-opt-${v.caixa}-${v.quantidade}-${vIdx}`} value={vIdx}> {v.caixa} / {v.quantidade} un / {v.peso}kg </option> ))}
                                                </select>
                                              ) : (
                                                <span style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>Padrão Único</span>
                                              )
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', background: isExpanded ? 'var(--bg-input)' : 'rgba(0,0,0,0.02)', borderLeft: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <div style={{ fontWeight: '900', color: 'var(--text-highlight, #38bdf8)', fontSize: '1.25rem' }}>
                                              {sku.qtdPadrao > 0 ? Math.ceil(sku.qtdTotal / sku.qtdPadrao) : 0}
                                            </div>
                                          </td>
                                        </tr>

                                        {isExpanded && (() => {
                                          const caixasEfetivadasDb = pedidoModal.documentos[dIdx]?.caixas || [];
                                          const caixasEfetivadasDesteSku = caixasEfetivadasDb.filter(cx => cx.produtos?.some(p => p.referencia === sku.ref));

                                          let caixasParaExibir = [];
                                          let isProjecao = false;

                                          if (caixasEfetivadasDesteSku.length > 0) {
                                              caixasParaExibir = caixasEfetivadasDesteSku.map((cx) => {
                                                  const p = cx.produtos.find(prod => prod.referencia === sku.ref);
                                                  return { titulo: cx.num || 'CX', qtd: p.quantidade, peso: cx.peso, real: true };
                                              });
                                          } else if (sku.qtdPadrao > 0) {
                                              isProjecao = true;
                                              let restante = sku.qtdTotal;
                                              let vol = 1;
                                              while(restante > 0) {
                                                  const qtdNestaCaixa = Math.min(restante, sku.qtdPadrao);
                                                  const pesoProp = (sku.pesoPadrao * (qtdNestaCaixa / sku.qtdPadrao)).toFixed(1);
                                                  caixasParaExibir.push({ titulo: `${sku.caixaNome || 'CAIXA'} (Vol ${vol})`, qtd: qtdNestaCaixa, peso: pesoProp, real: false });
                                                  restante -= qtdNestaCaixa;
                                                  vol++;
                                              }
                                          }

                                          return (
                                            <tr style={{ background: 'var(--bg-input)', borderBottom: '2px solid var(--border-color)' }}>
                                              <td colSpan="7" style={{ padding: '20px 25px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                   <Boxes size={18} color={isProjecao ? "#d97706" : "#10b981"}/>
                                                   <h5 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800 }}>
                                                     {isProjecao ? 'Projeção de Fracionamento (Pré-WMS)' : 'Caixas Efetivadas no WMS'}
                                                   </h5>
                                                   {isProjecao && <span style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid rgba(217, 119, 6, 0.3)' }}>Estimativa Baseada na Variação</span>}
                                                </div>

                                                {caixasParaExibir.length === 0 ? (
                                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum dado matemático para gerar caixas.</div>
                                                ) : (
                                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                                                     {caixasParaExibir.map((cx, cIdx) => (
                                                       <div key={`master-box-item-${cx.titulo}-${cIdx}`} style={{ background: 'var(--bg-card)', border: `1px solid var(--border-color)`, borderLeft: `4px solid ${cx.real ? '#10b981' : '#0ea5e9'}`, borderRadius: '8px', padding: '12px 15px' }}>
                                                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '6px' }}>{cx.titulo}</div>
                                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                           <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{cx.qtd} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)'}}>un</span></div>
                                                           <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{cx.peso}kg</div>
                                                         </div>
                                                       </div>
                                                     ))}
                                                  </div>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })()}
                                      </React.Fragment>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            
            /* LAYOUT PADRÃO: PEDIDO COMUM */
            <>
              {activeTab === 'resumo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', height: '100%' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
                    
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 800 }}>
                          <AlignLeft size={18} color="var(--text-muted)"/> Observações
                        </strong>
                        <button onClick={() => setIsEditingObs(!isEditingObs)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-highlight, #38bdf8)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                          <Edit size={14}/> {isEditingObs ? 'Travar Edição' : 'Editar Texto'}
                        </button>
                      </div>
                      
                      {isEditingObs ? (
                        <textarea 
                          value={observacoes} 
                          onChange={(e) => setObservacoes(e.target.value)} 
                          disabled={isSaving}
                          rows="3"
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', resize: 'none', fontSize: '0.9rem', color: 'var(--text-main)', background: 'var(--bg-input)', boxSizing: 'border-box' }}
                          placeholder="Adicione observações aqui..."
                          autoFocus
                        />
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '50px', lineHeight: 1.5 }}>
                          {observacoes || <span style={{fontStyle: 'italic', color: 'var(--text-muted)'}}>Nenhuma observação informada.</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 800 }}>
                        <FileText size={18} color="var(--text-muted)"/> Documentos
                      </strong>
                      
                      {/* 1. SELETOR DE RESPONSÁVEL PRINCIPAL (CUSTOMIZADO) */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexShrink: 0, alignItems: 'flex-start' }}>
                        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)} disabled={isSaving} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.88rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                          <option value="Nota Fiscal" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Nota Fiscal</option>
                          <option value="Minuta" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Minuta</option>
                          <option value="Bonificação" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Bonificação</option>
                          <option value="Troca" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Troca</option>
                        </select>

                        <div style={{ flex: 1.5, position: 'relative' }} ref={refDropdownPrincipal}>
                          <div 
                            onClick={() => !isSaving && setDropdownPrincipalAberto(!dropdownPrincipalAberto)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-input)',
                              color: usuarioPrincipalSelecionado ? 'var(--text-main)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {usuarioPrincipalSelecionado ? usuarioPrincipalSelecionado.nome : 'Responsável...'}
                            </span>
                            <ChevronDown size={16} color="var(--text-muted)" style={{ transform: dropdownPrincipalAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: '6px' }} />
                          </div>

                          {dropdownPrincipalAberto && (
                            <div style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              left: 0,
                              right: 0,
                              background: 'var(--bg-card, #0f172a)',
                              border: '1px solid var(--border-color, #334155)',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                              zIndex: 1000,
                              maxHeight: '260px',
                              overflowY: 'auto',
                              padding: '4px'
                            }}>
                              {listaUsuarios.map((u, uIdx) => {
                                const isSelected = u.email === docResponsavel;
                                return (
                                  <div
                                    key={`user-main-opt-${u.email || u.uid || uIdx}`}
                                    onClick={() => {
                                      setDocResponsavel(u.email);
                                      setDropdownPrincipalAberto(false);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: isSelected ? 'var(--primary, #0d3269)' : 'transparent',
                                      color: isSelected ? '#ffffff' : 'var(--text-main, #f8fafc)',
                                      fontSize: '0.85rem',
                                      fontWeight: isSelected ? '700' : 'normal',
                                      transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-input, rgba(255,255,255,0.06))';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <span>{u.nome}</span>
                                    {isSelected && <Check size={14} color="#10b981" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button onClick={handleAddDoc} disabled={isSaving} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Plus size={16}/>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                        {docsTemporarios.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum documento.</span>
                        ) : (
                          docsTemporarios.map((doc, docIdx) => (
                            <div key={`doc-temp-item-${doc.idTemp || doc.id || docIdx}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{doc.tipo}</span>
                                <button onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {(doc.responsaveis || [doc.responsavel]).filter(Boolean).map((resp, rIdx) => (
                                  <span key={`resp-pill-${doc.idTemp || docIdx}-${resp}-${rIdx}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 9px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                    <User size={11}/> {resp.split('@')[0]}
                                    <button onClick={() => handleRemoveResponsavelFromDoc(doc.idTemp, resp)} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12}/></button>
                                  </span>
                                ))}

                                {/* 2. SELETOR "+ ADD PARCEIRO" (CUSTOMIZADO) */}
                                <div style={{ position: 'relative' }} ref={dropdownParceiroAberto === doc.idTemp ? refDropdownParceiro : null}>
                                  <div
                                    onClick={() => !isSaving && setDropdownParceiroAberto(dropdownParceiroAberto === doc.idTemp ? null : doc.idTemp)}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      borderRadius: '8px',
                                      border: '1px dashed var(--border-color)',
                                      background: 'var(--bg-card)',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span>+ Add Parceiro</span>
                                    <ChevronDown size={12} color="var(--text-muted)" />
                                  </div>

                                  {dropdownParceiroAberto === doc.idTemp && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 'calc(100% + 4px)',
                                      left: 0,
                                      background: 'var(--bg-card, #0f172a)',
                                      border: '1px solid var(--border-color, #334155)',
                                      borderRadius: '10px',
                                      boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                                      zIndex: 1000,
                                      maxHeight: '200px',
                                      width: '160px',
                                      overflowY: 'auto',
                                      padding: '4px'
                                    }}>
                                      {listaUsuarios.map((u, pIdx) => (
                                        <div
                                          key={`parceiro-opt-${doc.idTemp || docIdx}-${u.email || pIdx}`}
                                          onClick={() => {
                                            handleAddResponsavelToDoc(doc.idTemp, u.email);
                                            setDropdownParceiroAberto(null);
                                          }}
                                          style={{
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            color: 'var(--text-main, #f8fafc)',
                                            fontSize: '0.8rem',
                                            transition: 'background 0.15s'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-input, rgba(255,255,255,0.06))';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                          }}
                                        >
                                          {u.nome}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <button 
                        onClick={handleSalvarEdicaoTab1} 
                        disabled={isSaving}
                        style={{ marginTop: '15px', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexShrink: 0, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
                      >
                        {isSaving ? <Loader2 size={16} className="fa-spin"/> : <CheckCircle2 size={16}/>}
                        Salvar Alterações
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 800 }}>
                        <CheckCircle2 size={18} color="#10b981"/> Resumo de Caixas 
                        <span style={{ marginLeft: '4px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                          {detalheSkus} SKUs processados
                        </span>
                      </strong>
                      
                      {resumoOrdenadoComum.length > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const texto = resumoOrdenadoComum.map(k => `${k.originalName} (${k.peso.toFixed(2)} kg): ${k.qtd} Un`).join('\n');
                            navigator.clipboard.writeText(texto);
                            const btn = e.currentTarget;
                            const originalText = btn.innerHTML;
                            btn.innerHTML = 'Copiado!';
                            btn.style.color = '#10b981'; btn.style.borderColor = '#10b981'; btn.style.background = 'rgba(16, 185, 129, 0.1)';
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                              btn.style.color = 'var(--text-main)'; btn.style.borderColor = 'var(--border-color)'; btn.style.background = 'var(--bg-input)';
                            }, 1500);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Copiar resumo no padrão WMS"
                        >
                          <Copy size={14} /> Copiar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                      {resumoOrdenadoComum.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '35px 20px', background: 'var(--bg-input)', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          Nenhuma caixa importada.
                        </div>
                      ) : (
                        resumoOrdenadoComum.map((k, idx) => (
                          <div key={`resumo-comum-item-${k.originalName}-${idx}`} style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: k.isBonif ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${k.isBonif ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-color)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{color: k.isBonif ? '#f87171' : 'var(--text-highlight, #38bdf8)'}}>{k.originalName}</strong> 
                              <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>({k.peso.toFixed(2)} kg)</span>
                            </div>
                            <span style={{fontWeight: 800, color: k.isBonif ? '#fca5a5' : 'var(--text-main)'}}>{k.qtd} Un</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                </div>
              )}

              {activeTab === 'caixas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  {(pedidoModal.documentos || []).map((doc, dIdx) => {
                    const caixas = doc.caixas || [];

                    const skusAgrupados = caixas.reduce((acc, cx) => {
                      (cx.produtos || []).forEach(p => {
                        const ref = p.referencia || p.sku;
                        if (!acc[ref]) {
                          acc[ref] = { ref: ref, desc: p.descricao || p.desc, qtdTotal: 0, caixasDetalhadasMap: {} };
                        }
                        
                        const qtd = parseInt(p.quantidade) || 0;
                        acc[ref].qtdTotal += qtd;
                        
                        const chaveCaixa = cx.idExpedicao || cx.idUnico || cx.num || 'CX-S/N';
                        
                        if (!acc[ref].caixasDetalhadasMap[chaveCaixa]) {
                          acc[ref].caixasDetalhadasMap[chaveCaixa] = {
                            idUnico: cx.idExpedicao || cx.idUnico || '-',
                            tipoCaixa: cx.num || 'CAIXA',
                            peso: parseFloat(cx.peso) || 0,
                            qtdNestaCaixa: qtd
                          };
                        } else {
                          acc[ref].caixasDetalhadasMap[chaveCaixa].qtdNestaCaixa += qtd;
                          acc[ref].caixasDetalhadasMap[chaveCaixa].peso = Math.max(
                            acc[ref].caixasDetalhadasMap[chaveCaixa].peso, 
                            parseFloat(cx.peso) || 0
                          );
                        }
                      });
                      return acc;
                    }, {});

                    const listaSkus = Object.values(skusAgrupados).map(sku => ({
                      ...sku,
                      caixasDetalhadas: Object.values(sku.caixasDetalhadasMap)
                    }));

                    const termoBusca = (buscasDocumentos[dIdx] || '').toLowerCase();
                    const skusFiltrados = listaSkus.filter(sku => 
                      (sku.ref && sku.ref.toLowerCase().includes(termoBusca)) || 
                      (sku.desc && sku.desc.toLowerCase().includes(termoBusca))
                    );

                    return (
                      <div key={`doc-card-${doc.id || doc.idTemp || dIdx}`} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '25px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                          <h4 style={{ color: 'var(--text-highlight, #38bdf8)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
                            <Layers size={22} color="var(--text-highlight, #38bdf8)" /> {doc.tipo} 
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'normal' }}>({doc.responsavel?.split('@')[0]})</span>
                          </h4>
                          
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            
                            {caixas.length > 0 && (
                              <div style={{ position: 'relative', width: '260px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}/>
                                <input 
                                  type="text" 
                                  placeholder="Buscar Produto ou SKU..." 
                                  value={buscasDocumentos[dIdx] || ''}
                                  onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                  style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                                />
                              </div>
                            )}

                            <label style={{ background: '#0ea5e9', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isUploading && docIndexSelecionado === dIdx ? <Loader2 size={16} className="fa-spin"/> : <UploadCloud size={16}/>}
                              {isUploading && docIndexSelecionado === dIdx ? 'Importando...' : 'Importar WMS (CSV)'}
                              <input type="file" accept=".csv" onChange={(e) => { setDocIndexSelecionado(dIdx); handleUploadWMSComum(e, dIdx); }} style={{ display: 'none' }} disabled={isUploading} />
                            </label>
                            
                            <button 
                              onClick={() => setShowCaixasEfetivadasModal(dIdx)} 
                              style={{ background: caixas.length > 0 ? '#10b981' : 'var(--bg-input)', color: caixas.length > 0 ? '#fff' : '#10b981', border: caixas.length > 0 ? 'none' : '1px solid #10b981', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <Boxes size={16}/> {caixas.length > 0 ? 'Ver Caixas e Resumo' : 'Criar Caixa Manual'}
                            </button>
                          </div>
                        </div>

                        {caixas.length > 0 ? (
                          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                  <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUTO</th>
                                  <th style={{ padding: '12px 15px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem' }}>QTD TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {skusFiltrados.length === 0 ? (
                                  <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                      Nenhum produto encontrado para "{buscasDocumentos[dIdx]}".
                                    </td>
                                  </tr>
                                ) : (
                                  skusFiltrados.map((sku, i) => {
                                    const isExpanded = skusExpandidosComum[`${dIdx}-${sku.ref}`];
                                    return (
                                      <React.Fragment key={`sku-comum-group-${sku.ref}-${i}`}>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: isExpanded ? 'var(--bg-input)' : 'transparent' }}>
                                          <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                              <div 
                                                onClick={() => setSkusExpandidosComum(prev => ({...prev, [`${dIdx}-${sku.ref}`]: !prev[`${dIdx}-${sku.ref}`]}))}
                                                style={{ marginTop: '2px', cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
                                              >
                                                <ChevronDown size={18} color={isExpanded ? "var(--secondary)" : "var(--text-highlight, #38bdf8)"} />
                                              </div>
                                              <div>
                                                <strong style={{ color: 'var(--text-highlight, #38bdf8)', fontSize: '0.9rem' }}>{sku.ref}</strong><br/>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{sku.desc}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '1.05rem', color: 'var(--text-main)' }}>{sku.qtdTotal}</td>
                                        </tr>

                                        {isExpanded && (
                                          <tr style={{ background: 'var(--bg-input)', borderBottom: '2px solid var(--border-color)' }}>
                                            <td colSpan="2" style={{ padding: '15px 25px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#10b981' }}>
                                                <Package size={16} /> <strong style={{ fontSize: '0.85rem' }}>Embalagens Registradas</strong>
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                                {sku.caixasDetalhadas.map((detalhe, cIdx) => (
                                                  <div key={`box-detalhe-${detalhe.idUnico}-${cIdx}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: '4px solid #10b981', borderRadius: '8px', padding: '12px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={detalhe.idUnico}>
                                                      <strong style={{ color: 'var(--text-muted)' }}>ID WMS:</strong> {detalhe.idUnico}
                                                    </div>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{detalhe.tipoCaixa}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
                                                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-highlight, #38bdf8)' }}>{detalhe.qtdNestaCaixa} <span style={{fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)'}}>un</span></div>
                                                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{parseFloat(detalhe.peso).toFixed(1)}kg</div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-input)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                            <FileText size={64} color="var(--text-muted)" style={{ marginBottom: '20px', opacity: 0.5 }} />
                            <h3 style={{ color: 'var(--text-main)', margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 800 }}>Nenhuma Caixa Registrada</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0' }}>Importe o arquivo CSV do WMS, ou inicie criando uma caixa manualmente pelo botão superior.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}