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

	// 自动迁移模式：自动创建表结构
	// 先迁移 Folder，再 Note
	err = db.AutoMigrate(&model.Folder{}, &model.Note{})
	if err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	s := &Store{DB: db}
	s.MigrateLegacyFolders() // 尝试迁移旧数据
	return s
}

// MigrateLegacyFolders 将旧的 folder 字符串字段迁移到 Folders 表
func (s *Store) MigrateLegacyFolders() {
	// 检查 notes 表是否有 folder 列 (raw SQL)
	// 如果 Note struct 已经去掉了 Folder 字段，GORM 可能看不到它，但数据库里还在
	// 我们用 raw sql 检查并迁移
	
	// 1. 检查是否存在 'folder' 列
	var count int64
	s.DB.Raw("SELECT count(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'folder'").Scan(&count)
	
	if count > 0 {
		log.Println("检测到旧版 'folder' 字段，开始迁移数据...")
		
		// 2. 获取所有非空的旧 folder 字符串
		type Result struct {
			Folder string
		}
		var results []Result
		s.DB.Raw("SELECT DISTINCT folder FROM notes WHERE folder IS NOT NULL AND folder != ''").Scan(&results)
		
		for _, r := range results {
			folderName := r.Folder
			// 3. 确保 Folder 存在
			var folder model.Folder
			if err := s.DB.FirstOrCreate(&folder, model.Folder{Name: folderName}).Error; err != nil {
				log.Printf("迁移创建文件夹 '%s' 失败: %v", folderName, err)
				continue
			}
			
			// 4. 更新相关的 Notes
			if err := s.DB.Exec("UPDATE notes SET folder_id = ? WHERE folder = ?", folder.ID, folderName).Error; err != nil {
				log.Printf("迁移更新笔记关联 '%s' 失败: %v", folderName, err)
			}
		}
		log.Println("旧版 Folder 数据迁移完成")
		
		// 可选：删除旧字段 (为了安全起见暂时保留，或者重命名)
		// s.DB.Exec("ALTER TABLE notes DROP COLUMN folder")
	}
}

// ensureFolder 根据名称获取或创建 Folder
func (s *Store) ensureFolder(name string) (*model.Folder, error) {
	if name == "" {
		return nil, nil // 根目录
	}
	var folder model.Folder
	// 使用 FirstOrCreate 保证存在
	// 注意：必须把 Name 放在 struct 里传进去，否则 simple Where string 不会被用于创建字段
	if err := s.DB.FirstOrCreate(&folder, model.Folder{Name: name}).Error; err != nil {
		return nil, err
	}
	return &folder, nil
}

// getFolderID 获取 FolderID (如果 folderName 为空则返回 0/null 的效果)
func (s *Store) getFolderID(folderName string) (uint, error) {
	if folderName == "" {
		return 0, nil
	}
	folder, err := s.ensureFolder(folderName)
	if err != nil {
		return 0, err
	}
	return folder.ID, nil
}

// SaveNote
func (s *Store) SaveNote(title, folderName, content string) error {
	folderID, err := s.getFolderID(folderName)
	if err != nil {
		return err
	}
	
	// 在数据库中查找笔记：需通过 Title + FolderID 唯一确定
	var note model.Note
	// 构建查询条件
	query := s.DB.Where("title = ?", title)
	if folderID == 0 {
		query = query.Where("folder_id IS NULL OR folder_id = 0")
	} else {
		query = query.Where("folder_id = ?", folderID)
	}
	
	result := query.First(&note)

	if result.Error == nil {
		// 存在 -> 更新
		note.Content = content
		return s.DB.Save(&note).Error
	} else {
		// 不存在 -> 创建
		newNote := model.Note{
			Title:   title,
			FolderID: folderID,
			Content: content,
		}
		// 如果 folderID == 0，GORM 会存为 0。如果我们想要 NULL，可以是指针或者 Accept 0 as "root"
		// 这里我们假设 0 就是 root。Types里 FolderID 是 uint，默认 0。
		// 如果我们希望 FolderID 对应 NULL，需要 FolderID *uint
		// 简单起见：FolderID = 0 表示根目录 (因为 GORM default convention start ID at 1)
		
		return s.DB.Create(&newNote).Error
	}
}

// GetNote
func (s *Store) GetNote(title, folderName string) (string, error) {
	// 需要先解析 folderName -> ID
	// 但这可能有一个问题：如果前端传了一个不存在的文件夹名，我们这里不应该创建它。
	// 所以仅仅是 Look up
	var folderID uint = 0
	if folderName != "" {
		var f model.Folder
		if err := s.DB.Where("name = ?", folderName).First(&f).Error; err != nil {
			return "", fmt.Errorf("找不到文件夹: %s", folderName)
		}
		folderID = f.ID
	}

	var note model.Note
	query := s.DB.Where("title = ?", title)
	if folderID == 0 {
		query = query.Where("folder_id IS NULL OR folder_id = 0")
	} else {
		query = query.Where("folder_id = ?", folderID)
	}
	
	if err := query.First(&note).Error; err != nil {
		return "", err
	}
	return note.Content, nil
}

