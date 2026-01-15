import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, Save, FileText, Plus, Trash2, 
  Download, Upload, CheckSquare, Square, X, 
  RotateCcw // <--- 新增撤回图标
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {
  const [content, setContent] = useState("# 新建笔记\n\n开始你的创作...");
  const [title, setTitle] = useState("未命名笔记");
  const [loading, setLoading] = useState(false);
  const [notesList, setNotesList] = useState<string[]>([]);
  
  // === 批量操作状态 ===
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  
  // === 🔥 撤回状态：存放 AI 润色前的旧内容 ===
  const [historyContent, setHistoryContent] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotesList();
  }, []);

  // API: 获取列表
  const fetchNotesList = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotesList(data || []);
    } catch (e) {
      console.error("加载列表失败", e);
    }
  };

  // API: 加载单个笔记
  const loadNote = async (noteTitle: string) => {
    if (isBatchMode) {
      toggleNoteSelection(noteTitle);
      return;
    }
    try {
      const res = await fetch(`/api/notes/content?title=${encodeURIComponent(noteTitle)}`);
      const data = await res.json();
      setTitle(data.title);
      setContent(data.content);
      setHistoryContent(null); // 切换笔记时，清空撤回历史
    } catch (e) {
      alert("加载笔记失败");
    }
  };

  // API: 保存笔记
  const handleSave = async (customTitle?: string, customContent?: string) => {
    const targetTitle = customTitle || title;
    const targetContent = customContent !== undefined ? customContent : content;

    if (!targetTitle.trim()) { alert("请输入标题"); return; }
    
    const res = await fetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: targetTitle, content: targetContent })
    });
    
    if (!customTitle) {
      if (res.ok) {
        alert("✅ 保存成功!");
        setHistoryContent(null); // 保存后，确认修改，清空撤回历史
        fetchNotesList();
      } else {
        alert("❌ 保存失败");
      }
    }
  };

  // API: 删除单条
  const handleDelete = async () => {
    if (!confirm(`确定要删除 "${title}" 吗？此操作不可恢复。`)) return;
    await deleteNoteAPI(title);
    alert("🗑️ 删除成功");
    handleNew();
    fetchNotesList();
  };

  const deleteNoteAPI = async (noteTitle: string) => {
    return fetch(`/api/notes?title=${encodeURIComponent(noteTitle)}`, {
      method: 'DELETE'
    });
  };

  // API: AI 润色
  const handlePolish = async () => {
    if (!content.trim()) { alert("请先输入一些内容"); return; }
    
    // 🔥 关键：在润色前，先把当前内容存起来！
    setHistoryContent(content);

    setLoading(true);
    
    try {
      const response = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 方式 A: JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        const text = data.content || data.message || (data.choices && data.choices[0].message.content) || "";
        setContent(text);
        return; 
      }

      // 方式 B: Stream
      setContent(""); 
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; 

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                try {
                    const json = JSON.parse(trimmed.replace('data: ', ''));
                    const token = json.choices?.[0]?.delta?.content || "";
                    if (token) setContent(prev => prev + token);
                } catch (e) { console.error(e); }
            }
        }
      }
    } catch (err) {
      console.error(err);
      alert("AI 服务连接失败");
      // 如果失败了，自动恢复（可选）
      // if (historyContent) setContent(historyContent);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 撤回 AI 修改
  const handleUndoAI = () => {
    if (historyContent !== null) {
      setContent(historyContent);
      setHistoryContent(null); // 撤回后，清空历史
    }
  };

  // ... 批量操作区域 (保持不变) ...
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedNotes(new Set());
  };

  const toggleNoteSelection = (noteTitle: string) => {
    const newSet = new Set(selectedNotes);
    if (newSet.has(noteTitle)) { newSet.delete(noteTitle); } else { newSet.add(noteTitle); }
    setSelectedNotes(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedNotes.size === notesList.length) { setSelectedNotes(new Set()); } else { setSelectedNotes(new Set(notesList)); }
  };

  const handleBatchDelete = async () => {
    if (selectedNotes.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedNotes.size} 篇笔记吗？`)) return;
    for (const noteTitle of selectedNotes) {
      try { await deleteNoteAPI(noteTitle); } catch (e) {}
    }
    alert(`批量删除完成`);
    setSelectedNotes(new Set());
    setIsBatchMode(false);
    fetchNotesList();
    handleNew();
  };

  const handleBatchExport = async () => {
    if (selectedNotes.size === 0) { alert("请至少选择一篇笔记"); return; }
    const zip = new JSZip();
    let count = 0;
    for (const noteTitle of selectedNotes) {
      try {
        const res = await fetch(`/api/notes/content?title=${encodeURIComponent(noteTitle)}`);
        const data = await res.json();
        zip.file(`${data.title}.md`, data.content);
        count++;
      } catch (e) {}
    }
    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `inkflow_export_${new Date().toISOString().slice(0,10)}.zip`);
    }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.replace(/\.md$/i, '').replace(/\.txt$/i, '');
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || "");
        reader.readAsText(file);
      });
      if (text) {
        await fetch('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title: fileName, content: text })
        });
        successCount++;
      }
    }
    alert(`成功导入 ${successCount} 篇笔记！`);
    fetchNotesList();
    event.target.value = ''; 
  };

  const handleNew = () => {
    setTitle("新笔记-" + Date.now());
    setContent("");
    setHistoryContent(null); // 新建时清空历史
    setIsBatchMode(false);
  };

  const handleSingleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${title || 'untitled'}.md`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f9fafb' }}>
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt" style={{ display: 'none' }} />

      {/* 左侧侧边栏 */}
      <div style={{ width: '250px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{isBatchMode ? `已选 ${selectedNotes.size} 项` : "📚 我的笔记"}</h2>
          <div style={{display:'flex', gap:'5px'}}>
            <button onClick={toggleBatchMode} title={isBatchMode ? "退出批量" : "批量管理"} style={{border:'none', background: isBatchMode ? '#fee2e2' : 'transparent', color: isBatchMode ? '#ef4444' : '#666', cursor:'pointer', padding:'5px', borderRadius:'4px'}}>
              {isBatchMode ? <X size={18} /> : <CheckSquare size={18} />}
            </button>
            {!isBatchMode && (
              <button onClick={handleNew} title="新建" style={{border:'none', background:'transparent', cursor:'pointer', color:'#666', padding:'5px'}}>
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 批量操作条 */}
        {isBatchMode && (
          <div style={{ padding: '10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display:'flex', gap:'5px', justifyContent:'space-between' }}>
            <button onClick={toggleSelectAll} style={{fontSize:'12px', padding:'5px 8px', border:'1px solid #ddd', borderRadius:'4px', cursor:'pointer', background:'white'}}>
              {selectedNotes.size === notesList.length ? '取消' : '全选'}
            </button>
            <div style={{display:'flex', gap:'5px'}}>
              <button onClick={handleBatchExport} title="导出选中" style={{border:'1px solid #ddd', background:'white', cursor:'pointer', padding:'5px', borderRadius:'4px', color:'#374151'}}><Download size={14} /></button>
              <button onClick={handleBatchDelete} title="删除选中" style={{border:'1px solid #ef4444', background:'#fff', cursor:'pointer', padding:'5px', borderRadius:'4px', color:'#ef4444'}}><Trash2 size={14} /></button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {notesList.map(name => {
            const isSelected = selectedNotes.has(name);
            const isCurrent = title === name;
            return (
              <div key={name} onClick={() => loadNote(name)} style={{
                padding: '10px 15px', cursor: 'pointer', borderRadius: '6px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px',
                background: (isBatchMode && isSelected) ? '#eff6ff' : (isCurrent && !isBatchMode ? '#f3f4f6' : 'transparent'),
                color: (isCurrent || isSelected) ? '#2563eb' : '#374151',
                border: (isBatchMode && isSelected) ? '1px solid #bfdbfe' : '1px solid transparent'
              }}>
                {isBatchMode ? (isSelected ? <CheckSquare size={16} color="#2563eb"/> : <Square size={16} color="#9ca3af"/>) : <FileText size={16} />}
                <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontSize:'14px'}}>{name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧主区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入标题..." disabled={isBatchMode} style={{ fontSize: '20px', border:'none', outline:'none', fontWeight:'bold', flex: 1, color: isBatchMode ? '#999' : '#000' }} />
          
          <button onClick={handleImportClick} title="导入" style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 12px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'6px', cursor:'pointer'}}><Upload size={16}/> 导入</button>
          <button onClick={handleSingleExport} title="导出" style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 12px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'6px', cursor:'pointer'}}><Download size={16}/> 导出</button>
          <div style={{width: '1px', height: '24px', background:'#e5e7eb', margin:'0 5px'}}></div>

          {/* 🔥 撤回按钮：只有当 historyContent 有值时才显示 */}
          {historyContent !== null && (
            <button onClick={handleUndoAI} title="撤回 AI 润色" style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 12px', background:'#f59e0b', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>
              <RotateCcw size={16}/> 撤回
            </button>
          )}

          <button onClick={handlePolish} disabled={loading || isBatchMode} style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#8b5cf6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', opacity: (loading || isBatchMode) ? 0.5 : 1}}>
            <Sparkles size={16}/> {loading ? '润色中' : 'AI 润色'}
          </button>
          <button onClick={() => handleSave()} disabled={isBatchMode} style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', opacity: isBatchMode ? 0.5 : 1}}><Save size={16}/> 保存</button>
          <button onClick={handleDelete} disabled={isBatchMode} title="删除" style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#ef4444', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', opacity: isBatchMode ? 0.5 : 1}}><Trash2 size={16}/></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position:'relative' }}>
          {isBatchMode && (
            <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.8)', zIndex:10, display:'flex', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:'20px'}}>
              <div style={{fontSize:'24px', color:'#374151', fontWeight:'bold'}}>批量管理模式</div>
              <button onClick={toggleBatchMode} style={{padding:'10px 20px', background:'#2563eb', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>退出批量模式</button>
            </div>
          )}
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="在此输入 Markdown 内容..." style={{ flex: 1, padding: '20px', border: 'none', borderRight: '1px solid #e5e7eb', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'monospace', lineHeight: '1.6', background:'#f9fafb' }} />
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff', lineHeight: '1.6' }}><ReactMarkdown>{content}</ReactMarkdown></div>
        </div>
      </div>
    </div>
  );
}

export default App;