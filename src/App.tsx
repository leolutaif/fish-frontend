import { useState, useEffect, useRef } from 'react';
import { franc } from 'franc-min';
import { FaTelegramPlane } from "react-icons/fa";
import { CiPill } from "react-icons/ci";
import { FaXTwitter } from "react-icons/fa6";

import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [tokenCA, setTokenCA] = useState('');
  const [pumpLink, setPumpLink] = useState('');
  const videoRef = useRef(null);
  const audioRef = useRef(null); // Referência ao áudio
  const messagesEndRef = useRef(null);
  const [videoMetadataLoaded, setVideoMetadataLoaded] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const removeAsterisks = (text) => text.replace(/\*\*/g, '');

  const initialMessage = "Wassup bro, my name is FUCKING BILLY BASS! Now, what the HELL do you want, dude?";
  useEffect(() => {
    // Fetch data from the API when the component mounts
    fetch('https://apitoreturnca.onrender.com/api/purchaseData', {
      headers: {
        'x-access-key': 'A1qQaAA9kdfnn4Mmn44bpoieIYHKkdghFKUD1978563llakLLLKdfslphgarcorc3haeogmmMNn243wf',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        setTokenName(data.tokenName);
        setTelegramLink(data.telegramLink);
        setTwitterLink(data.twitterLink);
        setTokenCA(data.tokenCA);
        setPumpLink(data.link);
      })
      .catch((error) => console.error('Error fetching data:', error));
  }, []);
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
        speakResponse(data.response, detectedLanguage);
        const formattedResponse = removeAsterisks(data.response);
        const assistantMessage = { role: 'assistant', content: formattedResponse };
        setMessages((prev) => [...prev, assistantMessage]);
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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); // 🔥 Rola automaticamente para o final do chat
    }
  }, [messages]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const start = 0.7;
    const end = 2;

    const loopVideo = () => {
      if (video.currentTime >= end) {
        video.currentTime = start;
      }
    };

    if (isSpeaking && videoMetadataLoaded) {
      video.currentTime = start;
      video.playbackRate = 1;
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

  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        console.log('✅ Vozes carregadas:', voices.map((v) => `${v.name} (${v.lang})`));
      }
    };
  }, []);

  const playAudioAndVideo = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        console.log('🎉 Áudio inicial tocando!');
      }
    } catch (error) {
      console.error('❌ Erro ao tocar o áudio:', error);
    }
  };

  const copyToClipboard = () => {
    const text = `${tokenCA}`;
    navigator.clipboard.writeText(text)
      .then(() => {
      })
      .catch((err) => {
        console.error("Erro ao copiar texto: ", err);
      });
  };

  const speakResponse = (text, language) => {
    if ('speechSynthesis' in window) {
      const formattedResponse = removeAsterisks(text);
      const utterance = new SpeechSynthesisUtterance(formattedResponse);
      let langCode = language === 'por' ? 'pt-BR' : 'en-US';
      utterance.lang = langCode;

      const voices = window.speechSynthesis.getVoices();

      // Busca uma voz masculina para o idioma específico
      let selectedVoice =
        voices.find((voice) => voice.name === 'Google UK English Male') || // Busca a voz "Male"
        voices.find((voice) => voice.lang === langCode && voice.name.includes('Male')) ||
        voices.find((voice) => voice.lang === langCode);

      if (!selectedVoice) {
        console.warn('Nenhuma voz masculina encontrada para o idioma:', langCode);
        selectedVoice = voices.find((voice) => voice.lang === langCode) || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Usando a voz: ${selectedVoice.name} (${selectedVoice.lang})`);
      }

      utterance.onstart = () => {
        setTimeout(() => setIsSpeaking(true), 100);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('speechSynthesis não está disponível neste navegador.');
    }
  };


  // Adiciona o evento de clique global para tocar o áudio e o vídeo
  useEffect(() => {
    const handleClick = () => {
      playAudioAndVideo();
      document.removeEventListener('click', handleClick); // Remove o evento após a primeira execução
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);
  let text = "FaaATGZFZSJWS6MF5jKMhzgecnCuAS7LoVVDNtU7GCJ5"
  const shortText = `${text.slice(0, 3)}...${text.slice(-3)}`; // Formato abreviado
  return (
    <div className="page-container">
      <div className="main-card">
        <div className="ca">
          <button onClick={copyToClipboard}>ca: {shortText}</button>
        </div>
        <h1 className='tokenName'>{tokenName}</h1>
        <div className="frame-container">
          <figure>
            <div className="outerBevel">
              <div className="flatSurface">
                <div className="innerBevel">
                  {isSpeaking ? (
                    <video
                      key="video"
                      ref={videoRef}
                      src="/videos/fish.mp4"
                      className="map"
                      autoPlay
                      loop
                      muted
                      preload="metadata"
                      onLoadedMetadata={() => {
                        setVideoMetadataLoaded(true);
                        videoRef.current.currentTime = 0.7;
                      }}
                    />
                  ) : (
                    <img
                      key="image"
                      src="/videos/image.png"
                      alt="Peixe Falante"
                      className="map"
                    />
                  )}
                </div>
              </div>
            </div>
          </figure>
        </div>

        <div className="chat-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* 🔥 Novo elemento invisível para garantir a rolagem */}
        </div>


        <div className="prompt-area">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask with Billy Bass..."
          />
          <button onClick={handleSend}>Send</button>
        </div>
        <div className="buttons-area">
          <div className="itens">
            <div className="item">
              <a href={telegramLink}><FaTelegramPlane /></a>
            </div>
            <div className="item">
              <a href={pumpLink}><CiPill /></a>
            </div>
            <div className="item">
              <a href={twitterLink}><FaXTwitter /></a>
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src="/videos/BILLYBAS.mp3"
          preload="auto"
          onPlay={() => setIsSpeaking(true)}
          onEnded={() => setIsSpeaking(false)}
        />
      </div>
    </div>
  );
}

export default App;
