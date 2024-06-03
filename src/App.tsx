import { useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import { Button, CircularProgress, IconButton } from '@mui/material';
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';

interface TranslationResponse {
    translatedText: string;
}

const TRANSLATION_URL = 'http://localhost:8000/translate';

const App = () => {
    const [words, setWords] = useState<string[]>([]);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const selectedTextRef = useRef<string>("");

    const output = document.getElementById('output');
    window.scribeApi.onProcessOutput((e: any, message: string) => { 
        addWords(message.split(' '));
    })

    const handleKeyDown = (event: any) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();  // Prevent the default behavior of Ctrl+Z in most browsers
            translateSelected(event);
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
        setIsLoading(true);
        try {
            const { data } = await axios.post<TranslationResponse>(TRANSLATION_URL, {
                text: text,
                src_lang: "fr",
                targ_lang: "en",
            });
            setTranslation(data['translatedText']);
        } catch (err) {
            console.error("Error fetching translation: ", err);
        }
        setIsLoading(false);
    }

    const translateSelected = (e: any) => {
        e.preventDefault();
        if (selectedTextRef.current.length) {
            translateText(selectedTextRef.current);
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
                        onClick={() => translateText(word)}
                    >{word}</div>
                ))}
            </div>
            <div className='center'>
                <IconButton onClick={translateSelected}>
                    <ArrowCircleRightIcon fontSize='large' />
                </IconButton>
            </div>
            <div className='right'>
                <div className='translation'>
                    { isLoading ? 
                        <CircularProgress size='large' /> :
                        <div className='translation'>
                            <div style={{paddingBottom: '20px'}}>
                                {selectedTextRef.current}
                            </div>
                            <div>
                                {translation}
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default App;