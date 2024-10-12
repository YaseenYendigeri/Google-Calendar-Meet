```markdown
# Google Calendar API Integration - Backend

This project provides a Node.js backend for managing calendar events and Google Meet links using the Google Calendar API. It supports creating, reading, updating, and deleting events.

## Features

- User authentication with OAuth 2.0
- CRUD operations for calendar events
- Integration with Google Meet

## Technologies

- **Node.js**
- **PostgreSQL** (with Sequelize ORM)
- **Google Calendar API**

## Getting Started

### Prerequisites

- Node.js and npm
- Google Cloud Platform project with the Google Calendar API enabled
- PostgreSQL database

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/google-calendar-api-integration-backend.git
   cd google-calendar-api-integration-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add:

   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   DATABASE_URL=postgresql://user:password@localhost:5432/your_database
   ```

4. Initialize the database:

   ```bash
   npx sequelize-cli db:migrate
   ```

### Running the Project

Start the server:

```bash
npm start
```

The server will be accessible at `http://localhost:3000`.

### API Endpoints

- **POST /api/events**: Create a new event.
- **GET /api/events**: Retrieve all events.
- **GET /api/events/:id**: Get an event by ID.
- **PUT /api/events/:id**: Update an event.
- **DELETE /api/events/:id**: Delete an event.

## Acknowledgments

- [Google Calendar API](https://developers.google.com/calendar)
- [Sequelize](https://sequelize.org/)
- [Node.js](https://nodejs.org/)

