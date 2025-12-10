import React, { useState, useEffect } from 'react';
import './App.css';

// API URL
const API_URL = 'http://localhost:8000';

function App() {
  // Состояние
  const [view, setView] = useState('materials'); // materials, chat, test, upload, analytics
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [testData, setTestData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Загрузка материалов при монтировании
  useEffect(() => {
    fetchMaterials();
  }, []);

  // API функции
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/materials/list/demo-course`);
      if (!response.ok) throw new Error('Ошибка загрузки материалов');
      
      const data = await response.json();
      setMaterials(data.materials);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/materials/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки файла');
      
      const data = await response.json();
      console.log('Файл загружен:', data);
      
      // Обновить список материалов
      await fetchMaterials();
      setView('materials');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (question) => {
    if (!selectedMaterial || !question.trim()) return;
    
    try {
      setLoading(true);
      
      // Добавить сообщение пользователя
      const userMessage = { role: 'user', content: question };
      setChatMessages(prev => [...prev, userMessage]);
      
      const response = await fetch(`${API_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          material_id: selectedMaterial.id,
          question: question
        })
      });
      
      if (!response.ok) throw new Error('Ошибка отправки сообщения');
      
      const data = await response.json();
      
      // Добавить ответ AI
      const aiMessage = { role: 'assistant', content: data.answer };
      setChatMessages(prev => [...prev, aiMessage]);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (materialId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/tests/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          material_id: materialId,
          num_questions: 5,
          difficulty: 'medium'
        })
      });
      
      if (!response.ok) throw new Error('Ошибка генерации теста');
      
      const data = await response.json();
      setTestData(data);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setTestResults([]);
      setView('test');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/tests/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question_id: currentQuestionIndex,
          selected_answer: selectedAnswer,
          time_spent: 10
        })
      });
      
      if (!response.ok) throw new Error('Ошибка отправки ответа');
      
      const data = await response.json();
      
      // Сохранить результат
      setTestResults(prev => [...prev, {
        questionIndex: currentQuestionIndex,
        answer: selectedAnswer,
        isCorrect: data.is_correct,
        feedback: data.feedback
      }]);
      
      // Перейти к следующему вопросу или завершить тест
      if (currentQuestionIndex < testData.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        // Тест завершен
        console.log('Тест завершен! Результаты:', testResults);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/analytics/dashboard/demo-course`);
      if (!response.ok) throw new Error('Ошибка загрузки аналитики');
      
      const data = await response.json();
      setAnalytics(data);
      setView('analytics');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Компоненты
  const Header = () => (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <h1 className="app-title">
            <span className="icon">🎓</span>
            AI Tutor Platform
          </h1>
          <div className="header-actions">
            <span className="user-role">Студент</span>
          </div>
        </div>
      </div>
    </header>
  );

  const Navigation = () => (
    <nav className="app-nav">
      <div className="container">
        <div className="nav-content">
          <button
            className={`nav-btn ${view === 'materials' ? 'active' : ''}`}
            onClick={() => setView('materials')}
          >
            📚 Материалы
          </button>
          <button
            className={`nav-btn ${view === 'upload' ? 'active' : ''}`}
            onClick={() => setView('upload')}
          >
            📤 Загрузить
          </button>
          <button
            className={`nav-btn ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
            disabled={!selectedMaterial}
          >
            💬 Чат
          </button>
          <button
            className={`nav-btn ${view === 'test' ? 'active' : ''}`}
            disabled={!selectedMaterial}
          >
            ✅ Тест
          </button>
          <button
            className={`nav-btn ${view === 'analytics' ? 'active' : ''}`}
            onClick={fetchAnalytics}
          >
            📊 Аналитика
          </button>
        </div>
      </div>
    </nav>
  );

  const MaterialsView = () => (
    <div className="view materials-view fade-in">
      <div className="view-header">
        <h2>📚 Учебные материалы</h2>
        <p>Выберите материал для изучения или задайте вопрос</p>
      </div>
      
      {loading && <div className="loading-indicator">Загрузка...</div>}
      {error && <div className="error-message">❌ {error}</div>}
      
      <div className="materials-grid">
        {materials.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>Нет материалов</h3>
            <p>Загрузите первый учебный материал</p>
            <button className="btn btn-primary" onClick={() => setView('upload')}>
              Загрузить файл
            </button>
          </div>
        ) : (
          materials.map(material => (
            <div
              key={material.id}
              className={`material-card ${selectedMaterial?.id === material.id ? 'selected' : ''}`}
              onClick={() => setSelectedMaterial(material)}
            >
              <div className="material-icon">📄</div>
              <div className="material-info">
                <h3 className="material-title">{material.title}</h3>
                <p className="material-meta">
                  {Math.round(material.content_length / 1000)} KB • 
                  {new Date(material.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="material-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTest(material.id);
                  }}
                >
                  Пройти тест
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const ChatView = () => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSendChat(inputValue);
        setInputValue('');
      }
    };

    return (
      <div className="view chat-view fade-in">
        <div className="view-header">
          <h2>💬 Чат с AI</h2>
          <p>Вопросы по материалу: {selectedMaterial?.title}</p>
        </div>
        
        <div className="chat-container">
          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div className="chat-welcome">
                <div className="welcome-icon">🤖</div>
                <h3>Задайте вопрос по материалу</h3>
                <p>Я помогу вам разобраться в теме</p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <p>{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && <div className="loading-message">AI думает...</div>}
          </div>
          
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Введите ваш вопрос..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !inputValue.trim()}>
              Отправить
            </button>
          </form>
        </div>
      </div>
    );
  };

  const TestView = () => {
    if (!testData) return null;
    
    const currentQuestion = testData.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === testData.questions.length - 1;
    
    return (
      <div className="view test-view fade-in">
        <div className="test-header">
          <h2>✅ Тест: {testData.material_title}</h2>
          <div className="test-progress">
            Вопрос {currentQuestionIndex + 1} из {testData.questions.length}
          </div>
        </div>
        
        <div className="test-container">
          <div className="question-card">
            <h3 className="question-text">{currentQuestion.question}</h3>
            
            <div className="options-list">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`option ${selectedAnswer === index ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => setSelectedAnswer(index)}
                  />
                  <span className="option-label">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
            
            <div className="question-actions">
              <button
                className="btn btn-primary"
                onClick={handleAnswerSubmit}
                disabled={selectedAnswer === null || loading}
              >
                {isLastQuestion ? 'Завершить тест' : 'Следующий вопрос'}
              </button>
            </div>
          </div>
          
          {testResults.length > 0 && (
            <div className="test-results">
              <h4>Результаты:</h4>
              {testResults.map((result, index) => (
                <div key={index} className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                  <span className="result-icon">
                    {result.isCorrect ? '✅' : '❌'}
                  </span>
                  <span>Вопрос {result.questionIndex + 1}: {result.feedback}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const UploadView = () => {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    };

    const handleFileSelect = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    };

    return (
      <div className="view upload-view fade-in">
        <div className="view-header">
          <h2>📤 Загрузить материал</h2>
          <p>Поддерживаются PDF и TXT файлы</p>
        </div>
        
        <div className="upload-container">
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <div className="upload-icon">📄</div>
            <h3>Перетащите файл сюда</h3>
            <p>или</p>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Выберите файл
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <p className="upload-hint">
              Поддерживаемые форматы: PDF, TXT (макс. 10MB)
            </p>
          </div>
          
          {loading && (
            <div className="upload-status">
              <div className="loading-indicator">Загрузка файла...</div>
            </div>
          )}
          
          {error && (
            <div className="upload-error">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AnalyticsView = () => (
    <div className="view analytics-view fade-in">
      <div className="view-header">
        <h2>📊 Аналитика</h2>
        <p>Статистика использования платформы</p>
      </div>
      
      {loading && <div className="loading-indicator">Загрузка...</div>}
      {error && <div className="error-message">❌ {error}</div>}
      
      {analytics && (
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{analytics.total_materials}</div>
            <div className="stat-label">Материалов</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-value">{analytics.chat_history_count}</div>
            <div className="stat-label">Сообщений</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{analytics.tests_count}</div>
            <div className="stat-label">Тестов</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-value">{Math.round(analytics.total_content_length / 1000)}</div>
            <div className="stat-label">KB контента</div>
          </div>
        </div>
      )}
    </div>
  );

  // Рендер основного контента
  const renderContent = () => {
    switch (view) {
      case 'materials':
        return <MaterialsView />;
      case 'chat':
        return <ChatView />;
      case 'test':
        return <TestView />;
      case 'upload':
        return <UploadView />;
      case 'analytics':
        return <AnalyticsView />;
      default:
        return <MaterialsView />;
    }
  };

  return (
    <div className="app">
      <Header />
      <Navigation />
      
      <main className="app-main">
        {renderContent()}
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <p>© 2025 AI Tutor Platform - MVP для хакатона</p>
        </div>
      </footer>
    </div>
  );
}

export default App;