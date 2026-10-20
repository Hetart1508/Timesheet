import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

const languageStorageKey = 'timesheet.dictationLanguage';

const languages = [
  ['en-IN', 'English'],
  ['hi-IN', 'हिन्दी'],
  ['gu-IN', 'ગુજરાતી'],
  ['mr-IN', 'मराठी'],
  ['bn-IN', 'বাংলা'],
  ['ta-IN', 'தமிழ்'],
  ['te-IN', 'తెలుగు'],
  ['kn-IN', 'ಕನ್ನಡ'],
  ['ml-IN', 'മലയാളം'],
  ['pa-IN', 'ਪੰਜਾਬੀ'],
  ['ur-IN', 'اردو'],
];

const getRecognitionConstructor = () => window.SpeechRecognition || window.webkitSpeechRecognition;

const getStoredLanguage = () => {
  try {
    return typeof window.localStorage?.getItem === 'function' ? window.localStorage.getItem(languageStorageKey) : null;
  } catch {
    return null;
  }
};

const storeLanguage = (language) => {
  try {
    if (typeof window.localStorage?.setItem === 'function') window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // Voice typing still works when storage is blocked; the preference simply is not persisted.
  }
};

const appendTranscript = (base, transcript, maxLength) => {
  const cleanBase = base.trimEnd();
  const cleanTranscript = transcript.trim();
  const combined = `${cleanBase}${cleanBase && cleanTranscript ? ' ' : ''}${cleanTranscript}`;
  return typeof maxLength === 'number' ? combined.slice(0, maxLength) : combined;
};

export default function VoiceTextarea({ value = '', onChange, maxLength, ...props }) {
  const recognitionRef = useRef(null);
  const baseValueRef = useRef('');
  const finalTranscriptRef = useRef('');
  const [supported] = useState(() => Boolean(getRecognitionConstructor()));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(() => getStoredLanguage() || 'en-IN');

  const updateValue = (nextValue) => {
    onChange?.({ target: { value: nextValue } });
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || listening) return;

    setError('');
    baseValueRef.current = String(value).trimEnd();
    finalTranscriptRef.current = '';

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) finalTranscriptRef.current += ` ${transcript}`;
        else interimTranscript += ` ${transcript}`;
      }
      updateValue(appendTranscript(baseValueRef.current, `${finalTranscriptRef.current} ${interimTranscript}`, maxLength));
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow microphone access to use voice typing.'
        : 'Voice typing stopped. Please try again.');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError('Voice typing could not start. Please try again.');
    }
  };

  const changeLanguage = (event) => {
    const nextLanguage = event.target.value;
    if (listening) stopListening();
    setLanguage(nextLanguage);
    storeLanguage(nextLanguage);
  };

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return <div className="voice-textarea">
    <textarea {...props} maxLength={maxLength} value={value} onChange={onChange} />
    {supported ? <div className="voice-textarea-footer">
      <select className="voice-language" aria-label="Voice typing language" value={language} onChange={changeLanguage} disabled={listening}>
        {languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
      <button type="button" className={`voice-button${listening ? ' listening' : ''}`} aria-label={listening ? 'Stop voice typing' : 'Start voice typing'} aria-pressed={listening} onClick={listening ? stopListening : startListening}>
        {listening ? <Square size={14} /> : <Mic size={16} />}{listening ? 'Stop' : 'Voice typing'}
      </button>
    </div> : null}
    {error ? <small className="voice-error" role="alert">{error}</small> : null}
    {listening ? <small className="voice-listening" aria-live="polite">Listening… speak in the selected language.</small> : null}
  </div>;
}
