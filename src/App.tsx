import { useState, useEffect, useRef } from 'react';
import { franc } from 'franc-min';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef(null);
  const [videoMetadataLoaded, setVideoMetadataLoaded] = useState(false);
  const removeAsterisks = (text) => text.replace(/\*\*/g, '');


  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const detectedLanguage = franc(prompt) || 'und';
      console.log(`Idioma detectado: ${detectedLanguage}`);

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, language: detectedLanguage }),
      });

      const data = await response.json();

      if (response.ok) {
        const formattedResponse = removeAsterisks(data.response); // Alternativamente: removeAsterisks(data.response)

        const assistantMessage = { role: 'assistant', content: formattedResponse };
        setMessages((prev) => [...prev, assistantMessage]);
        // Falar a resposta da IA e iniciar o movimento do peixe
        speakResponse(data.response, detectedLanguage);
      } else {
        const errorMessage = { role: 'assistant', content: data.error || 'Erro ao obter resposta da IA.' };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Erro ao conectar ao servidor:', error.message);
      const errorMessage = { role: 'assistant', content: 'Erro ao conectar ao servidor. Tente novamente.' };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setPrompt('');
  };

  const speakResponse = (text, language) => {
    if ('speechSynthesis' in window) {
      const formattedResponse = removeAsterisks(text); // Alternativamente: removeAsterisks(data.response)
      const utterance = new SpeechSynthesisUtterance(formattedResponse);
      const utteranceLang = language === 'por' ? 'pt-BR' : 'en-US';
      utterance.lang = utteranceLang;

      utterance.onstart = () => {
        console.log('Fala iniciada');
        // Usar setTimeout para garantir que a mudança de estado ocorra após a inicialização
        setTimeout(() => setIsSpeaking(true), 100);
      };

      utterance.onend = () => {
        console.log('Fala finalizada');
        setIsSpeaking(false);
      };

      window.speechSynthesis.cancel(); // Certifica que não há outras falas ativas
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const start = 0.7; // Início do trecho do vídeo
    const end = 2;  // Fim do trecho do vídeo

    const loopVideo = () => {
      if (video.currentTime >= end) {
        video.currentTime = start; // Reinicia o trecho
      }
    };

    if (isSpeaking && videoMetadataLoaded) {
      video.currentTime = start;
      video.playbackRate = 1; // Reduz a velocidade do vídeo para 70%
      video.play().catch((error) => console.error('Erro ao iniciar o vídeo:', error));
      video.addEventListener('timeupdate', loopVideo);
    } else {
      video.pause();
      video.currentTime = 0;
      video.removeEventListener('timeupdate', loopVideo);
    }

    return () => {
      video.removeEventListener('timeupdate', loopVideo);
    };
  }, [isSpeaking, videoMetadataLoaded]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="page-container">
      <div className="main-card">
        <div className="image-area">
          <video
            key={isSpeaking ? 'video' : 'image'}
            ref={videoRef}
            src="/videos/fish.mp4"
            className={`fish-video ${isSpeaking ? '' : 'hidden'}`}
            muted
            preload="metadata"
            onLoadedMetadata={() => {
              console.log('Vídeo carregado!');
              setVideoMetadataLoaded(true);
              videoRef.current.currentTime = 0.7; // Começa no ponto 0.7s
            }}
          />
          <img
            key={isSpeaking ? 'image' : 'video'}
            src="/videos/image.png"
            alt="Peixe Falante"
            className={`fish-image ${isSpeaking ? 'hidden' : ''}`}
          />
        </div>

        <div className="chat-container">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </div>

      <div className="prompt-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Insira seu prompt aqui..."
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
}

export default App;
