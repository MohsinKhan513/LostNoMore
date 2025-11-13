# Development Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd Sprint-01
npm install
```

### 2. Set Up MongoDB
Make sure MongoDB is installed and running on your system.

**Install MongoDB:**
- **Ubuntu/Debian:**
  ```bash
  sudo apt-get install mongodb
  sudo systemctl start mongodb
  ```
- **macOS (Homebrew):**
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community
  brew services start mongodb-community
  ```
- **Windows:** Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### 3. Create Environment File
Create a `.env` file in the `Sprint-01` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/lostnomore
JWT_SECRET=your_very_secure_secret_key_here
```

### 4. Create Required Directories
```bash
mkdir -p uploads
```

### 5. Start the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

### 6. Access the Application
Open your browser and navigate to: `http://localhost:5000`

## Default Test Accounts

For testing purposes, you can create accounts using university emails:
- Email format: `yourname@nu.edu.pk` or `yourname@isb.nu.edu.pk`
- Password: Choose any password (min 6 characters)
- Phone: Must be in E.164 format (e.g., `+923001234567`)

## Testing the Application

### Register a New User
1. Click "Create one" on the login page
2. Fill in all fields:
   - Full name
   - University email (@nu.edu.pk or @isb.nu.edu.pk)
   - Phone number (+923001234567 format)
   - Password
3. Click "Register"

### Create a Lost Item Report
1. Login with your credentials
2. Click "Report Item" button
3. Select "I Lost Something"
4. Fill in item details:
   - Item name
   - Description
   - Category
   - Last known location
   - Optional: Upload image
5. Submit the report

### Search and Filter
1. Go to "All Items" (dashboard)
2. Click "🔍 Search & Filter"
3. Try different filters:
   - Keyword search
   - Category filter
   - Location filter
   - Date range
   - Sort options

### Manage Your Reports
1. Click "My Reports"
2. View all your reports
3. Click "View Details" on any item
4. As the owner, you can:
   - Edit item details
   - Mark as Recovered/Returned
   - Delete the item

## Troubleshooting

### MongoDB Connection Error
- **Error:** `MongooseServerSelectionError: connect ECONNREFUSED`
- **Solution:** Make sure MongoDB is running:
  ```bash
  # Check MongoDB status
  sudo systemctl status mongodb  # Linux
  brew services list              # macOS
  ```

### Port Already in Use
- **Error:** `Error: listen EADDRINUSE: address already in use :::5000`
- **Solution:** Change the PORT in `.env` file or kill the process using port 5000:
  ```bash
  # Find process using port 5000
  lsof -i :5000
  # Kill the process
  kill -9 <PID>
  ```

### Upload Directory Error
- **Error:** `ENOENT: no such file or directory, open '.../uploads/...'`
- **Solution:** Create the uploads directory:
  ```bash
  mkdir uploads
  ```

### JWT Secret Error
- **Error:** `secretOrPrivateKey must have a value`
- **Solution:** Make sure `.env` file exists and has `JWT_SECRET` defined

## Development Tips

### Auto-Restart on Changes
Use nodemon for automatic server restart during development:
```bash
npm run dev
```

### View MongoDB Data
You can use MongoDB Compass or the mongo shell:
```bash
# Connect to database
mongo

# Use the database
use lostnomore

# View collections
show collections

# View users
db.users.find().pretty()

# View items
db.items.find().pretty()
```

### Clear Database (Start Fresh)
```bash
mongo
use lostnomore
db.dropDatabase()
```

### Testing API Endpoints
You can use tools like Postman or curl to test API endpoints:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@nu.edu.pk",
    "password": "password123",
    "phone": "+923001234567"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@nu.edu.pk",
    "password": "password123"
  }'
```

## Project Structure Guide

```
Sprint-01/
├── client/              # Frontend code
│   ├── index.html      # Main HTML (all views in one file)
│   ├── app.js          # Frontend JavaScript logic
│   └── styles.css      # All styles
├── server/
│   ├── middleware/     # Express middleware
│   ├── models/         # Database schemas
│   ├── routes/         # API route handlers
│   └── server.js       # Server entry point
├── uploads/            # User uploaded images (gitignored)
└── .env               # Environment config (gitignored)
```

## Common Development Tasks

### Adding a New API Endpoint
1. Add route in `server/routes/item.routes.js` or `auth.routes.js`
2. Add corresponding API method in `client/app.js`
3. Add event handler and UI update logic
4. Test the endpoint

### Adding a New Field to Item
1. Update `server/models/item.model.js`
2. Update API routes to handle the new field
3. Update client-side forms and display logic
4. Update `client/index.html` and `client/app.js`

### Modifying Styles
All styles are in `client/styles.css`. The CSS uses custom properties for colors and spacing, making it easy to maintain consistency.

## Security Notes

- Never commit `.env` file
- Never commit `node_modules/`
- Never commit uploaded files in `uploads/`
- Always use strong JWT secrets in production
- Regularly update dependencies: `npm audit fix`

## Getting Help

If you encounter issues:
1. Check the console for error messages
2. Verify MongoDB is running
3. Check `.env` file configuration
4. Review server logs
5. Ensure all dependencies are installed

## Next Steps

After successful setup:
1. Explore the codebase
2. Test all features
3. Read the API documentation in README.md
4. Try creating, editing, and deleting items
5. Test the search and filter functionality
