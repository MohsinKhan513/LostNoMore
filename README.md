# LostNoMore
University Lost & Found Management System - Intro to SE Project

## 📋 Project Overview

LostNoMore is a full-stack web application designed for university students to report and find lost items on campus. The system allows users to register with their university email, create reports for lost or found items, search through existing reports, and manage their submissions.

## ✨ Features Implemented

### Sprint 1: Core Functionality & Reporting

#### User Authentication & Authorization
- **US-01, US-03**: User registration with university email validation (@nu.edu.pk, @isb.nu.edu.pk)
- **US-02, US-04**: Secure login with JWT authentication
- **US-05**: Logout functionality
- **US-06**: Update contact information (phone number, WhatsApp)
- **US-07**: Password reset functionality

#### Item Reporting
- **US-08**: Create 'lost item' reports with name, description, and location
- **US-09**: Upload images for lost items
- **US-14**: Create 'found item' reports with name, description, and location
- **US-15**: Upload images for found items

#### View & Manage Reports
- **US-10**: View list of all lost items reported by user
- **US-16**: View list of all found items reported by user
- **US-24**: View detailed information for specific items including contact info

### Sprint 2: Report Management & Advanced Searching

#### Report Management
- **US-11**: Edit lost item report details
- **US-12**: Mark lost items as 'Recovered'
- **US-13**: Delete lost item reports
- **US-17**: Edit found item location
- **US-18**: Delete found item reports (mark as returned)

#### Advanced Search & Filtering
- **US-19**: Search items by keyword (searches name and description)
- **US-20**: Filter by category (Electronics, Apparel, Keys/Cards, Books/Notes, Other)
- **US-21**: Filter by building/location
- **US-22**: Filter by date range (from/to dates)
- **US-23**: Sort reports by date, name, category, or location

## 🛠 Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **express-rate-limit** - API rate limiting
- **dotenv** - Environment variables
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling
- **Vanilla JavaScript** - Client-side logic
- **Fetch API** - HTTP requests

## 🔒 Security Features

### Implemented Security Measures
1. **Authentication & Authorization**
   - JWT-based authentication
   - Protected routes with auth middleware
   - Secure password hashing with bcrypt

2. **Input Validation**
   - University email validation
   - E.164 phone number format validation
   - Type checking for all user inputs
   - Whitelisted categories and sort fields

3. **Injection Prevention**
   - Sanitized regex inputs to prevent MongoDB injection
   - Escaped special characters in search queries
   - Validated date inputs
   - Protected against malicious query objects

4. **Rate Limiting**
   - Auth routes: 5 requests per 15 minutes
   - Modification routes: 30 requests per 15 minutes
   - API routes: 100 requests per 15 minutes

5. **Dependency Security**
   - No known vulnerabilities in dependencies
   - Mongoose 8.9.5 (patched search injection)
   - Multer 2.0.2 (patched DoS vulnerabilities)

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/MohsinKhan513/LostNoMore.git
   cd LostNoMore/Sprint-01
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the Sprint-01 directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/lostnomore
   JWT_SECRET=your_secure_jwt_secret_here_change_in_production
   ```

4. **Start MongoDB**
   ```bash
   # On Ubuntu/Linux
   sudo systemctl start mongod
   
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Windows
   net start MongoDB
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to: `http://localhost:5000`

## 📁 Project Structure

```
Sprint-01/
├── client/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── app.js            # Client-side JavaScript
│   └── styles.css        # Styling
├── server/                # Backend files
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.js      # Authentication middleware
│   │   └── rate-limit.middleware.js # Rate limiting
│   ├── models/          # Mongoose models
│   │   ├── user.model.js          # User schema
│   │   └── item.model.js          # Item schema
│   ├── routes/          # API routes
│   │   ├── auth.routes.js         # Authentication endpoints
│   │   └── item.routes.js         # Item CRUD endpoints
│   └── server.js        # Express server setup
├── uploads/             # Uploaded images (gitignored)
├── .env                # Environment variables (gitignored)
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies
└── package-lock.json   # Dependency lock file
```

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update profile | Yes |
| POST | `/reset-password` | Change password | Yes |

### Item Routes (`/api/items`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/all` | Get all items | No |
| GET | `/my-reports` | Get user's items | Yes |
| GET | `/:id` | Get item by ID | No |
| POST | `/report` | Create new item | Yes |
| PUT | `/:id` | Update item | Yes |
| PATCH | `/:id/status` | Update item status | Yes |
| DELETE | `/:id` | Delete item | Yes |
| GET | `/search/advanced` | Search & filter items | No |

## 🎨 User Interface

### Key Views
1. **Login/Register** - User authentication
2. **Dashboard** - Browse all reported items with search/filter
3. **My Reports** - View and manage user's own reports
4. **Report Item** - Create new lost/found reports
5. **Item Details** - View detailed item information
6. **Profile** - Manage user profile and password
7. **Edit Item** - Modify existing reports

### UI Features
- Responsive design
- Real-time form validation
- Image upload with preview
- Status badges (Lost/Found, Active/Recovered/Returned)
- Filter panel with multiple criteria
- Contact information display (email, phone, WhatsApp)

## 🧪 Testing

### Manual Testing Checklist
- [ ] User can register with university email
- [ ] User can login and logout
- [ ] User can create lost item report with image
- [ ] User can create found item report with image
- [ ] User can view all items
- [ ] User can view own reports
- [ ] User can edit own reports
- [ ] User can delete own reports
- [ ] User can mark item as recovered/returned
- [ ] User can search items by keyword
- [ ] User can filter by category
- [ ] User can filter by location
- [ ] User can filter by date range
- [ ] User can update profile
- [ ] User can change password

## 🚀 Deployment Considerations

### Environment Variables
Ensure all environment variables are properly set in production:
- Use a strong, unique JWT_SECRET
- Configure proper MongoDB connection string
- Set appropriate PORT

### Security Checklist
- [ ] Change default JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS for specific domains
- [ ] Set up MongoDB authentication
- [ ] Implement backup strategy
- [ ] Monitor rate limits
- [ ] Set up logging and monitoring
- [ ] Regular dependency updates

## 👥 Contributors

- Mohsin Khan

## 📄 License

ISC

