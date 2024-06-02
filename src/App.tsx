import { useState } from 'react';
import './App.css';
import axios from 'axios';

interface TranslationResponse {
    translatedText: string;
}

const TRANSLATION_URL = 'http://localhost:8000/translate';

const App = () => {
    const [words, setWords] = useState<string[]>([]);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

    const output = document.getElementById('output');
    window.scribeApi.onProcessOutput((e: any, message: string) => { 
        addWords(message.split(' '));
    })

    const addWords = (wordsToAdd: string[]) => {
        setWords([
            ...words,
            ...wordsToAdd,
        ]);
    }

    const startTranscribe = (e: any) => {
        if (!isTranscribing) {
            setIsTranscribing(true);
            window.scribeApi.startTranscribe();
        }
    }

    const stopTranscription = (e: any) => {
        if (isTranscribing) {
            setIsTranscribing(false);
            window.scribeApi.stopTranscribe();
        }
    }
     
    const translateWord = async (word: string) => {
        try {
            const { data } = await axios.post<TranslationResponse>(TRANSLATION_URL, {
                text: word,   
                src_lang: "es",
                targ_lang: "en",
            });
            setTranslation(data['translatedText']);
        } catch (err) {
            console.error("Error fetching translation: ", err);
        }
    }

    return (
        <div className='container'>
            <div className='header'>
                <div style={{
                    fontSize: 30,
                }}>tongues</div>
            </div>
            <div className='controls'>
                { isTranscribing ? 
                    <button onClick={stopTranscription}>Stop</button> :
                    <button onClick={startTranscribe}>Transcribe</button>
                }
            </div>
            <div className='left'>
                {words.map(word => (
                    <div 
                        className='word'
                        onClick={(e: any) => translateWord(word)}
                    >{word}</div>
                ))}
            </div>
            <div className='right'>
                <div className='translation'>
                    <div className='word'>
                        {translation}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App;