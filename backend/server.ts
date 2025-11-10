import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/todolist';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

interface ITodo {
  _id: string;
  text: string;
  completed: boolean;
  timerStarted: boolean;
  timerStartTime: number | null;
  savedTime: number;
  createdAt: Date;
}

const todoSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
  timerStarted: Boolean,
  timerStartTime: Number,
  savedTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Todo = mongoose.model<ITodo>('Todo', todoSchema);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('load-todos', async () => {
    try {
      const todos = await Todo.find();
      socket.emit('todos-list', todos);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  });

  socket.on('add-todo', async (text: string) => {
    try {
      const todo = await Todo.create({ text, completed: false, timerStarted: false });
      socket.emit('todo-added', todo);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  });

  socket.on('toggle-todo', async (id: string) => {
    try {
      const todo = await Todo.findById(id);
      if (todo) {
        if (!todo.completed && todo.timerStarted && todo.timerStartTime) {
          const elapsed = Math.floor((Date.now() - todo.timerStartTime) / 1000);
          todo.savedTime = (todo.savedTime || 0) + elapsed;
          todo.timerStarted = false;
          todo.timerStartTime = null;
        }
        todo.completed = !todo.completed;
        await todo.save();
        socket.emit('todo-updated', todo);
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  });

  socket.on('delete-todo', async (id: string) => {
    try {
      await Todo.findByIdAndDelete(id);
      socket.emit('todo-deleted', id);
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  });

  socket.on('start-timer', async (id: string) => {
    try {
      const todo = await Todo.findById(id);
      if (!todo) return;

      const startTime = Date.now();
      // Reset savedTime when starting new
      await Todo.findByIdAndUpdate(id, {
        timerStarted: true,
        timerStartTime: startTime,
        savedTime: 0
      });
      socket.emit('timer-started', { id, startTime });
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  });

  socket.on('resume-timer', async (id: string) => {
    try {
      const todo = await Todo.findById(id);
      if (!todo) return;

      const startTime = Date.now();
      await Todo.findByIdAndUpdate(id, {
        timerStarted: true,
        timerStartTime: startTime
      });
      socket.emit('timer-started', { id, startTime });
    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  });

  socket.on('stop-timer', async (id: string) => {
    try {
      const todo = await Todo.findById(id);
      if (!todo) return;

      // Save elapsed time when stopping
      if (todo.timerStarted && todo.timerStartTime) {
        const elapsed = Math.floor((Date.now() - todo.timerStartTime) / 1000);
        todo.savedTime = (todo.savedTime || 0) + elapsed;
        todo.timerStarted = false;
        todo.timerStartTime = null;
        await todo.save();
        socket.emit('timer-stopped', { id, savedTime: todo.savedTime });
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
