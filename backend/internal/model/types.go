package model

import (
	"time"

	"gorm.io/gorm"
)

// ==============================
// 1. 数据库模型 (DB Schema)
// ==============================

type Note struct {
	// 使用 gorm.Model 会自动包含 ID, CreatedAt, UpdatedAt, DeletedAt (软删除)
	// 如果您之前没有使用 gorm.Model，为了兼容旧数据，我们可以手动定义：
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // 支持软删除

	// 🔥 核心修改：联合唯一索引 (uniqueIndex:idx_title_folder)
	// 也就是：(Title + Folder) 必须唯一，允许不同文件夹下有同名笔记
	Title string `gorm:"uniqueIndex:idx_title_folder;size:191" json:"title"`

	// 🔥 新增 Folder 字段
	// default:'' 表示默认是空字符串（即根目录）
	Folder string `gorm:"uniqueIndex:idx_title_folder;size:100;default:''" json:"folder"`

	// 内容使用 text 类型，防止过长截断
	Content string `gorm:"type:longtext" json:"content"`
}

// ==============================
// 2. HTTP 请求/响应结构
// ==============================

// NoteRequest 用于接收前端保存笔记的参数
type NoteRequest struct {
	Title   string `json:"title"`
	Folder  string `json:"folder"` // 🔥 接收文件夹参数
	Content string `json:"content"`
}

// NoteSummary 用于列表接口，不返回 Content 以减小流量
type NoteSummary struct {
	Title  string `json:"title"`
	Folder string `json:"folder"` // 🔥 返回文件夹信息
}

// ==============================
// 3. AI 相关结构
// ==============================

type AiPolishRequest struct {
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}