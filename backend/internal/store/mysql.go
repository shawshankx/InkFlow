package store

import (
	"ai-notes/internal/model" // 请确认你的 go.mod 包名
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

	// 自动迁移模式：自动创建表结构 (会自动添加 folder 字段)
	err = db.AutoMigrate(&model.Note{})
	if err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	return &Store{DB: db}
}

// 🔥 修改 1: SaveNote 增加 folder 参数
// 逻辑：同时检查 title 和 folder 确定唯一性
func (s *Store) SaveNote(title, folder, content string) error {
	var note model.Note
	// 查找是否存在 (必须 Title 和 Folder 都匹配)
	result := s.DB.Where("title = ? AND folder = ?", title, folder).First(&note)

	if result.Error == nil {
		// 存在 -> 更新内容
		note.Content = content
		return s.DB.Save(&note).Error
	} else {
		// 不存在 -> 创建新笔记
		newNote := model.Note{
			Title:   title,
			Folder:  folder, // 存入文件夹
			Content: content,
		}
		return s.DB.Create(&newNote).Error
	}
}

// 🔥 修改 2: GetNote 增加 folder 参数
func (s *Store) GetNote(title, folder string) (string, error) {
	var note model.Note
	// 查询时必须带上 folder，否则可能查到别的文件夹里的同名笔记
	result := s.DB.Where("title = ? AND folder = ?", title, folder).First(&note)
	if result.Error != nil {
		return "", result.Error
	}
	return note.Content, nil
}

// 🔥 修改 3: ListNotes 返回值改为 []model.NoteSummary
// 以前只返回 []string，现在需要告诉前端哪些笔记属于哪个文件夹
func (s *Store) ListNotes() ([]model.NoteSummary, error) {
	var notes []model.Note
	// 查询所有记录，只取 Title 和 Folder 字段，按更新时间倒序
	result := s.DB.Select("title", "folder").Order("updated_at desc").Find(&notes)
	if result.Error != nil {
		return nil, result.Error
	}

	// 组装返回数据
	var summaries []model.NoteSummary
	for _, n := range notes {
		summaries = append(summaries, model.NoteSummary{
			Title:  n.Title,
			Folder: n.Folder,
		})
	}
	return summaries, nil
}

// 🔥 修改 4: DeleteNote 增加 folder 参数
func (s *Store) DeleteNote(title, folder string) error {
	// 删除指定文件夹下的指定笔记
	return s.DB.Where("title = ? AND folder = ?", title, folder).Unscoped().Delete(&model.Note{}).Error
}
