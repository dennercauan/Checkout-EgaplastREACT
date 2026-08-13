import React from 'react';
import { 
  Boxes, Info, X, Layers, Search, Loader2, UploadCloud, 
  PieChart, CheckCircle2, ArrowUpDown, ChevronDown, Copy, 
  Package, AlignLeft, Edit, FileText, Plus, Trash2, User 
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
  if (!showDetalhesModal || !pedidoModal) return null;

  // ============================================================================
  // LÓGICA DO RESUMO GERAL (Trazida da tela principal para ficar isolada aqui!)
  // ============================================================================
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
      <div className="op-modal-content" style={{width: '98vw', height: '95vh', maxWidth: '1600px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px'}} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER FIXO - ADAPTADO PARA O DESIGN DA IMAGEM */}
        <div className="op-modal-header" style={{flexShrink: 0, padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {pedidoModal.isCaixaMaster ? (
                <>
                  <Boxes size={26} color="#1e3a8a"/>
                  <h2 style={{ color: '#1e3a8a', fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>
                    Caixas do Pedido <span style={{ color: '#cbd5e1', fontWeight: '300', marginLeft: '8px' }}>{pedidoModal.romaneio}</span>
                  </h2>
                </>
            ) : (
                <>
                  <div className="icon-wrap" style={{background: 'var(--primary)', color: '#fff'}}><Info size={24}/></div>
                  <div>
                    <h2>Painel do Romaneio: {pedidoModal.romaneio}</h2>
                    <p>{pedidoModal.loja || 'Destino Padrão'} {pedidoModal.uf ? `- ${pedidoModal.uf}` : ''}</p>
                  </div>
                </>
            )}
          </div>
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} onClick={() => setShowDetalhesModal(false)} disabled={isSaving || isUploading}><X size={24}/></button>
        </div>
        
        {/* Sistema de Abas (OCULTO SE FOR CAIXA MASTER) */}
        {!pedidoModal.isCaixaMaster && (
          <div className="modal-tabs-container" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 25px', flexShrink: 0 }}>
            <button 
              className={`modal-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
              onClick={() => setActiveTab('resumo')}
              style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'resumo' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'resumo' ? 'var(--primary)' : '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              Resumo Geral
            </button>
            <button 
              className={`modal-tab-btn ${activeTab === 'caixas' ? 'active' : ''}`}
              onClick={() => setActiveTab('caixas')}
              style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'caixas' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'caixas' ? 'var(--primary)' : '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              Detalhamento Completo & WMS
            </button>
          </div>
        )}
        
        {/* Corpo do Modal Rolável */}
        <div className="op-modal-body" style={{ flex: 1, padding: '25px', overflowY: 'auto', background: '#f8fafc' }}>
          
          {/* ======================================================= */}
          {/* LAYOUT EXCLUSIVO: ESTAÇÃO WMS CAIXA MASTER (TELA CHEIA) */}
          {/* ======================================================= */}
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
                    <div key={dIdx} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', padding: '25px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h4 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Layers size={22} color="#1e3a8a" /> {doc.tipo} 
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'normal' }}>({doc.responsavel?.split('@')[0]})</span>
                        </h4>
                      </div>

                      {!wmsSessions[dIdx] ? (
                        /* ESTÁGIO 1: DROPZONE */
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
                          <FileText size={64} color="#94a3b8" style={{ marginBottom: '20px' }} />
                          <h3 style={{ color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Planejamento de Caixas Master</h3>
                          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '30px' }}>Faça o upload do arquivo CSV extraído do WMS para iniciar o cruzamento de dados de embalagem.</p>
                          
                          <input 
                            type="file" accept=".csv" id={`plan-upload-${dIdx}`} style={{ display: 'none' }} 
                            onChange={(e) => handlePlanejamentoUpload(e, dIdx)} disabled={isUploading}
                          />
                          <label htmlFor={`plan-upload-${dIdx}`} style={{ background: 'var(--primary)', color: '#fff', padding: '14px 35px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                            {isUploading ? <Loader2 size={20} className="fa-spin"/> : <UploadCloud size={20}/>}
                            {isUploading ? 'Analisando Base de Dados...' : 'Selecionar Arquivo CSV WMS'}
                          </label>
                        </div>
                      ) : (
                        /* ESTÁGIO 2: TABELA DE GERENCIAMENTO */
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                          
                          {/* TOOLBAR CONECTADA E FUNCIONAL */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                              <div style={{ fontSize: '1.3rem', color: '#1e3a8a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                {wmsSessions[dIdx].loja || pedidoModal.loja || 'LOJA NÃO DEFINIDA'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                Romaneio WMS: <strong style={{ color: '#ea580c' }}>{wmsSessions[dIdx].romaneio || pedidoModal.romaneio}</strong>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}/>
                                <input type="text" 
                                  placeholder="Buscar Produto ou SKU..." 
                                  value={buscasDocumentos[dIdx] || ''} 
                                  onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                  style={{ padding: '8px 10px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', width: '220px', color: '#334155' }}/>
                              </div>
                              
                              <div style={{ position: 'relative' }}>
                                <button 
                                  onClick={() => setWmsPreResumoAberto(wmsPreResumoAberto === dIdx ? null : dIdx)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 'bold', cursor: 'pointer' }}>
                                  <FileText size={14} color="#ea580c"/> Pré-Resumo 
                                  <span style={{ background: '#1e3a8a', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>
                                    {totalVolumesGeral}
                                  </span>
                                </button>
                                
                                {wmsPreResumoAberto === dIdx && (
                                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50 }}>
                                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', color: 'var(--primary)', fontSize: '0.95rem' }}>Volumes Estimados</h4>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                      {Object.keys(resumoTiposCaixa).length === 0 ? <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Nenhuma caixa projetada.</span> : ''}
                                      {Object.keys(resumoTiposCaixa).map(k => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                          <strong style={{ color: '#334155' }}>{k}</strong>
                                          <span>{resumoTiposCaixa[k].qtd} un <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> <strong style={{ color: '#10b981' }}>{resumoTiposCaixa[k].peso.toFixed(1)}kg</strong></span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                                <button onClick={() => setShowCaixasEfetivadasModal(dIdx)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', color: '#1e3a8a', cursor: 'pointer', display: 'flex' }} title="Estrutura de Caixas Salvas">
                                  <Boxes size={16}/>
                                </button>
                                
                                <button onClick={async () => {
                                  if(!window.confirm("Deseja realmente descartar este planejamento?")) return;
                                  setWmsSessions(prev => { const n = {...prev}; delete n[dIdx]; return n; });
                                }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex' }} title="Descartar Planejamento">
                                  <Trash2 size={16}/>
                                </button>
                                
                                <button onClick={() => {
                                  const docDb = pedidoModal.documentos[dIdx];
                                  if (docDb.caixas && docDb.caixas.length > 0) {
                                    setAuditModalData({ dIdx: dIdx, fileName: docDb.auditoria?.arquivo || 'Arquivo Salvo', caixasReais: docDb.caixas });
                                  } else {
                                    setAuditModalData({ dIdx: dIdx });
                                  }
                                }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: pedidoModal.documentos[dIdx].caixas?.length > 0 ? '#0ea5e9' : '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
                                  {pedidoModal.documentos[dIdx].caixas?.length > 0 ? <PieChart size={16}/> : <CheckCircle2 size={16}/>}
                                  {pedidoModal.documentos[dIdx].caixas?.length > 0 ? 'Ver Auditoria' : 'Importar Caixas'}
                                </button>
                            </div>
                          </div>
                          
                          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead style={{ background: '#e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUTO <ArrowUpDown size={10} style={{marginLeft: '4px', opacity: 0.5}}/></th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>QTD PEDIDO <ArrowUpDown size={10} style={{marginLeft: '4px', opacity: 0.5}}/></th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO UC</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO CAIXA</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>PESO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>SELECIONAR VARIAÇÃO</th>
                                  <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TOTAL CX</th>
                                </tr>
                              </thead>
                              <tbody>
                                {skusFiltrados.length === 0 ? (
                                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum SKU encontrado.</td></tr>
                                ) : (
                                  skusFiltrados.map((sku, i) => {
                                    const isExpanded = skusExpandidos[`${dIdx}-${sku.ref}`];

                                    return (
                                      <React.Fragment key={i}>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: sku.isMissing ? '#fef2f2' : (isExpanded ? '#f8fafc' : '#fff'), transition: 'background 0.2s' }}>
                                          <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                              <div 
                                                onClick={() => setSkusExpandidos(prev => ({...prev, [`${dIdx}-${sku.ref}`]: !prev[`${dIdx}-${sku.ref}`]}))}
                                                style={{ marginTop: '2px', cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', padding: '2px' }}
                                                title="Ver caixas deste produto"
                                              >
                                                <ChevronDown size={18} color={isExpanded ? "#ea580c" : "#0284c7"} />
                                              </div>
                                              
                                              <div>
                                                <strong style={{ color: '#0284c7', fontSize: '0.9rem' }}>{sku.ref}</strong><br/>
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>{sku.desc}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '1.05rem', color: '#1e293b' }}>{sku.qtdTotal}</td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <input type="number" placeholder="Qtd" value={sku.qtdPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'qtdPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                            ) : (
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                                                CX{sku.qtdPadrao} 
                                                <span title="Copiar Código de Barras da Embalagem" onClick={(e) => {
                                                    const variacao = sku.variacoesDisponiveis && sku.variacoesDisponiveis[sku.variacaoSelecionadaIdx || 0];
                                                    const eanToCopy = variacao?.codigoBarras || sku.codigoBarras || variacao?.ean || sku.ean || 'EAN-NÃO-CADASTRADO';
                                                    if (eanToCopy !== 'EAN-NÃO-CADASTRADO') { navigator.clipboard.writeText(eanToCopy); } else { alert('O campo "codigoBarras" não foi encontrado nesta variação ou produto no banco de dados.'); }
                                                    const spanRef = e.currentTarget;
                                                    spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                                    setTimeout(() => { spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'; }, 1500);
                                                  }} style={{ cursor: 'pointer', display: 'flex', padding: '4px', background: '#f1f5f9', borderRadius: '4px' }}>
                                                  <Copy size={15} color="#ea580c" />
                                                </span>
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <input type="text" placeholder="Ex: CAIXA 1" value={sku.caixaNome || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'caixaNome', e.target.value)} style={{ width: '90px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                            ) : (
                                              <span style={{ color: '#475569', fontSize: '0.9rem' }}>{sku.caixaNome}</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center' }}>
                                            {sku.isMissing ? (
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <input type="number" step="0.1" placeholder="0.0" value={sku.pesoPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'pesoPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>kg</span>
                                              </div>
                                            ) : (
                                              <span style={{ color: '#475569', fontSize: '0.9rem' }}>{sku.pesoPadrao}kg</span>
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
                                                <select value={sku.variacaoSelecionadaIdx || 0} onChange={(e) => handleMudarVariacao(dIdx, sku.ref, parseInt(e.target.value))} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', color: '#475569', width: '100%', maxWidth: '200px', background: '#f8fafc', cursor: 'pointer' }}>
                                                  {sku.variacoesDisponiveis.map((v, vIdx) => ( <option key={vIdx} value={vIdx}> {v.caixa} / {v.quantidade} un / {v.peso}kg </option> ))}
                                                </select>
                                              ) : (
                                                <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Padrão Único</span>
                                              )
                                            )}
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', background: isExpanded ? '#f1f5f9' : '#f8fafc', borderLeft: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                                            <div style={{ fontWeight: '900', color: '#1e3a8a', fontSize: '1.25rem' }}>
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
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                                              <td colSpan="7" style={{ padding: '20px 25px' }}>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                   <Boxes size={18} color={isProjecao ? "#d97706" : "#10b981"}/>
                                                   <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.95rem' }}>
                                                     {isProjecao ? 'Projeção de Fracionamento (Pré-WMS)' : 'Caixas Efetivadas no WMS'}
                                                   </h5>
                                                   {isProjecao && <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #fde68a' }}>Estimativa Baseada na Variação</span>}
                                                </div>

                                                {caixasParaExibir.length === 0 ? (
                                                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum dado matemático para gerar caixas.</div>
                                                ) : (
                                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                                                     {caixasParaExibir.map((cx, cIdx) => (
                                                       <div key={cIdx} style={{ background: '#fff', border: `1px solid ${cx.real ? '#cbd5e1' : '#e2e8f0'}`, borderLeft: `4px solid ${cx.real ? '#10b981' : '#0ea5e9'}`, borderRadius: '6px', padding: '12px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                         <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>{cx.titulo}</div>
                                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                           <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#334155', lineHeight: '1' }}>{cx.qtd} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8'}}>un</span></div>
                                                           <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>{cx.peso}kg</div>
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
            
            /* ======================================================= */
            /* LAYOUT PADRÃO: PEDIDO COMUM (COM ABAS)                  */
            /* ======================================================= */
            <>
              {/* ABA 1: RESUMO GERAL (EDITÁVEL) */}
              {activeTab === 'resumo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', height: '100%' }}>
                  
                  {/* COLUNA ESQUERDA: Observações e Documentos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
                    
                    {/* OBSERVAÇÕES (Editável com trava) */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155' }}>
                          <AlignLeft size={18} color="#64748b"/> Observações
                        </strong>
                        <button onClick={() => setIsEditingObs(!isEditingObs)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <Edit size={14}/> {isEditingObs ? 'Travar Edição' : 'Editar Texto'}
                        </button>
                      </div>
                      
                      {isEditingObs ? (
                        <textarea 
                          value={observacoes} 
                          onChange={(e) => setObservacoes(e.target.value)} 
                          disabled={isSaving}
                          rows="3"
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'none', fontSize: '0.85rem', color: '#475569', boxSizing: 'border-box' }}
                          placeholder="Adicione observações aqui..."
                          autoFocus
                        />
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, padding: '10px', background: '#f8fafc', borderRadius: '6px', minHeight: '50px' }}>
                          {observacoes || <span style={{fontStyle: 'italic', color: '#94a3b8'}}>Nenhuma observação informada.</span>}
                        </div>
                      )}
                    </div>

                    {/* DOCUMENTOS (Editável Multi-Colaboradores) */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155', marginBottom: '12px' }}>
                        <FileText size={18} color="#64748b"/> Documentos
                      </strong>
                      
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexShrink: 0 }}>
                        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)} disabled={isSaving} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="Nota Fiscal">Nota Fiscal</option>
                          <option value="Minuta">Minuta</option>
                          <option value="Bonificação">Bonificação</option>
                          <option value="Troca">Troca</option>
                        </select>
                        <select value={docResponsavel} onChange={(e) => setDocResponsavel(e.target.value)} disabled={isSaving} style={{ flex: 1.5, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="">Responsável...</option>
                          {localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim()) && (<option value={String(localUser.email).toLowerCase().trim()}>{String(localUser.email).split('@')[0].toLowerCase()}</option>)}
                          {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                        </select>
                        <button onClick={handleAddDoc} disabled={isSaving} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Plus size={16}/>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                        {docsTemporarios.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhum documento.</span>
                        ) : (
                          docsTemporarios.map(doc => (
                            <div key={doc.idTemp} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{doc.tipo}</span>
                                <button onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {(doc.responsaveis || [doc.responsavel]).filter(Boolean).map(resp => (
                                  <span key={resp} style={{ background: '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={10}/> {resp.split('@')[0]}
                                    <button onClick={() => handleRemoveResponsavelFromDoc(doc.idTemp, resp)} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12}/></button>
                                  </span>
                                ))}
                                <select 
                                  onChange={(e) => { handleAddResponsavelToDoc(doc.idTemp, e.target.value); e.target.value = ""; }} 
                                  disabled={isSaving} 
                                  style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: '6px', border: '1px dashed #cbd5e1', outline: 'none', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                                >
                                  <option value="">+ Add Parceiro</option>
                                  {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <button 
                        onClick={handleSalvarEdicaoTab1} 
                        disabled={isSaving}
                        style={{ marginTop: '15px', background: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                      >
                        {isSaving ? <Loader2 size={16} className="fa-spin"/> : <CheckCircle2 size={16}/>}
                        Salvar Alterações
                      </button>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: Listagem de Caixas (Altura Total) */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981"/> Resumo de Caixas 
                        <span style={{ marginLeft: '4px', fontSize: '0.75rem', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
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
                            btn.style.color = '#10b981'; btn.style.borderColor = '#10b981'; btn.style.background = '#ecfdf5';
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                              btn.style.color = '#475569'; btn.style.borderColor = '#cbd5e1'; btn.style.background = '#f8fafc';
                            }, 1500);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Copiar resumo no padrão WMS"
                        >
                          <Copy size={14} /> Copiar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                      {resumoOrdenadoComum.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '25px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                          Nenhuma caixa importada.
                        </div>
                      ) : (
                        resumoOrdenadoComum.map((k, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: k.isBonif ? '#fef2f2' : '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${k.isBonif ? '#fca5a5' : '#e2e8f0'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{color: k.isBonif ? '#ef4444' : 'var(--primary)'}}>{k.originalName}</strong> 
                              <span style={{color: k.isBonif ? '#f87171' : '#94a3b8', fontSize: '0.8rem'}}>({k.peso.toFixed(2)} kg)</span>
                            </div>
                            <span style={{fontWeight: 700, color: k.isBonif ? '#b91c1c' : '#334155'}}>{k.qtd} Un</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                </div>
              )}

              {/* ABA 2: CAIXAS COMPLETAS E WMS (ACORDEON COMUM -> NOVO LAYOUT WMS) */}
              {activeTab === 'caixas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  {(pedidoModal.documentos || []).map((doc, dIdx) => {
                    const caixas = doc.caixas || [];

                    // 👇 LÓGICA DE AGRUPAMENTO INTELIGENTE ADICIONADA AQUI 👇
                    const skusAgrupados = caixas.reduce((acc, cx) => {
                      (cx.produtos || []).forEach(p => {
                        const ref = p.referencia || p.sku; // Garantia para legado
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
                          // Mescla a mesma caixa fragmentada no banco legado
                          acc[ref].caixasDetalhadasMap[chaveCaixa].qtdNestaCaixa += qtd;
                          acc[ref].caixasDetalhadasMap[chaveCaixa].peso = Math.max(
                            acc[ref].caixasDetalhadasMap[chaveCaixa].peso, 
                            parseFloat(cx.peso) || 0
                          );
                        }
                      });
                      return acc;
                    }, {});

                    // Converte o Map de volta para Array para o React mapear na tela
                    const listaSkus = Object.values(skusAgrupados).map(sku => ({
                      ...sku,
                      caixasDetalhadas: Object.values(sku.caixasDetalhadasMap)
                    }));
                    // 👆 FIM DA CORREÇÃO 👆

                    const termoBusca = (buscasDocumentos[dIdx] || '').toLowerCase();
                    const skusFiltrados = listaSkus.filter(sku => 
                      (sku.ref && sku.ref.toLowerCase().includes(termoBusca)) || 
                      (sku.desc && sku.desc.toLowerCase().includes(termoBusca))
                    );

                    return (
                      <div key={dIdx} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', padding: '25px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                          <h4 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Layers size={22} color="#1e3a8a" /> {doc.tipo} 
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'normal' }}>({doc.responsavel?.split('@')[0]})</span>
                          </h4>
                          
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            
                            {caixas.length > 0 && (
                              <div style={{ position: 'relative', width: '260px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}/>
                                <input 
                                  type="text" 
                                  placeholder="Buscar Produto ou SKU..." 
                                  value={buscasDocumentos[dIdx] || ''}
                                  onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                  style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', color: '#334155', boxSizing: 'border-box' }}
                                />
                              </div>
                            )}

                            <label style={{ background: '#0ea5e9', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isUploading && docIndexSelecionado === dIdx ? <Loader2 size={16} className="fa-spin"/> : <UploadCloud size={16}/>}
                              {isUploading && docIndexSelecionado === dIdx ? 'Importando...' : 'Importar WMS (CSV)'}
                              <input type="file" accept=".csv" onChange={(e) => { setDocIndexSelecionado(dIdx); handleUploadWMSComum(e, dIdx); }} style={{ display: 'none' }} disabled={isUploading} />
                            </label>
                            
                            <button 
                              onClick={() => setShowCaixasEfetivadasModal(dIdx)} 
                              style={{ background: caixas.length > 0 ? '#10b981' : '#f8fafc', color: caixas.length > 0 ? '#fff' : '#10b981', border: caixas.length > 0 ? 'none' : '1px solid #10b981', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <Boxes size={16}/> {caixas.length > 0 ? 'Ver Caixas e Resumo' : 'Criar Caixa Manual'}
                            </button>
                          </div>
                        </div>

                        {caixas.length > 0 ? (
                          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#475569', fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUTO</th>
                                  <th style={{ padding: '12px 15px', textAlign: 'center', color: '#475569', fontWeight: 'bold', fontSize: '0.75rem' }}>QTD TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {skusFiltrados.length === 0 ? (
                                  <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                      Nenhum produto encontrado para "{buscasDocumentos[dIdx]}".
                                    </td>
                                  </tr>
                                ) : (
                                  skusFiltrados.map((sku, i) => {
                                    const isExpanded = skusExpandidosComum[`${dIdx}-${sku.ref}`];
                                    return (
                                      <React.Fragment key={i}>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: isExpanded ? '#f8fafc' : '#fff' }}>
                                          <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                              <div 
                                                onClick={() => setSkusExpandidosComum(prev => ({...prev, [`${dIdx}-${sku.ref}`]: !prev[`${dIdx}-${sku.ref}`]}))}
                                                style={{ marginTop: '2px', cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
                                              >
                                                <ChevronDown size={18} color={isExpanded ? "#ea580c" : "#0284c7"} />
                                              </div>
                                              <div>
                                                <strong style={{ color: '#0284c7', fontSize: '0.9rem' }}>{sku.ref}</strong><br/>
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{sku.desc}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '1.05rem', color: '#1e293b' }}>{sku.qtdTotal}</td>
                                        </tr>

                                        {isExpanded && (
                                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <td colSpan="2" style={{ padding: '15px 25px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#10b981' }}>
                                                <Package size={16} /> <strong style={{ fontSize: '0.85rem' }}>Embalagens Registradas</strong>
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                                {sku.caixasDetalhadas.map((detalhe, cIdx) => (
                                                  <div key={cIdx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderLeft: '4px solid #10b981', borderRadius: '6px', padding: '10px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={detalhe.idUnico}>
                                                      <strong style={{ color: '#94a3b8' }}>ID WMS:</strong> {detalhe.idUnico}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>{detalhe.tipoCaixa}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
                                                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0ea5e9' }}>{detalhe.qtdNestaCaixa} <span style={{fontSize: '0.7rem', fontWeight: 'normal', color: '#64748b'}}>un</span></div>
                                                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{parseFloat(detalhe.peso).toFixed(1)}kg</div>
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
                          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
                            <FileText size={64} color="#94a3b8" style={{ marginBottom: '20px' }} />
                            <h3 style={{ color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '1.3rem' }}>Nenhuma Caixa Registrada</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0' }}>Importe o arquivo CSV do WMS, ou inicie criando uma caixa manualmente pelo botão superior.</p>
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