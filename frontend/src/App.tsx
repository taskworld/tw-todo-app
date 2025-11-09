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
