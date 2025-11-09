import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';

interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  timerStarted: boolean;
  timerStartTime: number | null;
  savedTime: number;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('todos-list', (todos: Todo[]) => {
      setTodos(todos);

      // Initialize elapsed times for running timers
      const initialElapsed: { [key: string]: number } = {};
      todos.forEach(todo => {
        if (todo.timerStarted && todo.timerStartTime) {
          initialElapsed[todo._id] = Math.floor((Date.now() - todo.timerStartTime) / 1000);
        }
      });
      setElapsedTimes(initialElapsed);
    });

    newSocket.on('todo-added', (todo: Todo) => {
      setTodos(prev => [...prev, todo]);
    });

    newSocket.on('todo-updated', (updatedTodo: Todo) => {
      setTodos(prev => prev.map(t => t._id === updatedTodo._id ? updatedTodo : t));
    });

    newSocket.on('todo-deleted', (id: string) => {
      setTodos(prev => prev.filter(t => t._id !== id));
      setElapsedTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[id];
        return newTimes;
      });
    });

    newSocket.on('timer-started', (data: { id: string; startTime: number }) => {
      setTodos(prev => prev.map(t =>
        t._id === data.id
          ? { ...t, timerStarted: true, timerStartTime: data.startTime }
          : t
      ));
      setElapsedTimes(prev => ({ ...prev, [data.id]: 0 }));
    });

    newSocket.on('timer-stopped', (data: { id: string; savedTime: number }) => {
      setTodos(prev => prev.map(t =>
        t._id === data.id
          ? { ...t, timerStarted: false, timerStartTime: null, savedTime: data.savedTime }
          : t
      ));
      setElapsedTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[data.id];
        return newTimes;
      });
    });

    newSocket.emit('load-todos');

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Stopwatch counter - increments every second for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimes(prev => {
        const updated = { ...prev };
        todos.forEach(todo => {
          if (todo.timerStarted && todo.timerStartTime) {
            updated[todo._id] = Math.floor((Date.now() - todo.timerStartTime) / 1000);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [todos]);

  const addTodo = () => {
    if (input.trim() && socket) {
      socket.emit('add-todo', input);
      setInput('');
    }
  };

  const toggleTodo = (id: string) => {
    if (socket) {
      socket.emit('toggle-todo', id);
    }
  };

  const deleteTodo = (id: string) => {
    if (socket) {
      socket.emit('delete-todo', id);
    }
  };

  const startTimer = (id: string) => {
    if (socket) {
      // Optimistically update UI immediately
      const startTime = Date.now();
      setTodos(prev => prev.map(t =>
        t._id === id
          ? { ...t, timerStarted: true, timerStartTime: startTime, savedTime: 0 }
          : t
      ));
      setElapsedTimes(prev => ({ ...prev, [id]: 0 }));

      socket.emit('start-timer', id);
    }
  };

  const resumeTimer = (id: string) => {
    if (socket) {
      socket.emit('resume-timer', id);
    }
  };

  const stopTimer = (id: string) => {
    if (socket) {
      socket.emit('stop-timer', id);
    }
  };

  const getTotalTime = (todo: Todo) => {
    if (todo.timerStarted && todo.timerStartTime) {
      const currentElapsed = elapsedTimes[todo._id] || 0;
      return (todo.savedTime || 0) + currentElapsed;
    }
    return todo.savedTime || 0;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <div className="container">
        <h1>TODO List with Stopwatch</h1>

        <div className="input-section">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
          />
          <button onClick={addTodo}>Add</button>
        </div>

        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <div className="todo-content">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo._id)}
                />
                <span>{todo.text}</span>
                <button className="edit-btn" title="Edit todo">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div className="todo-actions">
                {todo.completed ? (
                  <>
                    {todo.savedTime > 0 && (
                      <span className="timer">{formatTime(todo.savedTime)}</span>
                    )}
                  </>
                ) : todo.timerStarted ? (
                  <>
                    <span className="timer">{formatTime(getTotalTime(todo))}</span>
                    <button onClick={() => stopTimer(todo._id)} className="stop-btn">
                      Stop
                    </button>
                  </>
                ) : todo.savedTime > 0 ? (
                  <>
                    <span className="timer">{formatTime(todo.savedTime)}</span>
                    <button onClick={() => resumeTimer(todo._id)} className="resume-btn">
                      Resume
                    </button>
                    <button onClick={() => startTimer(todo._id)} className="timer-btn">
                      Start New
                    </button>
                  </>
                ) : (
                  <button onClick={() => startTimer(todo._id)} className="timer-btn">
                    Start
                  </button>
                )}
                <button onClick={() => deleteTodo(todo._id)} className="delete-btn">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
