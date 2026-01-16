import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Save, FileText, Plus, Trash2,
  Download, Upload, CheckSquare, Square, X,
  RotateCcw, Folder, FolderOpen, ChevronRight, ChevronDown, Edit2 // <--- 新增 Edit2 图标
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 🔥 定义笔记的数据结构
interface NoteItem {
  title: string;
  folder: string;
}

function App() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState(""); // 🔥 当前笔记的文件夹状态

  // 用于追踪加载时的原始位置，以便判断移动/重命名
  const [originalLocation, setOriginalLocation] = useState<{ title: string, folder: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved" | "">("");

  // 🔥 列表状态改为对象数组
  // 🔥 列表状态改为对象数组
  const [notesList, setNotesList] = useState<NoteItem[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]); // 🔥 文件夹列表

  // 🔥 折叠状态：记录哪些文件夹是展开的 (默认展开根目录)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));

  // === 批量操作状态 ===
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set()); // 存 "title"
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set()); // 🔥 新增：选中的文件夹

  // === 撤回状态 ===
  const [historyContent, setHistoryContent] = useState<string | null>(null);

  // === 文件夹内联重命名状态 ===
  const [editingFolder, setEditingFolder] = useState<string | null>(null); // 当前正在编辑的文件夹名
  const [tempFolderName, setTempFolderName] = useState(""); // 编辑框中的临时值

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotesList();
  }, []);

  // 🔥 自动保存逻辑
  useEffect(() => {
    // 只有当有标题且不是正在加载时才自动保存
    if (!title) return;

    // 如果刚刚加载完笔记，不要马上保存（避免覆盖）
    // 简单的判断：如果内容和 originalLocation 里的内容不同... 但我们不存 content 在 location 里
    // 我们用一个 debounced effect

    setSaveStatus("Unsaved");

    const timer = setTimeout(() => {
      // 只要 title 存在，就尝试保存 (内容或标题变化都触发)
      if (title) {
        setSaveStatus("Saving...");
        // true = autoSave mode
        handleSave(undefined, undefined, undefined, true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title]); // 🔥 监听 title 变化

  // --- 辅助函数：计算分组 ---
  const groupedNotes = useMemo(() => {
    const groups: Record<string, NoteItem[]> = {};

    // 1. 初始化所有文件夹为空数组 (确保空文件夹也能显示)
    foldersList.forEach(f => {
      groups[f] = [];
    });
    // 确保根目录存在
    if (!groups[""]) groups[""] = [];

    // 2. 填充笔记
    notesList.forEach(note => {
      const f = note.folder || "";
      if (!groups[f]) groups[f] = [];
      groups[f].push(note);
    });
    return groups;
  }, [notesList, foldersList]);

  const toggleFolder = (folderName: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderName)) newSet.delete(folderName);
    else newSet.add(folderName);
    setExpandedFolders(newSet);

    // 🔥 新增：点击文件夹时，将其设为当前编辑器上下文（即“选中”了该文件夹）
    // 这样点击“新建笔记”时，就会默认在这个文件夹下
    setFolder(folderName);
  };

  // --- API 操作 ---

  // API: 获取列表 (同时获取通过 Notes 关联的文件夹和 空文件夹)
  const fetchNotesList = async () => {
    try {
      // 并行请求
      const [resNotes, resFolders] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/folders')
      ]);

      const notesData = await resNotes.json();
      const foldersData = await resFolders.json();

      const notes = notesData || [];
      const folders = foldersData || [];

      setNotesList(notes);
      setFoldersList(folders);

      // 🔥 新增：只有当完全没有任何笔记和文件夹时，才默认开启一个新笔记
      if (notes.length === 0 && folders.length === 0) {
        handleNew();
      }
    } catch (e) {
      console.error("加载列表失败", e);
    }
  };

  // API: 加载单个笔记
  const loadNote = async (noteTitle: string, noteFolder: string) => {
    if (isBatchMode) {
      toggleNoteSelection(noteTitle); // 批量模式下只负责选中
      return;
    }
    try {
      // 🔥 URL 增加 folder 参数
      const res = await fetch(`/api/notes/content?title=${encodeURIComponent(noteTitle)}&folder=${encodeURIComponent(noteFolder)}`);
      const data = await res.json();
      setTitle(data.title);
      setFolder(data.folder || ""); // 更新文件夹状态
      setOriginalLocation({ title: data.title, folder: data.folder || "" }); // 记录原始位置
      setContent(data.content);
      setHistoryContent(null);
    } catch (e) {
      alert("加载笔记失败");
    }
  };

  // API: 保存笔记
  const handleSave = async (customTitle?: string, customContent?: string, customFolder?: string, isAutoSave = false) => {
    const targetTitle = customTitle || title;
    const targetFolder = customFolder !== undefined ? customFolder : folder;
    const targetContent = customContent !== undefined ? customContent : content;

    if (!targetTitle.trim()) { alert("请输入标题"); return; }

    // 🔥 检测是否需要移动或重命名 (Folder 或 Title 发生变化，且不是新建笔记)
    // 用户要求：自动保存也要支持重命名
    if (originalLocation && (targetFolder !== originalLocation.folder || targetTitle !== originalLocation.title)) {
      try {
        const moveRes = await fetch('/api/notes/move', {
          method: 'POST',
          body: JSON.stringify({
            title: originalLocation.title, // 原标题
            newTitle: targetTitle,         // 新标题
            oldFolder: originalLocation.folder,
            newFolder: targetFolder
          })
        });
        if (!moveRes.ok) {
          const err = await moveRes.json();
          alert("❌ 重命名/移动失败: " + (err.error || "未知错误"));
          // 如果重命名失败，最好不要继续保存内容生成新文件，而是阻断
          return;
        }
        // 更新成功后，更新 originalLocation
        setOriginalLocation({ title: targetTitle, folder: targetFolder });
      } catch (e) {
        alert("❌ 请求出错");
        return;
      }
    }

    // 🔥 Body 增加 folder
    const res = await fetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        title: targetTitle,
        folder: targetFolder,
        content: targetContent
      })
    });

    if (!customTitle) {
      if (res.ok) {
        setSaveStatus("Saved");
        setHistoryContent(null);
        fetchNotesList(); // 刷新列表以更新文件夹结构
      } else {
        setSaveStatus("Unsaved");
        if (!isAutoSave) alert("❌ 保存失败");
      }
    }
  };

  // API: 删除单条
  const handleDelete = async () => {
    if (!confirm(`确定要删除 "${title}" 吗？此操作不可恢复。`)) return;
    await deleteNoteAPI(title, folder);

    // 删除后不再强制打开新笔记，而是清空编辑器
    setTitle("");
    setContent("");
    setFolder("");
    setOriginalLocation(null);

    fetchNotesList();
  };

  // 封装删除 API (带 folder)
  const deleteNoteAPI = async (noteTitle: string, noteFolder: string) => {
    return fetch(`/api/notes?title=${encodeURIComponent(noteTitle)}&folder=${encodeURIComponent(noteFolder)}`, {
      method: 'DELETE'
    });
  };

  // API: AI 润色 (保持不变)
  const handlePolish = async () => {
    if (!content.trim()) { alert("请先输入一些内容"); return; }
    setHistoryContent(content);
    setLoading(true);
    try {
      const response = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        const text = data.content || data.message || (data.choices && data.choices[0].message.content) || "";
        setContent(text);
        return;
      }

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
    } finally {
      setLoading(false);
    }
  };

  const handleUndoAI = () => {
    if (historyContent !== null) {
      setContent(historyContent);
      setHistoryContent(null);
    }
  };

  // --- 批量操作区域 ---
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
  };

  const toggleNoteSelection = (noteTitle: string) => {
    const newSet = new Set(selectedNotes);
    if (newSet.has(noteTitle)) { newSet.delete(noteTitle); } else { newSet.add(noteTitle); }
    setSelectedNotes(newSet);
  };

  // 🔥 切换文件夹选中 (选中/取消选中该文件夹下所有笔记)
  const toggleFolderSelection = (folderName: string, notes: NoteItem[]) => {
    const newNotesSet = new Set(selectedNotes);
    const newFoldersSet = new Set(selectedFolders);
    const isSelected = newFoldersSet.has(folderName);

    if (isSelected) {
      newFoldersSet.delete(folderName);
      notes.forEach(n => newNotesSet.delete(n.title));
    } else {
      newFoldersSet.add(folderName);
      notes.forEach(n => newNotesSet.add(n.title));
    }

    setSelectedNotes(newNotesSet);
    setSelectedFolders(newFoldersSet);
  };

  const toggleSelectAll = () => {
    if (selectedNotes.size === notesList.length) {
      setSelectedNotes(new Set());
    } else {
      // 选中所有笔记的标题
      setSelectedNotes(new Set(notesList.map(n => n.title)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedNotes.size === 0 && selectedFolders.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedNotes.size} 篇笔记${selectedFolders.size > 0 ? ` 和 ${selectedFolders.size} 个文件夹` : ""} 吗？\n(文件夹内的所有内容将被物理删除)`)) return;

    // 1. 先删除选中的文件夹 (后端会级联删除笔记)
    for (const folderName of selectedFolders) {
      try {
        await fetch(`/api/folders?name=${encodeURIComponent(folderName)}`, { method: 'DELETE' });
      } catch (e) { console.error(e); }
    }

    // 2. 删除选中的笔记 (排除掉已经在上面删除过的文件夹里的笔记)
    // 简单起见：遍历并调用 API，后端找不到就不删。
    for (const noteTitle of selectedNotes) {
      const noteItem = notesList.find(n => n.title === noteTitle);
      if (noteItem && !selectedFolders.has(noteItem.folder)) {
        try { await deleteNoteAPI(noteTitle, noteItem.folder); } catch (e) { }
      }
    }

    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
    setIsBatchMode(false);

    // 批量删除后清空编辑器
    setTitle("");
    setContent("");
    setFolder("");
    setOriginalLocation(null);

    fetchNotesList();
  };

  const handleBatchExport = async () => {
    if (selectedNotes.size === 0) { alert("请至少选择一篇笔记"); return; }
    const zip = new JSZip();
    let count = 0;

    for (const noteTitle of selectedNotes) {
      const noteItem = notesList.find(n => n.title === noteTitle);
      if (noteItem) {
        try {
          const res = await fetch(`/api/notes/content?title=${encodeURIComponent(noteTitle)}&folder=${encodeURIComponent(noteItem.folder)}`);
          const data = await res.json();
          // 🔥 导出时保留文件夹结构
          const path = data.folder ? `${data.folder}/${data.title}.md` : `${data.title}.md`;
          zip.file(path, data.content);
          count++;
        } catch (e) { }
      }
    }

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `inkflow_notes.zip`);
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
        // 导入时默认 folder 为空 (根目录)，或者你可以改成当前 folder
        await fetch('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title: fileName, folder: "", content: text })
        });
        successCount++;
      }
    }
    alert(`成功导入 ${successCount} 篇笔记！`);
    fetchNotesList();
    event.target.value = '';
  };

  // 🔥 新建文件夹 (直接创建空文件夹)
  const handleNewFolder = async () => {
    const defaultName = "新文件夹-" + Date.now().toString().slice(-4);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: defaultName })
      });
      if (res.ok) {
        // 先刷新列表，确保 DOM 中出现了这个新文件夹
        await fetchNotesList();

        // 自动激活重命名模式
        setEditingFolder(defaultName);
        setTempFolderName("新文件夹");

        // 展开根目录以便看到新文件夹（如果是新建在根目录下的话）
        // 暂时假设新建的都在根级
      } else {
        alert("创建失败");
      }
    } catch (e) {
      alert("请求出错");
    }
  };

  // 🔥 开始重命名 (点击编辑图标触发)
  const startRenameFolder = (oldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(oldName);
    setTempFolderName(oldName);
  };

  // 确认重命名 (回车或失去焦点)
  const confirmRenameFolder = async () => {
    if (!editingFolder) return;
    const oldName = editingFolder;
    const newName = tempFolderName.trim();

    // 如果没变或为空，取消编辑
    if (!newName || newName === oldName) {
      setEditingFolder(null);
      return;
    }

    try {
      const res = await fetch('/api/folders/rename', {
        method: 'POST',
        body: JSON.stringify({ oldName, newName })
      });
      if (!res.ok) {
        const err = await res.json();
        alert("❌ 重命名失败: " + (err.error || "未知错"));
        // 保持编辑状态以便修正
        return;
      }

      // 更新成功
      setEditingFolder(null);

      // 更新当前选中的文件夹状态
      if (folder === oldName) {
        setFolder(newName);
        if (originalLocation && originalLocation.folder === oldName) {
          setOriginalLocation({ ...originalLocation, folder: newName });
        }
      }
      fetchNotesList();
    } catch (e) {
      alert("❌ 请求出错");
    }
  };

  // 取消重命名 (ESC)
  const cancelRenameFolder = () => {
    setEditingFolder(null);
    setTempFolderName("");
  };

  const handleNew = () => {
    setTitle("新笔记-" + Date.now());
    // 不再重置 folder，保留当前上下文
    setOriginalLocation(null); // 新建笔记没有原始位置
    setContent("");
    setHistoryContent(null);
    setIsBatchMode(false);
  };

  const handleSingleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${title || 'untitled'}.md`);
  };

  // === 拖拽逻辑 ===
  const handleDragStart = (e: React.DragEvent, note: NoteItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(note));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 允许放置
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    try {
      const sourceNote = JSON.parse(dataStr) as NoteItem;
      // 如果来源文件夹和目标一致，忽略
      if (sourceNote.folder === targetFolder || (!sourceNote.folder && !targetFolder)) return;

      const res = await fetch('/api/notes/move', {
        method: 'POST',
        body: JSON.stringify({
          title: sourceNote.title,
          oldFolder: sourceNote.folder,
          newFolder: targetFolder
        })
      });

      if (res.ok) {
        // 如果当前正在编辑这个被移动的笔记，更新它的原始位置状态，避免后续保存出错
        if (originalLocation && originalLocation.title === sourceNote.title && originalLocation.folder === sourceNote.folder) {
          setOriginalLocation({ title: sourceNote.title, folder: targetFolder });
          setFolder(targetFolder);
        }
        fetchNotesList(); // 刷新列表
      } else {
        const err = await res.json();
        alert("移动失败: " + err.error);
      }
    } catch (e) {
      console.error("Drop error", e);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f9fafb' }}>
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt" style={{ display: 'none' }} />

      {/* === 左侧侧边栏 (树形结构) === */}
      <div style={{ width: '260px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{isBatchMode ? `已选 ${selectedNotes.size}` : "🗂️ 笔记本"}</h2>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={toggleBatchMode} title={isBatchMode ? "退出批量" : "批量管理"} style={{ border: 'none', background: isBatchMode ? '#fee2e2' : 'transparent', color: isBatchMode ? '#ef4444' : '#666', cursor: 'pointer', padding: '5px', borderRadius: '4px' }}>
              {isBatchMode ? <X size={18} /> : <CheckSquare size={18} />}
            </button>
            <button onClick={handleNewFolder} title="新建文件夹" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#666', padding: '5px' }}>
              <FolderOpen size={18} />
            </button>
            {!isBatchMode && (
              <button onClick={handleNew} title="新建笔记" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#666', padding: '5px' }}>
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 批量操作工具栏 */}
        {isBatchMode && (
          <div style={{ padding: '10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '5px', justifyContent: 'space-between' }}>
            <button onClick={toggleSelectAll} style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>全选</button>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={handleBatchExport} title="导出选中" style={{ border: '1px solid #ddd', background: 'white', cursor: 'pointer', padding: '5px', borderRadius: '4px', color: '#374151' }}><Download size={14} /></button>
              <button onClick={handleBatchDelete} title="删除选中" style={{ border: '1px solid #ef4444', background: '#fff', cursor: 'pointer', padding: '5px', borderRadius: '4px', color: '#ef4444' }}><Trash2 size={14} /></button>
            </div>
          </div>
        )}

        {/* 树形列表渲染 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {/* 1. 遍历所有非空文件夹 */}
          {Object.entries(groupedNotes).map(([groupName, notes]) => {
            const isRoot = groupName === "";
            if (isRoot) return null; // 根目录稍后单独渲染

            const isExpanded = expandedFolders.has(groupName);

            return (
              <div key={groupName} style={{ marginBottom: '5px' }}>
                {/* 文件夹标题 */}
                <div
                  onClick={() => toggleFolder(groupName)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, groupName)}
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', color: '#4b5563', fontWeight: '600', fontSize: '14px', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {isBatchMode ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleFolderSelection(groupName, notes); }}
                        style={{ marginRight: 8, display: 'flex', alignItems: 'center' }}
                      >
                        {selectedFolders.has(groupName) ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} color="#9ca3af" />}
                      </div>
                    ) : (
                      isExpanded ? <ChevronDown size={14} style={{ marginRight: 5 }} /> : <ChevronRight size={14} style={{ marginRight: 5 }} />
                    )}
                    <Folder size={16} style={{ marginRight: 6, fill: '#fbbf24', stroke: '#d97706' }} />

                    {/* 内联编辑输入框 vs 文本显示 */}
                    {editingFolder === groupName ? (
                      <input
                        autoFocus
                        value={tempFolderName}
                        onClick={(e) => e.stopPropagation()} // 防止触发折叠
                        onChange={(e) => setTempFolderName(e.target.value)}
                        onBlur={confirmRenameFolder}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRenameFolder();
                          if (e.key === 'Escape') cancelRenameFolder();
                        }}
                        style={{ border: '1px solid #3b82f6', outline: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '14px', width: '100%' }}
                      />
                    ) : (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</span>
                    )}
                  </div>

                  {/* 重命名按钮 (只有不在编辑时显示) */}
                  {editingFolder !== groupName && (
                    <button
                      onClick={(e) => startRenameFolder(groupName, e)}
                      title="重命名文件夹"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: '2px', display: 'flex' }}
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>

                {/* 文件夹下的笔记 */}
                {isExpanded && (
                  <div style={{ paddingLeft: '20px', borderLeft: '2px solid #f3f4f6', marginLeft: '9px' }}>
                    {notes.map(note => <NoteListItem key={note.title + note.folder} note={note} />)}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. 渲染根目录 (未分类) 的笔记 */}
          {/* 将整个根目录区域作为一个 Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "")}
            style={{ marginTop: '10px', minHeight: '50px' }} // 给一点高度以便可以拖进去
          >
            {groupedNotes[""] && groupedNotes[""].length > 0 && (
              <>
                {Object.keys(groupedNotes).length > 1 && <div style={{ fontSize: '12px', color: '#999', padding: '5px 8px', fontWeight: 'bold' }}>未分类</div>}
                {groupedNotes[""].map(note => <NoteListItem key={note.title} note={note} />)}
              </>
            )}
            {(!groupedNotes[""] || groupedNotes[""].length === 0) && Object.keys(groupedNotes).length > 0 && (
              <div style={{ fontSize: '12px', color: '#ccc', padding: '10px', textAlign: 'center', border: '1px dashed #eee' }}>拖拽至此移出文件夹</div>
            )}
          </div>
        </div>
      </div>

      {/* === 右侧主区域 === */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '10px', alignItems: 'center' }}>


          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题..." disabled={isBatchMode} style={{ fontSize: '20px', border: 'none', outline: 'none', fontWeight: 'bold', flex: 1, color: isBatchMode ? '#999' : '#000' }} />

          <button onClick={handleImportClick} title="导入" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Upload size={16} /></button>
          <button onClick={handleSingleExport} title="导出" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Download size={16} /></button>
          <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 5px' }}></div>

          {historyContent !== null && (
            <button onClick={handleUndoAI} title="撤回 AI 润色" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <RotateCcw size={16} /> 撤回
            </button>
          )}

          <button onClick={handlePolish} disabled={loading || isBatchMode} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (loading || isBatchMode) ? 0.5 : 1 }}>
            <Sparkles size={16} /> {loading ? '润色中' : 'AI 润色'}
          </button>
          <button onClick={() => handleSave()} disabled={isBatchMode} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: isBatchMode ? 0.5 : 1 }}><Save size={16} /> 保存</button>
          {/* 保存状态指示器 */}
          <span style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px', textAlign: 'right' }}>{saveStatus}</span>
          <button onClick={handleDelete} disabled={isBatchMode} title="删除" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: isBatchMode ? 0.5 : 1 }}><Trash2 size={16} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {isBatchMode && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '24px', color: '#374151', fontWeight: 'bold' }}>批量管理模式</div>
              <button onClick={toggleBatchMode} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>退出批量模式</button>
            </div>
          )}
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="在此输入 Markdown 内容..." style={{ flex: 1, padding: '20px', border: 'none', borderRight: '1px solid #e5e7eb', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'monospace', lineHeight: '1.6', background: '#f9fafb' }} />
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff', lineHeight: '1.6' }}><ReactMarkdown>{content}</ReactMarkdown></div>
        </div>
      </div>
    </div>
  );

  // 🔥 子组件：渲染单个笔记项
  function NoteListItem({ note }: { note: NoteItem }) {
    const isSelected = selectedNotes.has(note.title);
    // 判断当前选中高亮：同时匹配标题和文件夹
    const isCurrent = title === note.title && folder === (note.folder || "");

    return (
      <div
        draggable="true"
        onDragStart={(e) => handleDragStart(e, note)}
        onClick={() => loadNote(note.title, note.folder)}
        style={{
          padding: '8px 12px', cursor: 'pointer', borderRadius: '6px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px',
          background: (isBatchMode && isSelected) ? '#eff6ff' : (isCurrent && !isBatchMode ? '#f3f4f6' : 'transparent'),
          color: (isCurrent || isSelected) ? '#2563eb' : '#374151',
          border: (isBatchMode && isSelected) ? '1px solid #bfdbfe' : '1px solid transparent'
        }}
      >
        {isBatchMode ? (isSelected ? <CheckSquare size={14} color="#2563eb" /> : <Square size={14} color="#9ca3af" />) : <FileText size={14} />}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{note.title}</span>
      </div>
    );
  }
}

export default App;