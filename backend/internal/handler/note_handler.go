package handler

import (
	"ai-notes/internal/model" // 请确认你的 go.mod 名字，如果是 inkflow 请改为 inkflow
	"ai-notes/internal/store"
	"net/http"

	"github.com/gin-gonic/gin"
)

type NoteHandler struct {
	Store *store.Store
}

func NewNoteHandler(s *store.Store) *NoteHandler {
	return &NoteHandler{Store: s}
}

// List 获取列表
// 返回结构示例: [{"title": "笔记A", "folder": "工作"}, {"title": "笔记B", "folder": ""}]
func (h *NoteHandler) List(c *gin.Context) {
	// Store 层需要返回包含 Folder 信息的列表
	notes, err := h.Store.ListNotes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取列表失败"})
		return
	}
	c.JSON(http.StatusOK, notes)
}

// Get 获取单个笔记内容
// 前端请求示例: /api/notes/content?title=笔记A&folder=工作
func (h *NoteHandler) Get(c *gin.Context) {
	title := c.Query("title")
	folder := c.Query("folder") // 🔥 新增：获取 folder 参数

	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少标题"})
		return
	}

	// 传递 folder 给 Store
	content, err := h.Store.GetNote(title, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"title":   title,
		"folder":  folder,
		"content": content,
	})
}

// Save 保存笔记 (新建或更新)
func (h *NoteHandler) Save(c *gin.Context) {
	var req model.NoteRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	// 🔥 新增：将 req.Folder 传给 Store
	if err := h.Store.SaveNote(req.Title, req.Folder, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Delete 删除笔记
func (h *NoteHandler) Delete(c *gin.Context) {
	title := c.Query("title")
	// 虽然 folder 在删除时理论上最好有，但为了兼容旧接口，如果没有传 folder，可以默认删根目录的，或者删所有叫这个名字的
	// 建议前端删除时带上 folder 参数
	folder := c.Query("folder")

	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少标题"})
		return
	}

	// 传递 folder 给 Store
	if err := h.Store.DeleteNote(title, folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// Move 移动笔记
func (h *NoteHandler) Move(c *gin.Context) {
	var req struct {
		Title     string `json:"title"`
		OldFolder string `json:"oldFolder"`
		NewFolder string `json:"newFolder"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if req.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少标题"})
		return
	}

	if err := h.Store.MoveNote(req.Title, req.OldFolder, req.NewFolder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "moved"})
}