package handler

import (
	"ai-notes/internal/model"
	"ai-notes/internal/store"

	"github.com/gin-gonic/gin"
)

type NoteHandler struct {
	Store *store.Store
}

func NewNoteHandler(s *store.Store) *NoteHandler {
	return &NoteHandler{Store: s}
}

func (h *NoteHandler) List(c *gin.Context) {
	notes, err := h.Store.ListNotes()
	if err != nil {
		c.JSON(500, gin.H{"error": "获取列表失败"})
		return
	}
	c.JSON(200, notes)
}

func (h *NoteHandler) Get(c *gin.Context) {
	title := c.Query("title")
	if title == "" {
		c.JSON(400, gin.H{"error": "缺少标题"})
		return
	}
	content, err := h.Store.GetNote(title)
	if err != nil {
		c.JSON(500, gin.H{"error": "读取失败"})
		return
	}
	c.JSON(200, gin.H{"title": title, "content": content})
}

func (h *NoteHandler) Save(c *gin.Context) {
	var req model.NoteRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}
	if err := h.Store.SaveNote(req.Title, req.Content); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func (h *NoteHandler) Delete(c *gin.Context) {
	title := c.Query("title")
	if title == "" {
		c.JSON(400, gin.H{"error": "缺少标题"})
		return
	}
	if err := h.Store.DeleteNote(title); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "deleted"})
}
