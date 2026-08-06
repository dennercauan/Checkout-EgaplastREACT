// src/components/ModalCaixasEfetivadas.jsx
import React, { useState } from 'react';
import { Edit, Trash2, CheckCircle2, Search, Copy, Check, X, Plus, Boxes, Gift, ListTree } from 'lucide-react';

export default function ModalCaixasEfetivadas({
  showCaixasEfetivadasModal,
  setShowCaixasEfetivadasModal,
  pedidoModal,
  edicaoCaixa,
  setEdicaoCaixa,
  formCaixa,
  setFormCaixa,
  salvarCaixaManual,
  isSaving,
  toggleBonificacaoCaixa,
  abrirFormCaixa,
  excluirCaixaManual
}) {
  // A busca agora é gerenciada apenas dentro do próprio modal!
  const [buscaCaixasSalvas, setBuscaCaixasSalvas] = useState('');

  if (showCaixasEfetivadasModal === null) return null;

  const dIdx = showCaixasEfetivadasModal;
  const docEfetivado = pedidoModal.documentos[dIdx];
  const caixas = docEfetivado?.caixas || [];

  // 1. Aplica o Filtro de Busca na Coluna da Esquerda (Documento Atual)
  const termo = buscaCaixasSalvas.toLowerCase();
  const caixasFiltradas = caixas.filter(cx => {
    if (!termo) return true;
    const matchNum = String(cx.num || cx.caixa || '').toLowerCase().includes(termo);
    const matchProd = cx.produtos?.some(p => {
      const cod = typeof p === 'object' && p !== null ? (p.sku || p.referencia || p.produto || '') : String(p);
      return cod.toLowerCase().includes(termo);
    });
    return matchNum || matchProd;
  });

  // 2. MOTOR DO RESUMO GERAL: Unifica todos os documentos e ordena
  const cxMapGeral = (pedidoModal.documentos || []).reduce((acc, doc) => {
    const isBonifDoc = String(doc.tipo || doc.natureza || doc.nomeDocumento || '').toUpperCase().includes('BONIF');
    
    (doc.caixas || []).forEach(cx => {
      const isBoxBonif = isBonifDoc || cx.isBonificacao;
      let nomeCaixa = String(cx.num || cx.caixa || 'CAIXA').toUpperCase();
      if (isBoxBonif && !nomeCaixa.includes('BONIF')) {
        nomeCaixa = `${nomeCaixa} BONIF`;
      }
      
      if (!acc[nomeCaixa]) acc[nomeCaixa] = { qtd: 0, peso: 0, originalName: nomeCaixa, isBonif: isBoxBonif };
      acc[nomeCaixa].qtd += 1;
      acc[nomeCaixa].peso += parseFloat(cx.peso || 0);
    });
    return acc;
  }, {});

 // Ordena primeiro por Tipo (NF > Bonif) e depois por Número da Caixa
  const resumoOrdenado = Object.values(cxMapGeral).sort((a, b) => {
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#f8fafc', padding: '0', borderRadius: '12px', width: '95%', maxWidth: '1200px', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', position: 'relative' }}>
        
        {/* OVERLAY DO FORMULÁRIO DE EDIÇÃO/CRIAÇÃO MANUAIS */}
        {edicaoCaixa && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.95)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '600px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', maxHeight: '90%', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Edit size={20}/> {edicaoCaixa.cIdx === -1 ? 'Adicionar Nova Caixa' : 'Editar Caixa Existente'}</h3>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 2 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Identificação (Ex: CAIXA 1)</label><input type="text" value={formCaixa.num} onChange={e => setFormCaixa({...formCaixa, num: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}/></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Peso (kg)</label><input type="number" step="0.1" value={formCaixa.peso} onChange={e => setFormCaixa({...formCaixa, peso: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}/></div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#334155' }}>Itens da Caixa</strong>
                  <button onClick={() => setFormCaixa({...formCaixa, produtos: [...formCaixa.produtos, { referencia: '', descricao: '', quantidade: '' }]})} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Item</button>
                </div>
                
                {formCaixa.produtos.map((p, pIdx) => (
                  <div key={pIdx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                    <input type="text" placeholder="REF" value={p.referencia} onChange={e => { const prod = [...formCaixa.produtos]; prod[pIdx].referencia = e.target.value; setFormCaixa({...formCaixa, produtos: prod}); }} style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}/>
                    <input type="text" placeholder="Descrição" value={p.descricao} onChange={e => { const prod = [...formCaixa.produtos]; prod[pIdx].descricao = e.target.value; setFormCaixa({...formCaixa, produtos: prod}); }} style={{ flex: 2, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}/>
                    <input type="number" placeholder="Qtd" value={p.quantidade} onChange={e => { const prod = [...formCaixa.produtos]; prod[pIdx].quantidade = e.target.value; setFormCaixa({...formCaixa, produtos: prod}); }} style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}/>
                    <button onClick={() => { const prod = formCaixa.produtos.filter((_, i) => i !== pIdx); setFormCaixa({...formCaixa, produtos: prod}); }} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                ))}
                {formCaixa.produtos.length === 0 && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum item na caixa.</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                <button onClick={() => setEdicaoCaixa(null)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={salvarCaixaManual} disabled={isSaving} style={{ padding: '10px 20px', background: '#0ea5e9', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#fff', cursor: 'pointer', display: 'flex', gap: '8px' }}>
                  {isSaving ? 'Salvando...' : <><CheckCircle2 size={18}/> Salvar Caixa</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER DO MODAL */}
        <div style={{ padding: '20px 25px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontSize: '1.4rem' }}>
            <Boxes size={26}/> Caixas Efetivadas: {docEfetivado?.tipo || 'Documento Atual'}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, justifyContent: 'flex-end' }}>
            
            <button onClick={() => abrirFormCaixa(dIdx, -1)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              <Plus size={16}/> Nova Caixa
            </button>

            {/* BARRA DE BUSCA */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}/>
              <input type="text" placeholder="Buscar Caixa ou SKU..." value={buscaCaixasSalvas} onChange={(e) => setBuscaCaixasSalvas(e.target.value)} style={{ width: '100%', padding: '9px 10px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}/>
            </div>

            {/* BOTÃO COPIAR GERAL */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const texto = resumoOrdenado.map(k => `${k.originalName} (${k.peso.toFixed(2)} kg): ${k.qtd} Un`).join('\n');
                navigator.clipboard.writeText(texto);
                const btn = e.currentTarget;
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span style="display:flex;align-items:center;gap:6px;"><Check size={16}/> Copiado!</span>';
                btn.style.color = '#10b981'; btn.style.borderColor = '#10b981'; btn.style.background = '#ecfdf5';
                setTimeout(() => {
                  btn.innerHTML = originalHTML;
                  btn.style.color = '#475569'; btn.style.borderColor = '#cbd5e1'; btn.style.background = '#f8fafc';
                }, 1500);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '9px 15px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Copy size={16} /> Copiar Resumo
            </button>
            
            <button onClick={() => { setShowCaixasEfetivadasModal(null); setBuscaCaixasSalvas(''); }} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '6px' }}><X size={24}/></button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* COLUNA ESQUERDA: LISTAGEM DE CAIXAS DO DOCUMENTO ATUAL */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '25px', position: 'relative' }}>
            {caixas.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhuma caixa neste documento.</div>
            ) : caixasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhuma caixa corresponde à busca.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                {caixasFiltradas.map((cx, idx) => {
                  // Localiza o index original no array não filtrado para edição/exclusão corretas
                  const originalIdx = caixas.findIndex(c => c === cx);
                  
                  return (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      
                      {/* CABEÇALHO UNIFICADO DA CAIXA (Título + Botões na mesma linha) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <strong style={{ color: cx.isBonificacao ? '#ef4444' : 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {cx.num || 'CX'} 
                          {cx.isBonificacao && <span style={{ fontSize: '0.65rem', background: '#fef2f2', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '10px' }}>BONIF</span>}
                          <span style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal'}}>(Vol {originalIdx + 1})</span>
                        </strong>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#64748b', marginRight: '6px' }}>{parseFloat(cx.peso).toFixed(1)}kg</span>
                          
                          <button 
                            onClick={() => toggleBonificacaoCaixa(dIdx, originalIdx)} 
                            style={{ background: cx.isBonificacao ? '#fef2f2' : '#ecfdf5', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', color: cx.isBonificacao ? '#ef4444' : '#10b981', display: 'flex' }} 
                            title={cx.isBonificacao ? "Remover Bonificação" : "Marcar como Bonificação"}
                          >
                            <Gift size={14}/>
                          </button>
                          <button onClick={() => abrirFormCaixa(dIdx, originalIdx, cx)} style={{ background: '#f1f5f9', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', color: '#0ea5e9', display: 'flex' }}><Edit size={14}/></button>
                          <button onClick={() => excluirCaixaManual(dIdx, originalIdx)} style={{ background: '#fef2f2', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={14}/></button>
                        </div>
                      </div>
                      
                      {/* LISTAGEM DE PRODUTOS COM AGRUPAMENTO VISUAL AUTOMÁTICO */}
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {Object.values((cx.produtos || []).reduce((acc, p) => {
                          const cod = p.referencia || 'S/N';
                          if (!acc[cod]) acc[cod] = { ref: cod, desc: p.descricao, qtd: 0 };
                          acc[cod].qtd += (parseInt(p.quantidade) || 1);
                          return acc;
                        }, {})).map((item, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                            <span style={{flex:1}}>{item.ref}</span>
                            <span style={{flex:2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 10px'}} title={item.desc}>{item.desc}</span>
                            <strong style={{color: '#0ea5e9'}}>{item.qtd} un</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: RESUMO GERAL UNIFICADO (Todos os Documentos) */}
          <div style={{ width: '380px', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <ListTree size={20}/> Resumo Geral <span style={{fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', fontWeight: 'normal'}}>Unificado</span>
              </h4>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Engloba as caixas de todas as Notas e Bonificações deste Pedido.</p>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {resumoOrdenado.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Nenhuma caixa consolidada.</div>
              ) : (
                resumoOrdenado.map((k, idx) => (
                  <div key={idx} style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: k.isBonif ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '6px', border: `1px solid ${k.isBonif ? '#fca5a5' : '#e2e8f0'}`, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{color: k.isBonif ? '#ef4444' : 'var(--primary)'}}>
                        {k.originalName} 
                      </strong>
                      <span style={{color: k.isBonif ? '#f87171' : '#94a3b8', fontSize: '0.8rem'}}>{k.peso.toFixed(1)} kg</span>
                    </div>
                    <span style={{fontWeight: 800, color: k.isBonif ? '#b91c1c' : '#334155', fontSize: '1.05rem'}}>{k.qtd} Un</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}