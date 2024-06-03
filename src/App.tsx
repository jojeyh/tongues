import { useState } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from '@mui/material';

interface TranslationResponse {
    translatedText: string;
}

const TRANSLATION_URL = 'http://localhost:8000/translate';

const App = () => {
    const [words, setWords] = useState<string[]>([]);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [longPressWords, setLongPressWords] = useState<string>("");
    const [longPressActive, setLongPressActive] = useState<boolean>(false);

    const output = document.getElementById('output');
    window.scribeApi.onProcessOutput((e: any, message: string) => { 
        addWords(message.split(' '));
    })

    const addWords = (wordsToAdd: string[]) => {
        const removedBlanks = wordsToAdd.filter(word => word !== "");
        setWords([
            ...words,
            ...removedBlanks,
        ]);
    }

    const startTranscribe = (e: any) => {
        if (!isTranscribing) {
            setWords([]);
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

    const beginLongTranslation = (e: any) => {

    }

    return (
        <div className='container'>
            <div className='controls'>
                { isTranscribing ? 
                    <Button onClick={stopTranscription}>Stop</Button> :
                    <Button onClick={startTranscribe}>Transcribe</Button>
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