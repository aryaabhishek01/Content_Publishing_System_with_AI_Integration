# ContentHub — Content Publishing System

A full-stack, microservices-based social content publishing platform built with **Java (Spring Boot)**, **React**, **MySQL**, and **RabbitMQ**.

---

## 🏗️ Architecture

```
                         ┌──────────────┐
                         │  React App   │
                         │  Port 5173   │
                         └──────┬───────┘
                                │ HTTP
                         ┌──────▼───────┐
                         │ API Gateway  │  ◄── JWT Validation
                         │  Port 8080   │  ◄── Logging Filter
                         │ Spring Cloud │  ◄── Admin Role Guard
                         └──────┬───────┘
                                │ Routes requests
        ┌───────────────────────┼────────────────────────────┐
        │            │          │           │                 │
  ┌─────▼──┐   ┌─────▼──┐ ┌────▼───┐ ┌────▼───┐    ┌────────▼──┐
  │  User  │   │  Post  │ │ Follow │ │Message │    │   OTP     │
  │  :8081 │   │  :8089 │ │  :8083 │ │  :8084 │    │   :8082   │
  └────────┘   └────────┘ └────────┘ └────────┘    └───────────┘
                                            │
  ┌──────────┐  ┌──────────┐ ┌──────────┐  └──► RabbitMQ ──► Notification :8085
  │ Notif.  │  │  Admin   │ │ Feedback │
  │  :8085  │  │  :8086   │ │  :8087   │
  └──────────┘  └──────────┘ └──────────┘
  ┌──────────┐
  │ AI Agent │
  │  :8088   │
  └──────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Maven 3.8+
- MySQL 8.x (root / mysql)
- RabbitMQ (localhost:5672, guest/guest)
- Node.js 18+

### 1. Initialize the Database

```sql
mysql -u root -pmysql < database/init.sql
```

### 2. Start All Services (Windows)

```bash
start-all.bat
```

Or manually start each service:
```bash
cd api-gateway && mvn spring-boot:run
cd user-service && mvn spring-boot:run
# ... (see start-all.bat for all services)
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🔑 Default Admin Account

| Field | Value |
|-------|-------|
| Email | `admin@gmail.com` |
| Password | `Admin@123` |

---

## 📋 Service Ports

| Service | Port |
|---------|------|
| API Gateway | 8080 |
| User Service | 8081 |
| OTP Service | 8082 |
| Follow Service | 8083 |
| Message Service | 8084 |
| Notification Service | 8085 |
| Admin Service | 8086 |
| Feedback Service | 8087 |
| AI Agent Service | 8088 |
| Post Service | 8089 |
| React Frontend | 5173 |

---

## ✨ Features

### User Account
- ✅ Registration with validation:
  - Name: alphabets and spaces only
  - Username: ≥4 letters, no spaces
  - Email: ≥3 chars before @gmail.com
  - Password: ≥8 characters
- ✅ OTP verification via email (RabbitMQ → OTP Service → JavaMailSender)
- ✅ Login via username or email
- ✅ Forgot password via OTP reset
- ✅ JWT token authentication (validated at API Gateway)
- ✅ BCrypt password hashing

### Content
- ✅ Create posts (photo/video, description, mood, categories)
- ✅ Instagram-like home feed with infinite scroll
- ✅ Filter by category or following users
- ✅ Like/unlike posts
- ✅ Comment on posts
- ✅ Delete own posts

### Social
- ✅ Follow / unfollow users
- ✅ Direct messaging (mutual followers only)
- ✅ Notifications (likes, comments, follows)
- ✅ User search

### AI Agents
- ✅ **Description Agent** — generates contextual post descriptions by mood/category
- ✅ **Relevance Agent** — personalizes home feed based on user behavior (views/likes/comments)
- ✅ **Spell-Check Agent** — real-time spelling suggestions using Levenshtein distance

### Admin Dashboard
- ✅ View all users (name, email, role, last login, join date)
- ✅ View and reply to all user feedback
- ✅ Feedback status tracking (PENDING / REPLIED)

---

## 🧪 Testing

### Backend Tests
```bash
# Run all backend tests
cd user-service && mvn test
cd api-gateway && mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 🛡️ Security

- All routes except `/api/auth/**` require a valid JWT token
- Token validated at API Gateway (not repeated at each service)
- User context passed via `X-User-Id`, `X-User-Name`, `X-User-Role` headers
- Admin-only routes protected by `AdminRoleFilter`
- Passwords hashed with BCrypt

---

## 📁 Project Structure

```
Content_Publishing_System/
├── api-gateway/          # Spring Cloud Gateway + JWT validation
├── user-service/         # Registration, login, OTP, profile
├── otp-service/          # RabbitMQ consumer → email delivery
├── post-service/         # Posts, likes, comments, categories
├── follow-service/       # Follow/unfollow, mutual follow check
├── message-service/      # DM messaging (mutual followers only)
├── notification-service/ # RabbitMQ consumer → notification store
├── admin-service/        # Admin-specific queries
├── feedback-service/     # User feedback + admin replies
├── ai-agent-service/     # Description, Relevance, SpellCheck agents
├── frontend/             # React + Vite SPA
├── database/             # MySQL init.sql
└── start-all.bat         # Windows one-click startup
```
