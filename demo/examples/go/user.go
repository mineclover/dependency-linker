// Package user provides user management functionality
//
// @semantic-tags: user-package, user-domain, public-api
// @description: 사용자 관리 기능을 제공하는 패키지
package user

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// User represents a user entity
//
// @semantic-tags: user-struct, user-domain, public-api
type User struct {
	ID        int64     `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// UserService provides user management operations
//
// @semantic-tags: service-struct, user-domain, public-api
type UserService struct {
	db *sql.DB
}

// NewUserService creates a new UserService instance
//
// @semantic-tags: constructor-function, public-api
func NewUserService(db *sql.DB) *UserService {
	return &UserService{
		db: db,
	}
}

// CreateUser creates a new user
//
// @semantic-tags: create-method, public-api
func (s *UserService) CreateUser(ctx context.Context, email, name string) (*User, error) {
	query := `INSERT INTO users (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)`
	
	now := time.Now()
	result, err := s.db.ExecContext(ctx, query, email, name, now, now)
	if err != nil {
		return nil, err
	}
	
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	
	return &User{
		ID:        id,
		Email:     email,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// GetUser retrieves a user by ID
//
// @semantic-tags: read-method, public-api
func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?`
	
	var user User
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return &user, nil
}

// GetUserByEmail retrieves a user by email
//
// @semantic-tags: read-method, public-api
func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users WHERE email = ?`
	
	var user User
	err := s.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return &user, nil
}

// UpdateUser updates a user's information
//
// @semantic-tags: update-method, public-api
func (s *UserService) UpdateUser(ctx context.Context, id int64, email, name string) (*User, error) {
	query := `UPDATE users SET email = ?, name = ?, updated_at = ? WHERE id = ?`
	
	now := time.Now()
	result, err := s.db.ExecContext(ctx, query, email, name, now, id)
	if err != nil {
		return nil, err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	
	if rowsAffected == 0 {
		return nil, errors.New("user not found")
	}
	
	return &User{
		ID:        id,
		Email:     email,
		Name:      name,
		UpdatedAt: now,
	}, nil
}

// DeleteUser deletes a user by ID
//
// @semantic-tags: delete-method, public-api
func (s *UserService) DeleteUser(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = ?`
	
	result, err := s.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return errors.New("user not found")
	}
	
	return nil
}

// ListUsers retrieves a list of users with pagination
//
// @semantic-tags: list-method, public-api
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]*User, error) {
	query := `SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
	
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var users []*User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}
	
	return users, nil
}

// SearchUsers searches for users by name or email
//
// @semantic-tags: search-method, public-api
func (s *UserService) SearchUsers(ctx context.Context, query string, limit int) ([]*User, error) {
	sqlQuery := `SELECT id, email, name, created_at, updated_at FROM users 
		WHERE name LIKE ? OR email LIKE ? 
		ORDER BY created_at DESC LIMIT ?`
	
	searchPattern := "%" + query + "%"
	rows, err := s.db.QueryContext(ctx, sqlQuery, searchPattern, searchPattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var users []*User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}
	
	return users, nil
}

// GetUserCount returns the total number of users
//
// @semantic-tags: count-method, public-api
func (s *UserService) GetUserCount(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM users`
	
	var count int64
	err := s.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, err
	}
	
	return count, nil
}

// UserRepository interface defines user data access operations
//
// @semantic-tags: interface-type, user-domain, public-api
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, limit, offset int) ([]*User, error)
	Search(ctx context.Context, query string, limit int) ([]*User, error)
	Count(ctx context.Context) (int64, error)
}

// ValidateUser validates user data
//
// @semantic-tags: validation-function, public-api
func ValidateUser(user *User) error {
	if user.Email == "" {
		return errors.New("email is required")
	}
	if user.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

// UserExists checks if a user exists by email
//
// @semantic-tags: check-function, public-api
func (s *UserService) UserExists(ctx context.Context, email string) (bool, error) {
	query := `SELECT COUNT(*) FROM users WHERE email = ?`
	
	var count int64
	err := s.db.QueryRowContext(ctx, query, email).Scan(&count)
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}
