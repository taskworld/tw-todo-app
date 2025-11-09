# TODO List with Server-sided Timer

A full-stack TODO list application with persistent server-sided timers. Each TODO item can have a timer started on the server, and the timer persists across page refreshes and multiple client connections.

## Architecture

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Database**: MongoDB for persistent TODO storage
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Timer Management**: In-memory timer registry with automatic cleanup

Key Features:
- REST API for backend health checks
- WebSocket events for real-time TODO updates
- Server-sided timer logic that persists independently of client state
- Automatic timer completion notifications to all connected clients

### Frontend (React + Vite + TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Real-time Client**: Socket.IO client for WebSocket communication
- **State Management**: React hooks for local state management

Key Features:
- Real-time synchronization with server via WebSocket
- Client-side countdown display synced to server time
- Instant UI updates on TODO modifications
- Responsive design for mobile and desktop

## Project Structure

```
interview-app/
├── backend/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── .env
│   └── server.js              # Main Express server with Socket.IO
├── frontend/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── .env
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Main component with Socket.IO logic
│       └── App.css            # Styling
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Orchestration for app + MongoDB
└── README.md
```

## Socket.IO Events

### Client → Server
- `load-todos`: Request all TODO items
- `add-todo(text)`: Create a new TODO
- `toggle-todo(id)`: Toggle TODO completion status
- `delete-todo(id)`: Delete a TODO item
- `start-timer(data: {id, duration})`: Start a server-sided timer (default: 60s)
- `stop-timer(id)`: Stop and reset the timer

### Server → Client (Broadcast)
- `todos-list(todos)`: Initial TODO list data
- `todo-added(todo)`: New TODO created
- `todo-updated(todo)`: TODO modified
- `todo-deleted(id)`: TODO removed
- `timer-started({id, endTime})`: Timer started with end timestamp
- `timer-finished(id)`: Timer completed
- `timer-stopped(id)`: Timer manually stopped

## Database Schema

### Todo Collection
```javascript
{
  _id: ObjectId,
  text: String,
  completed: Boolean,
  timerStarted: Boolean,
  timerEndTime: Number | null,  // Unix timestamp in milliseconds
  createdAt: Date
}
```

## Getting Started

### Local Development

1. Install dependencies:
```bash
cd backend && pnpm install
cd ../frontend && pnpm install
```

2. Set up environment variables:
```bash
# backend/.env
PORT=3001
MONGO_URI=mongodb://localhost:27017/todolist
FRONTEND_URL=http://localhost:5173

# frontend/.env
VITE_API_URL=http://localhost:3001
```

3. Start MongoDB:
```bash
# Requires MongoDB installed locally
mongod
```

4. Start backend:
```bash
cd backend
pnpm start
```

5. In another terminal, start frontend:
```bash
cd frontend
pnpm dev
```

Access the app at `http://localhost:5173`

### Docker Deployment

1. Build and start with Docker Compose:
```bash
docker-compose up --build
```

2. Access the app at `http://localhost:3001`

## How Timers Work

1. **Client clicks "Start Timer"** → Sends `start-timer` event with duration
2. **Server receives event** → Creates timer end timestamp, stores in MongoDB, registers timeout
3. **Server broadcasts** → Sends `timer-started` event with end timestamp to all clients
4. **Client receives** → Displays countdown based on server end time (synced across refreshes)
5. **Timer completes** → Server clears timeout, updates MongoDB, broadcasts `timer-finished`
6. **All clients notified** → Timers are removed from all connected clients

**Key Advantage**: Timer persists on server even if client disconnects/refreshes. Reconnecting clients receive the current state and continue the countdown from the correct time.

## Features

- ✅ Add, edit, delete TODO items
- ✅ Check off completed items
- ✅ Start/stop server-sided timers (60 seconds default)
- ✅ Real-time sync across browser tabs/windows
- ✅ Timer state persists on server
- ✅ Responsive UI for mobile and desktop
- ✅ MongoDB persistence
- ✅ Docker containerization

## Notes

- Timers are stored in server memory and MongoDB for persistence
- When server restarts, in-memory timers are lost but can be recovered from MongoDB
- Multiple clients see real-time updates instantly
- Timer countdown syncs to server time to prevent client-side clock drift
