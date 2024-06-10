import { useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import { Button, CircularProgress, IconButton } from '@mui/material';
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import Dropdown from './Dropdown';

interface TranslationResponse {
    translation: string;
}

const TRANSLATION_URL = 'https://api.tongues.media/translate';

const App = () => {
    const [sourceLang, setSourceLang] = useState<string>("Spanish");
    const [targetLang, setTargetLang] = useState<string>("English");
    const [words, setWords] = useState<string[]>([]);
    const [translation, setTranslation] = useState<string>("");
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const selectedTextRef = useRef<string | null>(null);

    useEffect(() => {
        const unlisten = listen('transcription', (event: any) => {
            if (event.payload) {
                const newWords = event.payload.split(' ');
                addWords(newWords);
            }
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const handleKeyDown = (event: any) => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();  // Prevent the default behavior of Ctrl+Z in most browsers
            translateSelected(event);
        }
    };

    const handleSelectionChange = () => {
        const selection  = window.getSelection();
        const text = selection?.toString();
        if (text) {
            selectedTextRef.current = text;
        }
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
        setWords(prevWords => [
            ...prevWords,
            ...removedBlanks,
        ]);
    }

    const startTranscribe = (e: any) => {
        e.preventDefault();
        invoke('start_listening').then(() => console.log('listening...'));
        setIsTranscribing(true);
    }

    const stopTranscription = (e: any) => {
        if (isTranscribing) {
            invoke('stop_listening');
            setIsTranscribing(false);
        }
    }
     
    const translateText = async (text: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post<TranslationResponse>(TRANSLATION_URL, {
                text: text,
                src_lang: "Spanish",
                targ_lang: "English",
            });
            if (response.status == 200) {
                setTranslation(response.data['translation']);
            } else {
                throw new Error("Failed to fetch translation");
            }
        } catch (err) {
            console.error("Error: ", err);
        }
        setIsLoading(false);
    }

    const translateSelected = (e: any) => {
        e.preventDefault();
        if (selectedTextRef.current?.length) {
            translateText(selectedTextRef.current);
        }
    }


    return (
        <div className='container'>
            <div className='controls'>
                <Dropdown language={sourceLang} changeLanguage={setSourceLang} />
                <Dropdown language={targetLang} changeLanguage={setTargetLang} />
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
