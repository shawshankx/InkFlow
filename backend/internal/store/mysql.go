package store

import (
	"ai-notes/internal/model"
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Store struct {
	DB *gorm.DB
}

// 初始化 MySQL 连接
func NewMySQLStore(user, password, host, port, dbName string) *Store {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}

	// 自动迁移模式：自动创建表结构
	err = db.AutoMigrate(&model.Note{})
	if err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	return &Store{DB: db}
}

// 保存笔记 (Upsert: 如果标题存在则更新，不存在则创建)
func (s *Store) SaveNote(title, content string) error {
	var note model.Note
	// 查找是否存在
	result := s.DB.Where("title = ?", title).First(&note)
	
	if result.Error == nil {
		// 存在 -> 更新
		note.Content = content
		return s.DB.Save(&note).Error
	} else {
		// 不存在 -> 创建
		newNote := model.Note{Title: title, Content: content}
		return s.DB.Create(&newNote).Error
	}
}

// 获取单个笔记
func (s *Store) GetNote(title string) (string, error) {
	var note model.Note
	result := s.DB.Where("title = ?", title).First(&note)
	if result.Error != nil {
		return "", result.Error
	}
	return note.Content, nil
}

// 获取笔记列表 (只返回标题)
func (s *Store) ListNotes() ([]string, error) {
	var notes []model.Note
	// 查询所有记录，只取 Title 字段
	result := s.DB.Select("title").Find(&notes)
	if result.Error != nil {
		return nil, result.Error
	}

	var titles []string
	for _, n := range notes {
		titles = append(titles, n.Title)
	}
	return titles, nil
}

// 删除笔记
func (s *Store) DeleteNote(title string) error {
	// Unscoped() 表示硬删除，如果想要软删除（保留记录但标记删除）则去掉 Unscoped()
	return s.DB.Where("title = ?", title).Unscoped().Delete(&model.Note{}).Error
}