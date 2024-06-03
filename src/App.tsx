import { useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from '@mui/material';

interface TranslationResponse {
    translatedText: string;
}

const TRANSLATION_URL = 'http://localhost:8000/translate';
const TEST_ARRAY = ['Hola', 'como', 'estas?']

const App = () => {
    const [words, setWords] = useState<string[]>(TEST_ARRAY);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const selectedTextRef = useRef<string>("");

    const output = document.getElementById('output');
    window.scribeApi.onProcessOutput((e: any, message: string) => { 
        addWords(message.split(' '));
    })

    const handleKeyDown = (event: any) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();  // Prevent the default behavior of Ctrl+Z in most browsers
            translateText(selectedTextRef.current);
        }
    };

    const handleSelectionChange = () => {
        const selection = window.getSelection();
        const text = selection.toString();
        selectedTextRef.current = text;
    }

    useEffect(() => {
        document.addEventListener('mouseup', handleSelectionChange);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keyup', handleSelectionChange);
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

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
     
    const translateText = async (text: string) => {
        // TODO add spinner
        try {
            const { data } = await axios.post<TranslationResponse>(TRANSLATION_URL, {
                text: text,
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
            <div className='controls'>
                { isTranscribing ? 
                    <Button onClick={stopTranscription}>Stop</Button> :
                    <Button onClick={startTranscribe}>Transcribe</Button>
                }
            </div>
            <div className='left'>
                {words.map((word, index) => (
                    <div 
                        key={index}
                        className='word'
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