import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Save, FileText, Plus, Trash2 } from 'lucide-react';

function App() {
  const [content, setContent] = useState("# 新建笔记\n\n开始你的创作...");
  const [title, setTitle] = useState("未命名笔记");
  const [loading, setLoading] = useState(false);
  const [notesList, setNotesList] = useState<string[]>([]);

  // 页面加载时：获取笔记列表
  useEffect(() => {
    fetchNotesList();
  }, []);

  // API 1: 获取列表
  const fetchNotesList = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotesList(data || []);
    } catch (e) {
      console.error("加载列表失败", e);
    }
  };

  // API 2: 加载单个笔记
  const loadNote = async (noteTitle: string) => {
    try {
      const res = await fetch(`/api/notes/content?title=${encodeURIComponent(noteTitle)}`);
      const data = await res.json();
      setTitle(data.title);
      setContent(data.content);
    } catch (e) {
      alert("加载笔记失败");
    }
  };

  // API 3: 保存笔记
  const handleSave = async () => {
    if (!title.trim()) { alert("请输入标题"); return; }
    const res = await fetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content })
    });
    if (res.ok) {
      alert("✅ 保存成功!");
      fetchNotesList();
    } else {
      alert("❌ 保存失败");
    }
  };

  // API 4: 【新增】删除笔记
  const handleDelete = async () => {
    if (!confirm(`确定要删除 "${title}" 吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/notes?title=${encodeURIComponent(title)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("🗑️ 删除成功");
        handleNew(); // 删除后重置为空笔记
        fetchNotesList(); // 刷新列表
      } else {
        alert("删除失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  // API 5: AI 润色
  const handlePolish = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let newText = "";
      setContent(""); 
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const json = JSON.parse(line.replace('data: ', ''));
                    const token = json.choices[0]?.delta?.content || "";
                    newText += token;
                    setContent(prev => prev + token);
                } catch (e) {}
            }
        }
      }
    } catch (err) {
      alert("AI 服务出错");
    } finally {
      setLoading(false);
    }
  };

  // 新建空笔记
  const handleNew = () => {
    setTitle("新笔记-" + Date.now());
    setContent("");
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f9fafb' }}>
      
      {/* === 左侧侧边栏 (目录) === */}
      <div style={{ width: '250px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📚 我的笔记</h2>
          <button onClick={handleNew} title="新建" style={{border:'none', background:'transparent', cursor:'pointer', color:'#666'}}>
            <Plus size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {notesList.length === 0 && <div style={{color:'#999', textAlign:'center', marginTop:'20px'}}>暂无笔记</div>}
          {notesList.map(name => (
            <div 
              key={name}
              onClick={() => loadNote(name)}
              style={{
                padding: '10px 15px', 
                cursor: 'pointer', 
                borderRadius: '6px',
                marginBottom: '5px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: title === name ? '#eff6ff' : 'transparent',
                color: title === name ? '#2563eb' : '#374151'
              }}
            >
              <FileText size={16} />
              <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === 右侧主区域 === */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* 顶部工具栏 */}
        <div style={{ padding: '15px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="请输入标题..."
            style={{ fontSize: '20px', border:'none', outline:'none', fontWeight:'bold', flex: 1 }}
          />
          
          <button onClick={handlePolish} disabled={loading} style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#8b5cf6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', opacity: loading ? 0.7 : 1}}>
            <Sparkles size={16}/> {loading ? 'AI 思考中' : 'AI 润色'}
          </button>
          
          <button onClick={handleSave} style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>
            <Save size={16}/> 保存
          </button>

          {/* 新增：删除按钮 */}
          <button onClick={handleDelete} title="删除当前笔记" style={{display:'flex', alignItems:'center', gap:'5px', padding:'8px 16px', background:'#ef4444', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>
            <Trash2 size={16}/>
          </button>
        </div>

        {/* 编辑与预览区 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入 Markdown 内容..."
            style={{ flex: 1, padding: '20px', border: 'none', borderRight: '1px solid #e5e7eb', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'monospace', lineHeight: '1.6', background:'#f9fafb' }}
          />
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff', lineHeight: '1.6' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;