// ListNotes Return summaries with Folder Names
func (s *Store) ListNotes() ([]model.NoteSummary, error) {
	var notes []model.Note
	// Preload Folder 关联
	if err := s.DB.Preload("Folder").Order("updated_at desc").Find(&notes).Error; err != nil {
		return nil, err
	}

	var summaries []model.NoteSummary
	for _, n := range notes {
		fName := ""
		if n.Folder != nil {
			fName = n.Folder.Name
		}
		summaries = append(summaries, model.NoteSummary{
			Title:  n.Title,
			Folder: fName,
		})
	}
	return summaries, nil
}

// DeleteNote
func (s *Store) DeleteNote(title, folderName string) error {
	// Resolve ID
	var folderID uint = 0
	if folderName != "" {
		var f model.Folder
		if err := s.DB.Where("name = ?", folderName).First(&f).Error; err != nil {
			// 如果文件夹都不存在，那笔记肯定也不存在，直接返回无需删除
			return nil
		}
		folderID = f.ID
	}
	
	query := s.DB.Where("title = ?", title)
	if folderID == 0 {
		query = query.Where("folder_id IS NULL OR folder_id = 0")
	} else {
		query = query.Where("folder_id = ?", folderID)
	}
	
	return query.Unscoped().Delete(&model.Note{}).Error
}

// UpdateNoteMeta (Move or Rename Note)
func (s *Store) UpdateNoteMeta(oldTitle, oldFolder, newTitle, newFolder string) error {
	// 1. Resolve IDs
	oldFID, err := s.getFolderID(oldFolder) // 这里如果 oldFolder 不存在会创建... 理论上不应该，但如果是 legacy string 问题不大
	if err != nil { return err }
	
	newFID, err := s.getFolderID(newFolder)
	if err != nil { return err }

	// 2. Check collision
	if oldTitle != newTitle || oldFolder != newFolder {
		var count int64
		q := s.DB.Model(&model.Note{}).Where("title = ?", newTitle)
		if newFID == 0 {
			q = q.Where("folder_id IS NULL OR folder_id = 0")
		} else {
			q = q.Where("folder_id = ?", newFID)
		}
		q.Count(&count)
		if count > 0 {
			return fmt.Errorf("目标位置已存在同名笔记")
		}
	} else {
		return nil
	}

	// 3. Find Old Note
	var note model.Note
	qOld := s.DB.Where("title = ?", oldTitle)
	if oldFID == 0 {
		qOld = qOld.Where("folder_id IS NULL OR folder_id = 0")
	} else {
		qOld = qOld.Where("folder_id = ?", oldFID)
	}
	if err := qOld.First(&note).Error; err != nil {
		return err
	}

	// 4. Update
	note.Title = newTitle
	note.FolderID = newFID
	return s.DB.Save(&note).Error
}

// RenameFolder 修改文件夹名称
func (s *Store) RenameFolder(oldName, newName string) error {
	if oldName == "" || newName == "" {
		return fmt.Errorf("文件夹名称不能为空")
	}
	
	// 1. 检查新名称是否已被占用
	var exists int64
	s.DB.Model(&model.Folder{}).Where("name = ?", newName).Count(&exists)
	if exists > 0 {
		// 如果目标文件夹已存在，这实际上是 "Merge" 操作吗？
		// 用户通常期望 Rename 是单纯改名。如果名字冲突，报错比较安全。
		return fmt.Errorf("文件夹 '%s' 已存在", newName)
	}
	
	// 2. 查找并更新
	result := s.DB.Model(&model.Folder{}).Where("name = ?", oldName).Update("name", newName)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("找不到文件夹 '%s'", oldName)
	}
	return nil
}

// CreateFolder 创建空文件夹
func (s *Store) CreateFolder(name string) error {
	if name == "" {
		return fmt.Errorf("文件夹名称不能为空")
	}
	_, err := s.ensureFolder(name)
	return err
}

// ListFolders 获取所有文件夹名称列表
func (s *Store) ListFolders() ([]string, error) {
	var folders []model.Folder
	if err := s.DB.Select("name").Find(&folders).Error; err != nil {
		return nil, err
	}
	
	var names []string
	for _, f := range folders {
		names = append(names, f.Name)
	}
	return names, nil
}
