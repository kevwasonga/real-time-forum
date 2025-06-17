# Community Nexus - Development Guide

## Getting Started

This guide will help you set up the development environment and understand the codebase structure for contributing to Community Nexus.

## Prerequisites

### Required Software
- **Go 1.21+**: [Download Go](https://golang.org/dl/)
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **Code Editor**: VS Code, GoLand, or similar with Go support

### Recommended Tools
- **Go Extensions**: Go language support for your editor
- **SQLite Browser**: For database inspection
- **Postman/Insomnia**: For API testing
- **Browser DevTools**: For frontend debugging

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd community-nexus
```

### 2. Install Dependencies
```bash
go mod tidy
```

### 3. Run the Application
```bash
go run .
```

The application will start on `http://localhost:8080` by default.

### 4. Custom Port (Optional)
```bash
PORT=8081 go run .
```

## Project Structure

```
community-nexus/
├── main.go                          # Application entry point
├── go.mod                          # Go module dependencies
├── community_forum.db              # SQLite database (auto-created)
├── backend/                        # Backend Go modules
│   ├── auth.go                     # Authentication handlers
│   ├── db.go                       # Database management
│   ├── models.go                   # Data structures
│   ├── posts.go                    # Discussion management
│   ├── comments.go                 # Comment system
│   ├── messages.go                 # Private messaging
│   ├── profile.go                  # User profiles
│   └── websocket.go                # Real-time features
├── frontend/                       # Modern frontend
│   ├── templates/
│   │   └── index.html              # Single-page application
│   └── static/
│       ├── css/                    # Enhanced stylesheets
│       ├── js/                     # Modular JavaScript
│       └── img/                    # Images and assets
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── API.md                      # API documentation
│   └── DEVELOPMENT.md              # This file
└── README.md                       # Project overview
```

## Development Workflow

### 1. Code Organization

#### Backend (Go)
- **Handlers**: HTTP request handlers in separate files by feature
- **Models**: Data structures in `models.go`
- **Database**: Centralized database operations in `db.go`
- **Utilities**: Helper functions within relevant modules

#### Frontend (JavaScript)
- **Core**: Application framework in `nexus-core.js`
- **Components**: Feature-specific modules (auth, navigation, etc.)
- **Styling**: Component-based CSS with Tailwind utilities

### 2. Naming Conventions

#### Go Code
```go
// Functions: PascalCase for exported, camelCase for internal
func ProcessUserRegistration(w http.ResponseWriter, r *http.Request)
func validateUserInput(data UserData) error

// Variables: camelCase
var userSession UserSession
var databaseConnection *sql.DB

// Constants: PascalCase or UPPER_CASE
const DefaultSessionDuration = 24 * time.Hour
const MAX_LOGIN_ATTEMPTS = 5
```

#### JavaScript Code
```javascript
// Classes: PascalCase
class NexusAuth {}

// Functions: camelCase
function handleUserLogin() {}

// Variables: camelCase
const currentUser = null;
const isAuthenticated = false;

// Constants: UPPER_CASE
const API_BASE_URL = '/api';
const MAX_RETRY_ATTEMPTS = 3;
```

#### CSS Classes
```css
/* Component classes: nexus-component-element */
.nexus-btn {}
.nexus-card-header {}
.nexus-modal-overlay {}

/* Utility classes: descriptive names */
.nexus-gradient-text {}
.nexus-hover-lift {}
.nexus-animate-fade-in {}
```

### 3. Database Development

#### Schema Changes
1. Update table creation in `db.go`
2. Add migration logic if needed
3. Update corresponding Go structs in `models.go`
4. Test with fresh database

#### Query Guidelines
```go
// Use parameterized queries to prevent SQL injection
query := `SELECT id, username FROM users WHERE email = ?`
err := db.QueryRow(query, email).Scan(&user.ID, &user.Username)

// Use transactions for multi-step operations
tx, err := db.Begin()
if err != nil {
    return err
}
defer tx.Rollback() // Will be ignored if tx.Commit() succeeds

// Perform operations...
if err := tx.Commit(); err != nil {
    return err
}
```

### 4. Frontend Development

#### Component Structure
```javascript
class NexusComponent {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Component initialized');
    }

    setupEventListeners() {
        // Event binding logic
    }

    // Public methods
    publicMethod() {}

    // Private methods (convention)
    _privateMethod() {}
}
```

#### Event System
```javascript
// Emit events
nexusCore.emit('user:authenticated', userData);

// Listen to events
nexusCore.on('page:change', (event) => {
    console.log('Page changed to:', event.detail.page);
});
```

## Testing

### Backend Testing

#### Unit Tests
```go
// Create test files with _test.go suffix
func TestProcessUserRegistration(t *testing.T) {
    // Test implementation
}

// Run tests
go test ./backend/...
```

#### Integration Tests
```bash
# Test API endpoints
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com",...}'
```

### Frontend Testing

#### Manual Testing
1. Open browser developer tools
2. Test user interactions
3. Verify WebSocket connections
4. Check responsive design

#### Automated Testing
```javascript
// Example test structure
describe('Authentication', () => {
    it('should login user with valid credentials', () => {
        // Test implementation
    });
});
```

## Debugging

### Backend Debugging

#### Logging
```go
// Use structured logging
log.Printf("User %s attempted login", username)
log.Printf("Database error: %v", err)

// Debug database queries
log.Printf("Executing query: %s with params: %v", query, params)
```

#### Common Issues
- **Database locked**: Ensure proper connection closing
- **Session issues**: Check cookie settings and expiration
- **CORS errors**: Verify request origins in development

### Frontend Debugging

#### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API requests and responses
- **Application**: Inspect cookies and local storage
- **WebSocket**: Monitor real-time connections

#### Common Issues
- **API errors**: Check network tab for failed requests
- **WebSocket disconnections**: Verify connection handling
- **CSS issues**: Use element inspector for styling problems

## Performance Optimization

### Backend Optimization
```go
// Use connection pooling
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(25)
db.SetConnMaxLifetime(5 * time.Minute)

// Optimize queries with indexes
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_created_at ON posts(created_at);

// Use prepared statements for repeated queries
stmt, err := db.Prepare("SELECT * FROM users WHERE id = ?")
defer stmt.Close()
```

### Frontend Optimization
```javascript
// Debounce user input
const debouncedSearch = nexusCore.debounce(searchFunction, 300);

// Lazy load components
const component = await import('./component.js');

// Optimize animations
.nexus-smooth-transition {
    transition: transform 0.2s ease;
    will-change: transform;
}
```

## Security Guidelines

### Backend Security
```go
// Always validate input
if len(username) < 3 || len(username) > 30 {
    return errors.New("invalid username length")
}

// Use bcrypt for passwords
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

// Sanitize database queries
query := `SELECT * FROM users WHERE username = ?`
// Never: query := fmt.Sprintf("SELECT * FROM users WHERE username = '%s'", username)
```

### Frontend Security
```javascript
// Sanitize user input
function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Validate data before sending
if (!email.includes('@')) {
    throw new Error('Invalid email format');
}
```

## Contributing

### Code Style
1. **Go**: Follow `gofmt` and `golint` recommendations
2. **JavaScript**: Use consistent indentation and naming
3. **CSS**: Follow BEM-inspired naming conventions
4. **Comments**: Document all public functions and complex logic

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request with clear description
5. Address review feedback

### Commit Messages
```
feat: add user profile editing functionality
fix: resolve WebSocket connection issues
docs: update API documentation
style: improve CSS component organization
refactor: optimize database query performance
```

## Deployment

### Production Build
```bash
# Build for production
go build -o community-nexus .

# Set production environment variables
export PORT=80
export DB_PATH=/var/lib/community-nexus/forum.db

# Run application
./community-nexus
```

### Environment Variables
- `PORT`: Server port (default: 8080)
- `DB_PATH`: Database file path (default: ./community_forum.db)
- `SESSION_SECRET`: Session encryption key (auto-generated)

## Troubleshooting

### Common Issues

#### "Database is locked"
```bash
# Check for zombie processes
ps aux | grep community-nexus
kill -9 <process-id>

# Remove lock file if exists
rm community_forum.db-wal
rm community_forum.db-shm
```

#### "Port already in use"
```bash
# Find process using port
lsof -i :8080
kill -9 <process-id>

# Or use different port
PORT=8081 go run .
```

#### WebSocket connection fails
1. Check browser console for errors
2. Verify session authentication
3. Test with different browser
4. Check firewall settings

## Resources

### Documentation
- [Go Documentation](https://golang.org/doc/)
- [SQLite Documentation](https://sqlite.org/docs.html)
- [WebSocket RFC](https://tools.ietf.org/html/rfc6455)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools
- [Go Playground](https://play.golang.org/)
- [SQLite Browser](https://sqlitebrowser.org/)
- [Postman](https://www.postman.com/)
- [VS Code Go Extension](https://marketplace.visualstudio.com/items?itemName=golang.go)

---

**Happy Coding!**  
*Developed by Kevin Wasonga and Rabin Otieno*
